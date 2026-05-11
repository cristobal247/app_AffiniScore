import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { firstValueFrom, BehaviorSubject } from 'rxjs';

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
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private apiUrl: string;
  public pointsUpdated = new BehaviorSubject<void>(undefined);

  constructor(private http: HttpClient) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    // Usamos el environment o un predeterminado de FastAPI local
    this.apiUrl = (environment as any).apiUrl || 'http://localhost:8000';
  }

  /* ========================================================================
     0. VINCULACIÓN DE PAREJA (PARTNERSHIPS)
     ======================================================================== */

  // Invitar a la pareja: retorna un token (ej. "A F 4 5 B 2") o string
  async invitePartner(user1_id: string): Promise<{ token?: string; error?: any }> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v1/partnerships/invite`, { user1_id }, { headers })
      );
      
      return { token: response.token || response.invite_token };
    } catch (err: any) {
      console.error('Error in invitePartner:', err);
      return { error: err.error?.detail || 'Error al generar código de invitación' };
    }
  }

  // Unirse a la pareja: envía el token
  async joinPartnership(token: string, user2_id: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      // Se asume que el backend recibe el token limpio (sin espacios) y el user2_id
      const body = { token: token.replace(/\s/g, ''), user2_id };
      
      await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v1/partnerships/join`, body, { headers })
      );
      
      return { success: true };
    } catch (err: any) {
      console.error('Error in joinPartnership:', err);
      return { success: false, error: err.error?.detail || 'Código inválido o caducado' };
    }
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
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
  }

  // Obtener puntos obtenidos en la semana actual
  async getWeeklyPoints() {
    const user = await this.getCurrentUser();
    if (!user) return { data: 0, error: 'Usuario no autenticado' };

    const startOfWeek = new Date();
    // Lunes como inicio de semana
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('user_actions_log')
      .select('points_earned')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek.toISOString());

    if (error) {
      console.error('Error fetching weekly points:', error);
      return { data: 0, error };
    }

    const weeklyTotal = data.reduce((sum: number, log: any) => sum + (log.points_earned || 0), 0);
    return { data: weeklyTotal, error: null };
  }

  // Obtener historial de puntos detallado de la semana actual
  async getWeeklyHistory() {
    const user = await this.getCurrentUser();
    if (!user) return { data: [], error: 'Usuario no autenticado' };

    const startOfWeek = new Date();
    // Lunes como inicio de semana
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: logs, error: logsError } = await this.supabase
      .from('user_actions_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek.toISOString())
      .order('created_at', { ascending: true });

    if (logsError) return { data: [], error: logsError };

    const { data: catalog } = await this.getFullCatalog();
    
    const history = (logs || []).map(log => {
      const act = catalog?.find(c => c.id === log.action_id);
      return {
        ...log,
        action_name: act ? act.name : 'Acción registrada',
        date: new Date(log.created_at)
      };
    });

    return { data: history, error: null };
  }

  // Obtener historial del usuario (últimos 20 registros)
  async getUserHistory() {
    const user = await this.getCurrentUser();
    if (!user) return { data: [], error: 'Usuario no autenticado' };

    const { data: logs, error: logsError } = await this.supabase
      .from('user_actions_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) return { data: [], error: logsError };

    const { data: catalog } = await this.getFullCatalog();
    
    const history = (logs || []).map(log => {
      const act = catalog?.find(c => c.id === log.action_id);
      return {
        ...log,
        action_name: act ? act.name : 'Acción registrada',
        date: new Date(log.created_at).toLocaleDateString()
      };
    });

    return { data: history, error: null };
  }

  // Actualizar datos generales del perfil
  async updateProfile(userId: string, updates: any) {
    const res = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (!res.error) {
      this.pointsUpdated.next();
    }
    return res;
  }

  // Subir imagen de avatar al Storage (bucket 'avatars')
  async uploadAvatar(file: File | Blob) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Si es un Blob, le asignamos una extensión por defecto .jpg
    const fileExt = (file instanceof File) ? file.name.split('.').pop() : 'jpg';
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Guardar en la carpeta public del bucket

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('Error al subir avatar:', uploadError);
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

    const res = await this.supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!res.error) {
      this.pointsUpdated.next();
    }
    return res;
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

    const result = await this.supabase
      .from('profiles')
      .update({ total_points: newTotal, updated_at: new Date() })
      .eq('id', user.id);
      
    // Notificamos a la app que los puntos han cambiado
    this.pointsUpdated.next();
    
    return result;
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
    const result = await this.supabase
      .from('profiles')
      .update({ total_points: newTotal, updated_at: new Date() })
      .eq('id', user.id);
      
    // Notificamos a la app
    this.pointsUpdated.next();
    
    return result;
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

  // Enviar un nuevo mensaje a la API de FastAPI
  async sendMessage(canalId: string, message: string, imageUrl?: string) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const { data: profile } = await this.getUserProfile();
    const emisor = profile?.full_name || user.email?.split('@')[0] || 'Usuario';

    try {
      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      const body = {
        text: message,
        image_url: imageUrl || null
      };

      const endpoint = `${this.apiUrl}/api/chat/${canalId}/${encodeURIComponent(emisor)}`;
      
      const response = await firstValueFrom(
        this.http.post<any>(endpoint, body, { headers })
      );
      
      return { data: response, error: null };
    } catch (err: any) {
      console.error('Error al enviar mensaje vía API:', err);
      return { data: null, error: err.error?.detail || err.message };
    }
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

  // Obtener el perfil de la pareja
  async getPartnerProfile(partnershipId: string) {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    return await this.supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('partnership_id', partnershipId)
      .neq('id', user.id)
      .single();
  }

  // Desvincular pareja
  async unlinkPartner() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return { error: 'Usuario no autenticado' };

      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      const body = { user_id: user.id };
      
      await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v1/partnerships/unlink`, body, { headers })
      );
      
      return { success: true };
    } catch (err: any) {
      console.error('Error in unlinkPartner:', err);
      return { error: err.error?.detail || 'Error al desvincular' };
    }
  }
}