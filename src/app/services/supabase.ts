import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export interface ChatRoom {
  id: string;
  partnership_id?: string;
  room_type: 'COUPLE' | 'PRIVATE_AI' | 'GROUP_AI';
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id?: string;
  sender_type: 'USER' | 'AI';
  message: string;
  metadata?: any;
  created_at?: string;
}

export interface Activity {
  id: string;
  name: string;
  activity_type: 'ROUTINE' | 'CHALLENGE';
  category: 'ACTO_SERVICIO' | 'RETO_DESCONEXION' | string;
  subcategory?: string;
  default_points: number;
  description?: string;
  isCompleting?: boolean;
}

export interface DisconnectChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  difficulty: 'Bajo' | 'Medio' | 'Alto';
  category: string;
  myAccepted: boolean;
  partnerAccepted: boolean;
  status: 'disponible' | 'pendiente' | 'aceptado';
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Usamos las variables del environment que configuramos
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /* ========================================================================
     1. AUTENTICACIÓN (LOGIN & REGISTER)
     ======================================================================== */

  // Crear cuenta nueva (El Trigger de SQL creará el perfil automáticamente)
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
    });
  }

  // Iniciar sesión
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  // Cerrar sesión
  async signOut() {
    return await this.supabase.auth.signOut();
  }

  // Obtener el usuario que está logueado actualmente
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  // Escuchar cambios de estado de autenticación (login, logout, expiración)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /* ========================================================================
     2. PERFIL Y BALANCE (PARA EL DASHBOARD)
     ======================================================================== */

  // Obtener los datos del perfil (nombre, puntos totales, etc.)
  async getUserProfile() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };

    return await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
  }

  // Subir imagen de avatar al Storage
  async uploadAvatar(file: File) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return { publicUrl };
  }

  // Actualizar la URL del avatar en el perfil
  async updateAvatarUrl(url: string) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('user_profiles')
      .update({ avatar_url: url, updated_at: new Date() })
      .eq('id', user.id);
  }

  /* ========================================================================
     3. CATÁLOGO Y REGISTRO DE ACCIONES
     ======================================================================== */

  // Traer 6 acciones para la vista rápida
  async getCatalog(activityType: 'ROUTINE' | 'CHALLENGE' = 'ROUTINE') {
    return await this.supabase
      .from('activity_catalog')
      .select('*')
      .eq('activity_type', activityType)
      .limit(6)
      .order('default_points', { ascending: false });
  }

  // Traer el catálogo completo para el buscador
  async getFullCatalog(activityType?: 'ROUTINE' | 'CHALLENGE') {
    let query = this.supabase.from('activity_catalog').select('*');
    if (activityType) {
      query = query.eq('activity_type', activityType);
    }
    return query.order('name', { ascending: true });
  }

  // Registrar una acción y sumar puntos
  async saveActionPoint(actionId: string, points: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // 1. Insertamos el log del evento
    const { error: logError } = await this.supabase
      .from('user_actions_log')
      .insert({
        user_id: user.id,
        action_id: actionId,
        points_earned: points
      });

    if (logError) return { error: logError };

    // 2. Actualizamos el total en el perfil del usuario (Incremento)
    // Nota: Lo ideal es que esto se haga vía RPC en Supabase para mayor seguridad,
    // pero para el MVP podemos actualizar el valor directamente si tenemos el total previo.
    const { data: profile } = await this.getUserProfile();
    const newTotal = (profile?.total_points || 0) + points;

    return await this.supabase
      .from('user_profiles')
      .update({ total_points: newTotal, updated_at: new Date() })
      .eq('id', user.id);
  }

  // Restar puntos al canjear una recompensa
  async redeemPoints(cost: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const { data: profile } = await this.getUserProfile();
    const currentPoints = profile?.total_points || 0;

    if (currentPoints < cost) {
      return { error: 'Puntos insuficientes' };
    }

    const newTotal = currentPoints - cost;

    // Actualizamos el perfil
    return await this.supabase
      .from('user_profiles')
      .update({ total_points: newTotal, updated_at: new Date() })
      .eq('id', user.id);
  }

  // Crear una nueva acción en el catálogo
  async createCatalogAction(name: string, category: string, defaultPoints: number, activityType: 'ROUTINE' | 'CHALLENGE' = 'ROUTINE') {
    return await this.supabase
      .from('activity_catalog')
      .insert({
        name,
        category,
        default_points: defaultPoints,
        activity_type: activityType
      })
      .select('*')
      .single();
  }

  /* ========================================================================
     4. CHAT EN TIEMPO REAL
     ======================================================================== */

  // Obtener una sala de chat específica por ID
  async getRoomDetails(roomId: string) {
    return await this.supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
  }

  // Obtener todos los mensajes de una sala (ordenados cronológicamente)
  async getMessagesByRoom(roomId: string) {
    return await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
  }

  // Enviar un nuevo mensaje a una sala
  async sendMessage(roomId: string, message: string, senderType: 'USER' | 'AI' = 'USER', metadata: any = {}) {
    const user = await this.getCurrentUser();
    if (!user && senderType === 'USER') return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: senderType === 'USER' ? user?.id : null,
        sender_type: senderType,
        message: message,
        metadata: metadata
      });
  }

  // Suscribirse a nuevos mensajes en tiempo real
  subscribeToRoomMessages(roomId: string, callback: (payload: any) => void) {
    const channel = this.supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
      
    return channel;
  }

  /* ========================================================================
     5. SOS Y GEOLOCALIZACIÓN
     ======================================================================== */

  // Subir audio al Storage
  async uploadSosAudio(audioBlob: Blob): Promise<{ url: string | null, error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { url: null, error: 'Usuario no autenticado' };

    const fileName = `${user.id}_${new Date().getTime()}.webm`; // o .mp3/.ogg dependiendo del mimeType
    
    const { data, error } = await this.supabase.storage
      .from('sos_audio')
      .upload(fileName, audioBlob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error subiendo audio:', error);
      return { url: null, error };
    }

    // Obtener URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from('sos_audio')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  }

  // Guardar la alerta en la base de datos
  async sendSosAlert(latitude: number, longitude: number, audioUrl: string | null) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('sos_alerts')
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        audio_url: audioUrl
      });
  }

  /* ========================================================================
     6. S7: RETOS DE DESCONEXION (CATALOGO + ACEPTACION CONJUNTA)
     ======================================================================== */

  private readonly baseDisconnectChallenges: DisconnectChallenge[] = [
    {
      id: 'dc1',
      title: 'Cena sin móviles',
      description: 'Dejad los móviles en otra habitación durante toda la cena.',
      points: 150,
      difficulty: 'Medio',
      category: 'Citas',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    },
    {
      id: 'dc2',
      title: 'Tarde de juegos de mesa',
      description: 'Apagad las pantallas y jugad a un juego de mesa durante 2 horas.',
      points: 200,
      difficulty: 'Alto',
      category: 'Hogar',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    },
    {
      id: 'dc3',
      title: 'Paseo de 30 minutos',
      description: 'Dad un paseo juntos sin mirar el móvil.',
      points: 100,
      difficulty: 'Bajo',
      category: 'Bienestar',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    }
  ];

  private async getStorageKey(key: string): Promise<string> {
    const user = await this.getCurrentUser();
    return user ? `${key}_${user.id}` : key;
  }

  private readLocalJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeLocalJson<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getDisconnectChallenges(): Promise<DisconnectChallenge[]> {
    const key = await this.getStorageKey('affiniscore:disconnect-challenges');
    const user = await this.getCurrentUser();

    if (!user) {
      return this.readLocalJson<DisconnectChallenge[]>(key, this.baseDisconnectChallenges);
    }

    const { data, error } = await this.supabase
      .from('user_disconnect_challenges')
      .select('challenge_id, my_accepted, partner_accepted');

    if (error || !data) {
      return this.readLocalJson<DisconnectChallenge[]>(key, this.baseDisconnectChallenges);
    }

    const stateById = new Map<string, { my_accepted: boolean; partner_accepted: boolean }>();
    data.forEach((row: { challenge_id: string; my_accepted: boolean; partner_accepted: boolean }) => {
      stateById.set(row.challenge_id, {
        my_accepted: row.my_accepted,
        partner_accepted: row.partner_accepted,
      });
    });

    const merged: DisconnectChallenge[] = this.baseDisconnectChallenges.map((challenge) => {
      const state = stateById.get(challenge.id);
      if (!state) return challenge;

      const status: DisconnectChallenge['status'] = state.partner_accepted
        ? 'aceptado'
        : state.my_accepted
          ? 'pendiente'
          : 'disponible';

      return {
        ...challenge,
        myAccepted: state.my_accepted,
        partnerAccepted: state.partner_accepted,
        status,
      };
    });

    this.writeLocalJson(key, merged);
    return merged;
  }

  private async saveLocalChallenges(challenges: DisconnectChallenge[]): Promise<void> {
    const key = await this.getStorageKey('affiniscore:disconnect-challenges');
    this.writeLocalJson(key, challenges);
  }

  async acceptDisconnectChallenge(challengeId: string): Promise<DisconnectChallenge[]> {
    const challenges = await this.getDisconnectChallenges();
    const updated: DisconnectChallenge[] = challenges.map((challenge) => {
      if (challenge.id !== challengeId) return challenge;

      const status: DisconnectChallenge['status'] = challenge.partnerAccepted ? 'aceptado' : 'pendiente';

      return {
        ...challenge,
        myAccepted: true,
        status,
      };
    });

    await this.saveLocalChallenges(updated);

    const user = await this.getCurrentUser();
    if (!user) return updated;

    await this.supabase
      .from('user_disconnect_challenges')
      .upsert({
        user_id: user.id,
        challenge_id: challengeId,
        my_accepted: true,
        partner_accepted: updated.find((item) => item.id === challengeId)?.partnerAccepted ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,challenge_id' });

    return updated;
  }

  async confirmJointAcceptance(challengeId: string): Promise<DisconnectChallenge[]> {
    const challenges = await this.getDisconnectChallenges();
    const updated: DisconnectChallenge[] = challenges.map((challenge) => {
      if (challenge.id !== challengeId) return challenge;

      const status: DisconnectChallenge['status'] = 'aceptado';

      return {
        ...challenge,
        myAccepted: true,
        partnerAccepted: true,
        status,
      };
    });

    await this.saveLocalChallenges(updated);

    const user = await this.getCurrentUser();
    if (!user) return updated;

    await this.supabase
      .from('user_disconnect_challenges')
      .upsert({
        user_id: user.id,
        challenge_id: challengeId,
        my_accepted: true,
        partner_accepted: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,challenge_id' });

    return updated;
  }
}