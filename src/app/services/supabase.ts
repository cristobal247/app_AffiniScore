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

export interface SharedMemory {
  id: string;
  partnership_id: string;
  image_url: string;
  date: string;
  notes: string | null;
  voice_note_url: string | null;
  created_at: string;
}

export interface BingoCard {
  id: string;
  title: string;
  cells: BingoCellTask[];
  difficulty: 'Bajo' | 'Medio' | 'Alto';
  created_at?: string;
}

export interface BingoCellTask {
  id: string;
  title: string;
  description?: string;
  points: number;
}

export interface BingoProgress {
  id: string;
  partnership_id: string;
  card_id: string;
  completed_cells: string[]; // Array de cell IDs completadas
  points_earned: number;
  created_at?: string;
  updated_at?: string;
}

export interface QualityTimeSession {
  id: string;
  partnership_id: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  bonus_points: number;
  is_active: boolean;
  created_at?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
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

  // Registro con metadatos (full_name, birth_date)
  async signUpWithMetadata(email: string, password: string, metadata: { full_name: string; birth_date: string }) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
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

  // Actualizar datos generales del perfil
  async updateProfile(userId: string, updates: any) {
    return await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);
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

  /* ========================================================================
     7. PRIVACIDAD Y NOTIFICACIONES
     ======================================================================== */

  // Obtener las configuraciones de privacidad del usuario actual
  // Retorna un objeto con las preferencias de privacidad
  async getPrivacySettings() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };

    return await this.supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
  }

  // Actualizar las configuraciones de privacidad del usuario
  // Recibe los toggles de privacidad y los guarda en Supabase
  async updatePrivacySettings(settings: {
    profile_visible_to_partner: boolean;
    show_streak: boolean;
    share_activity_status: boolean;
  }) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: user.id,
        profile_visible_to_partner: settings.profile_visible_to_partner,
        show_streak: settings.show_streak,
        share_activity_status: settings.share_activity_status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  // Obtener las configuraciones de notificaciones del usuario actual
  // Retorna un objeto con las preferencias de notificaciones push
  async getNotificationSettings() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };

    return await this.supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
  }

  // Actualizar las configuraciones de notificaciones del usuario
  // Recibe los toggles de notificaciones y los guarda en Supabase
  async updateNotificationSettings(settings: {
    push_enabled: boolean;
    daily_reminder: boolean;
    challenge_invites: boolean;
    score_milestones: boolean;
  }) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        push_enabled: settings.push_enabled,
        daily_reminder: settings.daily_reminder,
        challenge_invites: settings.challenge_invites,
        score_milestones: settings.score_milestones,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  /* ========================================================================
     8. GALERÍA DE RECUERDOS COMPARTIDOS
     ======================================================================== */

  // Obtener todos los recuerdos compartidos de la pareja
  // Retorna una lista ordenada cronológicamente de las fotos guardadas
  async getSharedMemories() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };

    // Primero obtenemos el partnership_id del usuario
    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { data: [], error: null };
    }

    // Luego obtenemos todos los recuerdos de ese partnership
    return await this.supabase
      .from('shared_memories')
      .select('*')
      .eq('partnership_id', partnership.id)
      .order('date', { ascending: false });
  }

  // Subir una foto de recuerdo al Storage
  // Retorna la URL pública de la imagen
  async uploadMemoryImage(file: File): Promise<{ url: string | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { url: null, error: 'Usuario no autenticado' };

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
    const filePath = `memories/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('shared_memories')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading memory image:', uploadError);
      return { url: null, error: uploadError };
    }

    // Obtener URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from('shared_memories')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  }

  // Guardar un nuevo recuerdo en la base de datos
  // Recibe la URL de la imagen y la fecha
  async saveSharedMemory(imageUrl: string, memoryDate: string) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Obtener el partnership_id del usuario
    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { error: 'No partnership found' };
    }

    // Guardar el recuerdo
    return await this.supabase
      .from('shared_memories')
      .insert({
        partnership_id: partnership.id,
        image_url: imageUrl,
        date: memoryDate,
        created_at: new Date().toISOString(),
      });
  }

  // Subir una nota de voz para un recuerdo
  // Retorna la URL pública del audio
  async uploadMemoryVoiceNote(audioBlob: Blob): Promise<{ url: string | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { url: null, error: 'Usuario no autenticado' };

    const fileName = `${user.id}_${new Date().getTime()}.webm`;
    const filePath = `memory_voice_notes/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('memory_voice_notes')
      .upload(filePath, audioBlob);

    if (uploadError) {
      console.error('Error uploading voice note:', uploadError);
      return { url: null, error: uploadError };
    }

    // Obtener URL pública
    const { data: { publicUrl } } = this.supabase.storage
      .from('memory_voice_notes')
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  }

  // Agregar una nota de texto a un recuerdo existente
  async updateMemoryNotes(memoryId: string, notes: string) {
    return await this.supabase
      .from('shared_memories')
      .update({ notes })
      .eq('id', memoryId);
  }

  // Agregar una nota de voz a un recuerdo existente
  async updateMemoryVoiceNote(memoryId: string, voiceNoteUrl: string) {
    return await this.supabase
      .from('shared_memories')
      .update({ voice_note_url: voiceNoteUrl })
      .eq('id', memoryId);
  }

  /* ========================================================================
     9. MINIJUEGO BINGO DE CONEXIÓN
     ======================================================================== */

  // Obtener un cartón de bingo disponible para la pareja
  // Retorna un cartón con 9 tareas
  async getBingoCard(): Promise<{ data: BingoCard | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    // Para MVP: retornar un cartón hardcodeado
    // En producción, se obtendría de la BD
    const defaultCard: BingoCard = {
      id: 'default-bingo-1',
      title: 'Bingo de Conexión',
      difficulty: 'Medio',
      cells: [
        { id: 'c1', title: 'Besarse', points: 10, description: 'Un beso apasionado' },
        { id: 'c2', title: 'Bailar juntos', points: 15, description: 'Al menos 3 minutos' },
        { id: 'c3', title: 'Reír juntos', points: 10, description: 'Carcajadas genuinas' },
        { id: 'c4', title: 'Abrazo largo', points: 10, description: 'Mínimo 20 segundos' },
        { id: 'c5', title: 'Mirada profunda', points: 15, description: 'Verse a los ojos 1 minuto' },
        { id: 'c6', title: 'Hacer ejercicio', points: 20, description: 'Juntos, 15 minutos' },
        { id: 'c7', title: 'Cocinar juntos', points: 25, description: 'Una comida especial' },
        { id: 'c8', title: 'Salida sorpresa', points: 30, description: 'Planear algo inesperado' },
        { id: 'c9', title: 'Masaje relajante', points: 15, description: 'Mínimo 5 minutos' },
      ]
    };

    return { data: defaultCard, error: null };
  }

  // Obtener el progreso actual del usuario en un cartón de bingo
  // Retorna qué celdas ha completado
  async getBingoProgress(cardId: string): Promise<{ data: BingoProgress | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { data: null, error: 'No partnership found' };
    }

    return await this.supabase
      .from('bingo_progress')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('card_id', cardId)
      .single();
  }

  // Marcar una celda del bingo como completada
  // Guarda el progreso en la BD
  async markBingoCellComplete(cardId: string, cellId: string): Promise<{ error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { error: 'No partnership found' };
    }

    // Obtener progreso actual
    const { data: progress } = await this.supabase
      .from('bingo_progress')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('card_id', cardId)
      .single();

    const completedCells = progress?.completed_cells || [];
    if (!completedCells.includes(cellId)) {
      completedCells.push(cellId);
    }

    // Calcular puntos (1 punto por celda)
    const pointsEarned = completedCells.length * 10;

    // Guardar progreso
    return await this.supabase
      .from('bingo_progress')
      .upsert({
        partnership_id: partnership.id,
        card_id: cardId,
        completed_cells: completedCells,
        points_earned: pointsEarned,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'partnership_id,card_id' });
  }

  // Detectar si hay una línea completa (3 en raya)
  // Retorna verdadero si gana
  checkBingoWin(completedCells: string[]): boolean {
    // Mapeo de índices a posiciones: [0,1,2] [3,4,5] [6,7,8]
    // Líneas ganadoras posibles
    const winningLines = [
      // Horizontales
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      // Verticales
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      // Diagonales
      [0, 4, 8], [2, 4, 6]
    ];

    // Convertir cell IDs a índices
    const cellIndexes: number[] = [];
    completedCells.forEach((cellId, index) => {
      const cellNum = parseInt(cellId.replace('c', '')) - 1;
      cellIndexes.push(cellNum);
    });

    // Verificar si alguna línea ganadora está completa
    return winningLines.some(line =>
      line.every(index => cellIndexes.includes(index))
    );
  }

  /* ========================================================================
     10. GEOFENCING Y MAPBOX - TIEMPO DE CALIDAD
     ======================================================================== */

  // Calcular distancia entre dos puntos usando Fórmula de Haversine
  // Retorna la distancia en metros
  calculateHaversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  // Verificar si ambos usuarios están dentro del rango de geofencing
  // Distancia máxima: 50 metros para activar "Tiempo de Calidad"
  // Retorna { isNear: boolean, distance: number }
  async checkProximity(
    userLat: number, userLon: number,
    partnerLat: number, partnerLon: number
  ): Promise<{ isNear: boolean; distance: number; error: any }> {
    try {
      const distance = this.calculateHaversineDistance(
        userLat, userLon,
        partnerLat, partnerLon
      );

      // Si están a menos de 50 metros, activan Tiempo de Calidad
      const isNear = distance < 50;

      if (isNear) {
        console.log('🎯 Modo Tiempo de Calidad activado - Pareja está cerca');
      }

      return { isNear, distance, error: null };
    } catch (error) {
      console.error('Error checking proximity:', error);
      return { isNear: false, distance: -1, error };
    }
  }

  // Crear una sesión de "Tiempo de Calidad"
  // Se activa cuando la pareja está dentro del rango de geofencing
  async createQualityTimeSession(
    partnership_id: string,
    latitude: number,
    longitude: number,
    bonusPoints: number = 50
  ): Promise<{ data: QualityTimeSession | null; error: any }> {
    return await this.supabase
      .from('quality_time_sessions')
      .insert({
        partnership_id,
        latitude,
        longitude,
        start_time: new Date().toISOString(),
        bonus_points: bonusPoints,
        is_active: true
      })
      .select()
      .single();
  }

  // Finalizar una sesión de Tiempo de Calidad
  // Calcula la duración y actualiza los puntos
  async endQualityTimeSession(
    sessionId: string,
    minutesSpent: number
  ): Promise<{ error: any }> {
    const bonusPoints = Math.floor(minutesSpent / 5) * 10; // 10 pts cada 5 minutos

    return await this.supabase
      .from('quality_time_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_minutes: minutesSpent,
        bonus_points: bonusPoints,
        is_active: false
      })
      .eq('id', sessionId);
  }

  // Obtener la sesión activa de Tiempo de Calidad
  async getActiveQualityTimeSession(): Promise<{ data: QualityTimeSession | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { data: null, error: 'No partnership found' };
    }

    return await this.supabase
      .from('quality_time_sessions')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('is_active', true)
      .single();
  }

  // Guardar una ubicación del usuario (para historial de geofencing)
  async saveUserLocation(
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<{ error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase
      .from('user_locations')
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
      });
  }

  // Obtener la última ubicación registrada del usuario
  async getLastUserLocation(): Promise<{ data: LocationCoordinates | null; error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await this.supabase
      .from('user_locations')
      .select('latitude, longitude, accuracy, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  }
}