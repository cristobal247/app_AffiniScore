import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { compressImage } from '../utils/image-compress';

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

export interface HistoricMemoryImage {
  id: string;
  image_url: string;
  location_name?: string;
  created_at?: string;
  emotional_score?: number;
  partnership_id?: string;
  user_id?: string;
  file_name?: string;
}

export interface HistoricMemoryRound {
  partnership_id: string;
  round_key: string;
  started_at: string;
  memory: HistoricMemoryImage;
  count: number;
}

export interface CollageMemoryItem {
  id: string;
  image_url: string;
  location_name?: string;
  created_at?: string;
  emotional_score?: number;
  partnership_id?: string;
  user_id?: string;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private supabaseEnabled = false;
  private apiUrl: string;
  public pointsUpdated = new BehaviorSubject<void>(undefined);
  // Modo de desarrollo: autentificación simulada cuando environment.devAuth = true
  private _devMode = false;
  private _devUser: any = null;
  private _devSessionToken: string | null = null;

  constructor(private http: HttpClient) {
    const url = environment.supabaseUrl || '';
    const key = environment.supabaseKey || '';
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    const dummyUrl = 'https://example.com';

    const clientUrl = isValidUrl && !url.includes('YOUR_SUPABASE_URL') ? url : dummyUrl;
    const clientKey = key || 'invalid';
    this.supabase = createClient(clientUrl, clientKey);

    if (isValidUrl && key && !url.includes('YOUR_SUPABASE_URL') && !key.includes('YOUR_SUPABASE_ANON_KEY')) {
      this.supabaseEnabled = true;
    } else {
      console.warn('Supabase no está configurado correctamente. El frontend se iniciará en modo sin conexión.', {
        supabaseUrl: url,
        supabaseKey: key ? '***' : '(vacío)'
      });
      this.supabaseEnabled = false;
    }

    // Usamos el environment o un predeterminado de FastAPI local
    this.apiUrl = (environment as any).apiUrl || 'http://localhost:8000';

    // Inicializar modo devAuth solo cuando no hay credenciales válidas de Supabase
    if ((environment as any).devAuth && !this.supabaseEnabled) {
      this._devMode = true;
      this._devUser = {
        id: 'dev-user',
        email: (environment as any).devAuthEmail || 'dev@local',
        user_metadata: { full_name: 'Usuario Dev' }
      };
      this._devSessionToken = 'dev-token';
      console.info('SupabaseService: devAuth activado. Login simulado disponible.');
    }
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
      if (err.status === 0) {
        alert('Error: No se pudo conectar al servidor de Python (http://localhost:8000). Asegúrate de que FastAPI esté corriendo.');
      } else {
        alert('Error al generar código: ' + (err.error?.detail || err.message));
      }
      return { error: err.error?.detail || 'Error al generar código de invitación' };
    }
  }

  // Unirse a la pareja: envía el token
  async getPartnerNameByToken(token: string): Promise<{ name?: string; error?: string }> {
    try {
      const { data: partnership, error: pError } = await this.supabase
        .from('partnerships')
        .select('user1_id')
        .eq('pairing_token', token)
        .eq('status', 'pending')
        .single();

      if (pError || !partnership) return { error: 'Código inválido o ya usado.' };

      const { data: profile } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', partnership.user1_id)
        .single();

      return { name: profile?.full_name || 'Usuario sin nombre' };
    } catch (err: any) {
      return { error: 'Error al buscar la pareja.' };
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

  // Iniciar sesión con Email
  async signIn(email: string, password: string) {
    // Modo de desarrollo: aceptar credenciales del environment o cualquier credencial si devAuth activa
    if (this._devMode) {
      const devEmail = (environment as any).devAuthEmail;
      const devPass = (environment as any).devAuthPassword;
      if (!devEmail || !devPass || email === devEmail) {
        // Simulamos sesión
        this._devUser = {
          id: this._devUser?.id || 'dev-user',
          email,
          user_metadata: { full_name: 'Usuario Dev' }
        };
        this._devSessionToken = 'dev-token';
        return {
          data: {
            user: this._devUser,
            session: { access_token: this._devSessionToken }
          },
          error: null
        } as any;
      }

      return { data: null, error: { message: 'Credenciales dev no válidas' } } as any;
    }

    if (!this.supabaseEnabled) {
      return {
        data: null,
        error: {
          message: 'Supabase no está configurado. Revisa src/environments/environment.ts y agrega SUPABASE_URL / SUPABASE_KEY.',
        },
      } as any;
    }

    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  // Iniciar sesión con Redes Sociales (Google, Apple, Facebook)
  async signInWithProvider(provider: 'google' | 'apple' | 'facebook') {
    if (!this.supabaseEnabled) {
      return {
        data: null,
        error: {
          message: 'Supabase no está configurado. Revisa src/environments/environment.ts y agrega SUPABASE_URL / SUPABASE_KEY.',
        },
      } as any;
    }

    const origin = window.location.origin;
    return await this.supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${origin}/tabs/dashboard`
      }
    });
  }

  // Restablecer contraseña
  async resetPassword(email: string) {
    const origin = window.location.origin;
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login` // O la URL a donde deba volver para actualizar
    });
  }

  // Actualizar contraseña (usado después de recuperar)
  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({ password: newPassword });
  }

  // Cerrar sesión
  async signOut() {
    if (this._devMode) {
      this._devUser = null;
      this._devSessionToken = null;
      return { data: null, error: null } as any;
    }

    if (!this.supabaseEnabled) {
      return { data: null, error: null } as any;
    }
    return await this.supabase.auth.signOut();
  }

  // Obtener el usuario que está logueado actualmente
  async getCurrentUser() {
    if (this._devMode) {
      return this._devUser;
    }

    if (!this.supabaseEnabled || !this.supabase) {
      return null;
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user;
    } catch (error) {
      console.warn('getCurrentUser falló en modo sin Supabase:', error);
      return null;
    }
  }

  // Escuchar cambios de estado de autenticación (login, logout, expiración)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (this._devMode) {
      // Llamamos inmediatamente con estado simulado
      setTimeout(() => callback('SIGNED_IN', { session: { access_token: this._devSessionToken } }), 10);
      return {
        unsubscribe: () => { /* no-op para dev */ }
      } as any;
    }

    if (!this.supabaseEnabled || !this.supabase) {
      return {
        unsubscribe: () => {
          /* no-op en modo sin Supabase */
        }
      } as any;
    }
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /* ========================================================================
     2. PERFIL Y BALANCE (PARA EL DASHBOARD)
     ======================================================================== */

  // Obtener los datos del perfil (nombre, puntos totales, etc.)
  async getUserProfile() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };
    if (this._devMode) {
      return {
        data: {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Usuario Dev',
          email: user.email,
          points_total: 999,
          partnership_id: null
        },
        error: null
      };
    }

    if (!this.supabaseEnabled || !this.supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      // Inyectamos el partnership_id buscando en la tabla partnerships
      const p = await this.getActivePartnership();
      if (p) {
        data.partnership_id = p.id;
      }
    }

    return { data, error };
  }

  /**
   * Busca una vinculación activa para el usuario actual en la tabla 'partnerships'.
   */
  async getActivePartnership(): Promise<any | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('partnerships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0];
  }

  /**
   * Obtiene el catálogo completo de reflexiones desde la base de datos con un fallback local.
   */
  async getReflectionsCatalog(): Promise<{ phrase: string; author: string }[]> {
    const fallback = [
      {
        phrase: 'El amor no es algo que se encuentra, es algo que se construye día a día con pequeños gestos de gratitud.',
        author: 'Anónimo'
      },
      {
        phrase: 'La comunicación es el puente entre la confusión y la claridad.',
        author: 'Anónimo'
      },
      {
        phrase: 'Un gran matrimonio no es cuando se junta la pareja perfecta, sino cuando una pareja imperfecta aprende a disfrutar de sus diferencias.',
        author: 'Dave Meurer'
      }
    ];

    try {
      if (!this.supabaseEnabled || !this.supabase) {
        return fallback;
      }

      const { data, error } = await this.supabase
        .from('daily_reflections')
        .select('phrase, author');

      if (error || !data || data.length === 0) {
        console.warn('Error al obtener catálogo o tabla vacía, usando fallback:', error);
        return fallback;
      }

      return data as { phrase: string; author: string }[];
    } catch (e) {
      console.warn('Excepción al obtener catálogo de reflexiones, usando fallback:', e);
      return fallback;
    }
  }

  /**
   * Obtiene la reflexión diaria desde la base de datos de manera determinista
   * basándose en el día del año actual. Posee un fallback local por si falla.
   */
  async getDailyReflection(): Promise<{ phrase: string; author: string }> {
    const data = await this.getReflectionsCatalog();
    
    // Calcular el día del año actual de forma determinista para que ambos partners vean la misma frase
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const index = dayOfYear % data.length;
    return data[index];
  }


  // Obtener puntos obtenidos en la semana actual (Suma los de la pareja si están vinculados)
  async getWeeklyPoints() {
    const user = await this.getCurrentUser();
    if (!user) return { data: 0, error: 'Usuario no autenticado' };

    const { data: profile } = await this.getUserProfile();
    const partnershipId = profile?.partnership_id;

    const startOfWeek = new Date();
    // Lunes como inicio de semana
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    let query = this.supabase
      .from('user_actions_log')
      .select('points_earned')
      .eq('status', 'CONFIRMED')
      .gte('created_at', startOfWeek.toISOString());

    if (partnershipId) {
      // Obtenemos los IDs de la vinculación directamente de la tabla partnerships
      const partnership = await this.getActivePartnership();
      const partnerIds = partnership ? [partnership.user1_id, partnership.user2_id] : [user.id];
      query = query.in('user_id', partnerIds);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching weekly points:', error);
      return { data: 0, error };
    }

    const weeklyTotal = data.reduce((sum: number, log: any) => sum + (log.points_earned || 0), 0);
    return { data: weeklyTotal, error: null };
  }

  // Suscribirse a cambios en tiempo real en los puntos
  async subscribeToPointsRealtime(callback: (payload: any) => void) {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data: profile } = await this.getUserProfile();
    const partnershipId = profile?.partnership_id;

    let filter = `user_id=eq.${user.id}`;
    if (partnershipId) {
      const partnership = await this.getActivePartnership();
      if (partnership) {
        const partnerIds = [partnership.user1_id, partnership.user2_id];
        filter = `user_id=in.(${partnerIds.join(',')})`;
      }
    }

    const channel = this.supabase
      .channel('points-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_actions_log', filter },
        (payload) => {
          this.pointsUpdated.next();
          callback(payload);
        }
      )
      .subscribe();

    return [channel];
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

  /* ========================================================================
     6. GESTIÓN MENSUAL DE AFINIDAD Y RECUERDOS
     ======================================================================== */

  // Actualiza un snapshot del porcentaje actual en el perfil para luego rotarlo al final de mes
  async updateMonthlySnapshot(percentage: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Guardamos el porcentaje actual y la fecha del snapshot
    const now = new Date().toISOString();
    const res = await this.supabase
      .from('profiles')
      .update({ current_month_percentage: percentage, current_month_snapshot_at: now })
      .eq('id', user.id);

    if (!res.error) this.pointsUpdated.next();
    return res;
  }

  // Comprueba si ya cambió el mes y, si es así, rota el registro mensual: guarda el último porcentaje y reinicia el snapshot
  async checkAndRotateMonthlyAffinity() {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const { data: profile } = await this.getUserProfile();
    if (!profile) return { error: 'Perfil no encontrado' };

    const lastRecordedMonth = profile.last_recorded_month; // campo opcional en profiles
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();

    // Si lastRecordedMonth no existe inicializamos
    if (!lastRecordedMonth) {
      await this.supabase
        .from('profiles')
        .update({ last_recorded_month: currentMonth, last_recorded_year: currentYear })
        .eq('id', user.id);
      return { rotated: false };
    }

    // Si ya cambió el mes (diferente al guardado), guardamos el porcentaje anterior en la tabla monthly_affinity
    if (lastRecordedMonth !== currentMonth) {
      const monthToSave = lastRecordedMonth;
      const yearToSave = profile.last_recorded_year || currentYear;
      const percentageToSave = profile.current_month_percentage || 0;

      try {
        // Intentamos insertar en monthly_affinity (si la tabla existe)
        await this.supabase
          .from('monthly_affinity')
          .insert([{
            partnership_id: profile.partnership_id || null,
            user_id: user.id,
            year: yearToSave,
            month: monthToSave,
            percentage: percentageToSave,
            created_at: new Date().toISOString()
          }]);
      } catch (e) {
        console.warn('No se pudo insertar en monthly_affinity (tabla ausente?):', e);
      }

      // Reiniciamos el snapshot y actualizamos el mes grabado
      await this.supabase
        .from('profiles')
        .update({ current_month_percentage: 0, last_recorded_month: currentMonth, last_recorded_year: currentYear })
        .eq('id', user.id);

      this.pointsUpdated.next();
      return { rotated: true };
    }

    return { rotated: false };
  }

  // Recupera los registros de afinidad de un año para la pareja (month 1..12)
  async getYearlyAffinity(partnershipId: string, year: number) {
    return await this.supabase
      .from('monthly_affinity')
      .select('*')
      .eq('partnership_id', partnershipId)
      .eq('year', year)
      .order('month', { ascending: true });
  }

  // Subir una imagen de recuerdo al bucket 'memories' y registrar metadatos en tabla 'memories'
  async uploadMemory(file: File | Blob, filename?: string, metadata?: { location_name?: string | null; created_at?: string | null }) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };
    const partnership = await this.getActivePartnership();

    // Comprimir la imagen antes de subirla (máx. 1080x1080 píxeles, calidad 80%)
    let compressedFile = file;
    try {
      compressedFile = await compressImage(file, 1080, 1080, 0.80);
    } catch (e) {
      console.warn('Fallo al comprimir memoria, usando original:', e);
    }

    const fileExt = (file instanceof File) ? file.name.split('.').pop() : 'jpg';
    const name = filename || `${user.id}_${new Date().getTime()}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('memories')
      .upload(name, compressedFile, { upsert: true });

    if (uploadError) return { error: uploadError.message || uploadError };

    const { data: { publicUrl } } = this.supabase.storage.from('memories').getPublicUrl(name);

    const normalizedCreatedAt = metadata?.created_at
      ? (metadata.created_at.includes('T') ? metadata.created_at : new Date(`${metadata.created_at}T12:00:00`).toISOString())
      : new Date().toISOString();

    // Intentar registrar metadatos por backend para evitar depender de RLS en el cliente.
    try {
      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v1/memories/register`, {
          partnership_id: partnership?.id ?? null,
          file_url: publicUrl,
          file_name: name,
          created_at: normalizedCreatedAt,
          location_name: metadata?.location_name ?? null,
          emotional_score: 1,
        }, { headers })
      );

      if (!response?.success) {
        return { error: response?.detail || 'No se pudo registrar el recuerdo' };
      }
    } catch (e: any) {
      console.warn('No se pudo registrar metadatos del recuerdo por backend, intentando insert cliente:', e);
      // Fallback: intentar insertar desde el cliente autenticado para entornos donde el backend
      // no tenga todavía las variables de entorno (SUPABASE_URL/SUPABASE_KEY).
      try {
        const partnershipId = partnership?.id ?? null;
        const insertPayload: any = {
          partnership_id: partnershipId,
          file_url: publicUrl,
          file_name: name,
          created_at: normalizedCreatedAt,
          location_name: metadata?.location_name ?? null,
          emotional_score: 1,
          user_id: user.id,
        };

        const { data: inserted, error: insertError } = await this.supabase
          .from('memories')
          .insert([insertPayload])
          .select('*')
          .maybeSingle();

        if (insertError) {
          console.warn('Fallback insert client failed:', insertError);
          return { error: insertError.message || insertError };
        }

        return { publicUrl, fileName: name, data: inserted };
      } catch (ie: any) {
        console.warn('Fallback client insert exception:', ie);
        return { error: ie?.message || String(ie) || 'No se pudo registrar el recuerdo' };
      }
    }

    return { publicUrl, fileName: name };
  }

  async updateMemoryMetadata(memoryId: string, updates: { location_name?: string | null; created_at?: string | null }, imageUrl?: string) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const payload: Record<string, any> = {};

    if (updates.location_name !== undefined) {
      payload['location_name'] = updates.location_name;
    }

    if (updates.created_at !== undefined) {
      payload['created_at'] = updates.created_at;
    }

    // First, try to update by id (expected UUID). If that fails (e.g. memoryId is a filename),
    // attempt a fallback update by file_name or by matching file_url.
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .update(payload)
        .eq('id', memoryId)
        .select('*')
        .maybeSingle();

      if (error) {
        const msg = (error && (error.message || error)) as any;
        if (typeof msg === 'string' && msg.toLowerCase().includes('invalid input syntax for type uuid')) {
          // fallthrough to fallback handlers
        } else {
          return { error: msg };
        }
      } else if (data) {
        return { data };
      }
      // if no data and no specific uuid error, fall through to fallback
    } catch (e) {
      // continue to fallback
    }

    // Fallback: try to update by file_name exactly
    try {
      // Try matching by file_name using memoryId or filename extracted from provided imageUrl
      const candidateNames: string[] = [memoryId];
      try {
        if (imageUrl) {
          const parts = imageUrl.split('/');
          const last = parts[parts.length - 1];
          if (last && !candidateNames.includes(last)) candidateNames.push(last);
        }
      } catch (e) {
        // ignore
      }

      for (const name of candidateNames) {
        try {
          const byName = await this.supabase
            .from('memories')
            .update(payload)
            .eq('file_name', name)
            .select('*')
            .maybeSingle();

          if (!byName.error && byName.data) return { data: byName.data };
        } catch (e) {
          // ignore and try next
        }
      }
    } catch (e) {
      // ignore and try url match
    }

    // Final fallback: try to match file_url containing the memoryId (useful when id==filename)
    try {
      const likeMatch = await this.supabase
        .from('memories')
        .update(payload)
        .like('file_url', `%${memoryId}%`)
        .select('*')
        .maybeSingle();

      if (!likeMatch.error && likeMatch.data) return { data: likeMatch.data };
      // If no rows matched, try to create a new metadata row from the storage object
      if (!likeMatch.error && !likeMatch.data) {
        try {
          // If the caller provided the imageUrl (from the UI), try to match storage items by publicUrl
          let storageName: string | null = null;
          let publicUrl: string | null = null;

          if (imageUrl) {
            const { data: storageItems } = await this.listMemoriesPublic();
            if (storageItems && Array.isArray(storageItems)) {
              const found = (storageItems as any[]).find((it: any) => it.publicUrl === imageUrl || (it.publicUrl && imageUrl && it.publicUrl.indexOf(imageUrl) !== -1) || it.name === memoryId || (memoryId && it.name && it.name.indexOf(memoryId) !== -1));
              if (found) {
                storageName = found.name;
                publicUrl = found.publicUrl;
              }
            }
          }

          // If we still don't have a storageName, try direct getPublicUrl (may fail if path differs)
          if (!storageName) {
            try {
              const { data: urlData } = this.supabase.storage.from('memories').getPublicUrl(memoryId);
              publicUrl = urlData?.publicUrl || null;
              storageName = memoryId;
            } catch (e) {
              // ignore
            }
          }

          const partnership = await this.getActivePartnership();

          const insertPayload: any = {
            partnership_id: partnership?.id ?? null,
            file_url: publicUrl,
            file_name: storageName ?? memoryId,
            created_at: payload['created_at'] || new Date().toISOString(),
            location_name: payload['location_name'] ?? null,
            emotional_score: 1
          };

          const inserted = await this.supabase
            .from('memories')
            .insert([insertPayload])
            .select('*')
            .maybeSingle();

          if (!inserted.error && inserted.data) return { data: inserted.data };
          // If insert failed (possibly due to RLS), try upsert using file_name as conflict key
          try {
            const conflictKey = 'file_name';
            const upsertRes = await this.supabase
              .from('memories')
              .upsert([insertPayload], { onConflict: conflictKey })
              .select('*')
              .maybeSingle();

            if (!upsertRes.error && upsertRes.data) return { data: upsertRes.data };
          } catch (e) {
            // ignore
          }
          console.warn('updateMemoryMetadata: insert/upsert no succeeded', { memoryId, imageUrl, inserted });
          return { error: inserted.error ? (inserted.error.message || inserted.error) : 'No se pudo crear el recuerdo en la base de datos' };
        } catch (e) {
          console.warn('updateMemoryMetadata: exception creating row', { memoryId, imageUrl, e });
          return { error: (e as any)?.message || String(e) };
        }
      }
      console.warn('updateMemoryMetadata: no match on like and no storage fallback', { memoryId, imageUrl, likeMatch });
      return { error: likeMatch.error ? (likeMatch.error.message || likeMatch.error) : 'No se encontró el recuerdo a actualizar' };
    } catch (e) {
      console.warn('updateMemoryMetadata: final exception', { memoryId, imageUrl, e });
      return { error: (e as any)?.message || String(e) };
    }
  }

  // Listar imágenes públicas del bucket 'memories' (simple list pública)
  async listMemoriesPublic() {
    try {
      const { data } = await this.supabase.storage.from('memories').list('');
      const urls = (data || []).map((f: any) => {
        const { data: urlData } = this.supabase.storage.from('memories').getPublicUrl(f.name);
        return { name: f.name, publicUrl: urlData.publicUrl };
      });
      return { data: urls };
    } catch (e) {
      return { data: [], error: e };
    }
  }

  async getCollageMemories(partnershipId: string): Promise<{ data: CollageMemoryItem[]; error?: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: [], error: 'Usuario no autenticado' };

    const { data: memoriesData, error } = await this.supabase
      .from('memories')
      .select('*')
      .or(`partnership_id.eq.${partnershipId},user_id.eq.${user.id}`);

    const items: CollageMemoryItem[] = [];

    if (memoriesData) {
      for (const row of memoriesData as any[]) {
        const imageUrl = row.file_url || row.public_url || row.image_url || row.url || '';

        if (!imageUrl) continue;

        items.push({
          id: row.id || imageUrl,
          image_url: imageUrl,
          location_name: row.location_name,
          created_at: row.created_at,
          emotional_score: row.emotional_score,
          partnership_id: row.partnership_id,
          user_id: row.user_id,
          title: row.location_name || 'Recuerdo validado',
        });
      }
    }

    items.sort((left, right) => {
      const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightDate - leftDate;
    });

    return { data: items, error };
  }

  async getPersonalMemories(): Promise<{ data: CollageMemoryItem[]; error?: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { data: [], error: 'Usuario no autenticado' };

    const { data: memoriesData, error } = await this.supabase
      .from('memories')
      .select('*')
      .is('partnership_id', null);

    const items: CollageMemoryItem[] = [];

    if (memoriesData) {
      for (const row of memoriesData as any[]) {
        const imageUrl = row.file_url || row.public_url || row.image_url || row.url || '';
        if (!imageUrl) continue;

        items.push({
          id: row.id || imageUrl,
          image_url: imageUrl,
          location_name: row.location_name,
          created_at: row.created_at,
          emotional_score: row.emotional_score,
          partnership_id: row.partnership_id,
          user_id: row.user_id,
          title: row.location_name || 'Recuerdo',
        });
      }
    }

    // If the table has no usable rows yet, fall back to the storage bucket
    // using the user prefix that uploadMemory() already writes into filenames.
    if (items.length === 0) {
      const { data: storageItems } = await this.listMemoriesPublic();
      const ownItems = (storageItems || [])
        .filter((item: any) => typeof item.name === 'string' && item.name.startsWith(`${user.id}_`))
        .map((item: any) => ({
          id: item.name,
          image_url: item.publicUrl,
          location_name: undefined,
          created_at: undefined,
          emotional_score: undefined,
          partnership_id: undefined,
          user_id: user.id,
          title: 'Recuerdo',
        }));

      if (ownItems.length > 0) {
        items.push(...ownItems);
      } else if (storageItems && storageItems.length > 0) {
        items.push(...(storageItems as any[]).map((item: any) => ({
          id: item.name,
          image_url: item.publicUrl,
          location_name: undefined,
          created_at: undefined,
          emotional_score: undefined,
          partnership_id: undefined,
          user_id: undefined,
          title: 'Recuerdo',
        })));
      }
    }

    items.sort((left, right) => {
      const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightDate - leftDate;
    });

    return { data: items, error };
  }

  async getHistoricMemoryRound(partnershipId: string, roundKey?: string): Promise<{ data?: HistoricMemoryRound; error?: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const { data: session } = await this.supabase.auth.getSession();
    const tokenHeader = session?.session?.access_token || '';

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${tokenHeader}`,
      'Content-Type': 'application/json'
    });

    try {
      const response = await firstValueFrom(
        this.http.post<HistoricMemoryRound>(`${this.apiUrl}/api/v1/memory-games/round`, {
          partnership_id: partnershipId,
          user_id: user.id,
          round_key: roundKey
        }, { headers })
      );

      return { data: response };
    } catch (err: any) {
      return { error: err.error?.detail || err.message || 'No se pudo obtener un recuerdo aleatorio' };
    }
  }

  async completeHistoricMemoryRound(partnershipId: string, memoryId: string): Promise<{ success: boolean; error?: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    try {
      const { data: session } = await this.supabase.auth.getSession();
      const tokenHeader = session?.session?.access_token || '';

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${tokenHeader}`,
        'Content-Type': 'application/json'
      });

      await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/api/v1/memory-games/complete`, {
          partnership_id: partnershipId,
          user_id: user.id,
          memory_id: memoryId
        }, { headers })
      );

      this.pointsUpdated.next();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.error?.detail || err.message || 'No se pudo completar el recuerdo' };
    }
  }

  createHistoricMemoryChannel(partnershipId: string) {
    return this.supabase.channel(`memory-history-${partnershipId}`);
  }

  // Subir imagen de avatar al Storage (bucket 'avatars')
  async uploadAvatar(file: File | Blob) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Comprimir la imagen antes de subirla (máx. 300x300 píxeles, calidad 75%)
    let compressedFile = file;
    try {
      compressedFile = await compressImage(file, 300, 300, 0.75);
    } catch (e) {
      console.warn('Fallo al comprimir avatar, usando original:', e);
    }

    // Si es un Blob, le asignamos una extensión por defecto .jpg
    const fileExt = (file instanceof File) ? file.name.split('.').pop() : 'jpg';
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;
    const filePath = `public/${fileName}`; // Guardar en la carpeta public del bucket

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, compressedFile, {
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
      .eq('id', user.id)
      .select();

    if (res.error) {
      console.error('Error updating avatar in DB:', res.error);
    } else if (!res.data || res.data.length === 0) {
      console.error('Avatar update silently failed! RLS policy or missing row?', res);
      return { error: { message: 'El perfil no se actualizó (RLS o fila faltante).' } };
    }

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

  // Registrar una acción y sumar puntos (Modificado para validación)
  async saveActionPoint(actionId: string, points: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Verificamos si es un acto de servicio
    const { data: catalog } = await this.getFullCatalog();
    const actionDetails = catalog?.find(c => c.id === actionId);
    const isServiceAction = actionDetails?.category === 'ACTO_SERVICIO';
    const initialStatus = isServiceAction ? 'PENDING' : 'CONFIRMED';

    // 1. Insertamos el log del evento con el estado correspondiente
    const { error: logError, data: insertedLog } = await this.supabase
      .from('user_actions_log')
      .insert({
        user_id: user.id,
        action_id: actionId,
        points_earned: points,
        status: initialStatus
      })
      .select()
      .single();

    if (logError) return { error: logError };

    let result: any = { data: insertedLog, error: null };

    // 2. Si no requiere validación, sumamos los puntos inmediatamente
    if (!isServiceAction) {
      const { data: profile } = await this.getUserProfile();
      const newTotal = (profile?.total_points || 0) + points;

      result = await this.supabase
        .from('profiles')
        .update({ total_points: newTotal, updated_at: new Date() })
        .eq('id', user.id);

      this.pointsUpdated.next();
    } else {
      console.log('Acción pendiente. Enviando notificación a pareja...');
      
      const partnership = await this.getActivePartnership();
      if (partnership) {
        // El partnerId es el otro usuario de la vinculación
        const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
        
        if (partnerId) {
          try {
            const { data: session } = await this.supabase.auth.getSession();
            const tokenHeader = session?.session?.access_token || '';

            // Hacemos la llamada a nuestro nuevo endpoint en Python
            await firstValueFrom(
              this.http.post<any>(`${this.apiUrl}/api/v1/notifications/send`, {
                partner_id: partnerId,
                action_name: actionDetails?.name || 'Un acto de servicio',
                log_id: insertedLog.id
              }, { 
                headers: {
                  'Authorization': `Bearer ${tokenHeader}`,
                  'Content-Type': 'application/json'
                } 
              })
            );
            console.log('Notificación enviada exitosamente a la pareja:', partnerId);
          } catch (e) {
            console.error('Error al enviar la notificación push:', e);
          }
        }
      }
    }

    return result;
  }

  // Validar una acción pendiente (aprueba o rechaza)
  async validateAction(logId: string, confirm: boolean) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    const newStatus = confirm ? 'CONFIRMED' : 'REJECTED';

    // 1. Actualizamos el estado de la acción
    const { data: updatedLog, error: updateError } = await this.supabase
      .from('user_actions_log')
      .update({ 
        status: newStatus,
        validated_by: user.id 
      })
      .eq('id', logId)
      .select()
      .single();

    if (updateError) return { error: updateError };

    // 2. Si se confirmó, sumar los puntos al usuario que realizó la acción
    if (confirm && updatedLog) {
      const { data: ownerProfile } = await this.supabase
        .from('profiles')
        .select('total_points')
        .eq('id', updatedLog.user_id)
        .single();
        
      const currentPoints = ownerProfile?.total_points || 0;
      const newTotal = currentPoints + (updatedLog.points_earned || 0);

      await this.supabase
        .from('profiles')
        .update({ total_points: newTotal, updated_at: new Date() })
        .eq('id', updatedLog.user_id);
    }
    
    this.pointsUpdated.next();
    return { success: true };
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
     4. CHAT EN TIEMPO REAL E INTELIGENCIA ARTIFICIAL
     ======================================================================== */

  // Obtener todas las sesiones de IA del usuario actual
  async getAiSessions() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    return await this.supabase
      .from('chat_rooms')
      .select('*')
      .eq('user_id', user.id)
      .eq('room_type', 'PRIVATE_AI')
      .order('created_at', { ascending: false });
  }

  // Crear una nueva sesión de IA
  async createAiSession(title: string = 'Nueva Conversación') {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    return await this.supabase
      .from('chat_rooms')
      .insert({
        user_id: user.id,
        room_type: 'PRIVATE_AI',
        title: title
      })
      .select('*')
      .single();
  }

  // Actualizar el título de una sesión de IA
  async updateSessionTitle(roomId: string, title: string) {
    return await this.supabase
      .from('chat_rooms')
      .update({ title: title })
      .eq('id', roomId);
  }

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

  // Enviar un nuevo mensaje (guardar en la base de datos directamente)
  async sendMessage(canalId: string, message: string, senderType: 'USER' | 'AI' = 'USER', imageUrl?: string) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    try {
      const payload: any = {
        room_id: canalId,
        sender_id: user.id, // Siempre usamos el ID del usuario para evitar conflictos de llave foránea (UUID)
        sender_type: senderType,
        message: message
      };

      if (imageUrl) {
        payload.metadata = { image_url: imageUrl };
      }

      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err: any) {
      console.error('Error al guardar mensaje en Supabase:', err);
      return { data: null, error: err.message };
    }
  }

  // Subir imagen para el chat al Storage
  async uploadChatImage(file: File | Blob): Promise<{ url: string | null, error: any }> {
    const user = await this.getCurrentUser();
    if (!user) return { url: null, error: 'Usuario no autenticado' };

    // Comprimir la imagen antes de subirla (máx. 800x800 píxeles, calidad 75%)
    let compressedFile = file;
    try {
      compressedFile = await compressImage(file, 800, 800, 0.75);
    } catch (e) {
      console.warn('Fallo al comprimir imagen de chat, usando original:', e);
    }

    const fileExt = (file instanceof File) ? file.name.split('.').pop() : 'jpg';
    const fileName = `${user.id}_${new Date().getTime()}.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from('chat_images') // IMPORTANTE: Debes crear un bucket público llamado "chat_images" en Supabase
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error subiendo imagen de chat:', error);
      return { url: null, error };
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from('chat_images')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
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

    const result = await this.supabase
      .from('sos_alerts')
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        audio_url: audioUrl
      });

    if (!result.error) {
      try {
        const { data: userProfile } = await this.getUserProfile();
        if (userProfile && userProfile.partnership_id) {
          const { data: partnership } = await this.supabase
            .from('partnerships')
            .select('*')
            .eq('id', userProfile.partnership_id)
            .single();

          if (partnership) {
            const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
            if (partnerId) {
              const { data: session } = await this.supabase.auth.getSession();
              const tokenHeader = session?.session?.access_token || '';

              await firstValueFrom(
                this.http.post<any>(`${this.apiUrl}/api/v1/notifications/sos`, {
                  partner_id: partnerId,
                  sender_name: userProfile.name || 'Tu pareja'
                }, { 
                  headers: {
                    'Authorization': `Bearer ${tokenHeader}`,
                    'Content-Type': 'application/json'
                  } 
                })
              );
              console.log('Notificación push SOS enviada con éxito');
            }
          }
        }
      } catch (e) {
        console.error('Error enviando notificación push de SOS:', e);
      }
    }

    return result;
  }

  // Suscribirse a alertas SOS en tiempo real
  subscribeToSosAlerts(callback: (payload: any) => void) {
    const channel = this.supabase
      .channel('sos-alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  }

  // Actualizar la ubicación del usuario en tiempo real en la columna JSONB de preferences
  async updateUserLocation(latitude: number, longitude: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    try {
      const { data: profile } = await this.getUserProfile();
      const currentPrefs = profile ? profile['preferences'] || {} : {};
      
      const updatedPrefs = {
        ...currentPrefs,
        location: {
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        }
      };

      return await this.supabase
        .from('profiles')
        .update({ preferences: updatedPrefs })
        .eq('id', user.id);
    } catch (err) {
      console.error('Error al actualizar ubicación en la base de datos:', err);
      return { error: err };
    }
  }

  // Obtener la ubicación del partner de la vinculación activa
  async getPartnerLocation(): Promise<{ id: string, latitude: number, longitude: number, name: string, avatarUrl: string } | null> {
    const partnership = await this.getActivePartnership();
    if (!partnership) return null;

    const user = await this.getCurrentUser();
    if (!user) return null;

    const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
    if (!partnerId) return null;

    const { data: partnerProfile, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url, preferences')
      .eq('id', partnerId)
      .single();

    if (error || !partnerProfile) return null;

    const loc = partnerProfile['preferences']?.location;
    if (!loc || !loc.latitude || !loc.longitude) return null;

    return {
      id: partnerProfile.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: partnerProfile.full_name || 'Tu pareja',
      avatarUrl: partnerProfile.avatar_url || '/assets/images/user.png'
    };
  }

  // Suscribirse a cambios en la ubicación del partner en tiempo real
  subscribeToPartnerLocation(partnerId: string, callback: (location: any) => void) {
    const channel = this.supabase
      .channel(`partner-location:${partnerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${partnerId}` },
        (payload) => {
          const loc = payload.new ? payload.new['preferences']?.location : null;
          if (loc) {
            callback(loc);
          }
        }
      )
      .subscribe();

    return channel;
  }

  // Obtener todos los lugares especiales (geozonas) de la pareja
  async getGeozones(): Promise<any[]> {
    try {
      const partnership = await this.getActivePartnership();
      if (!partnership) return [];

      const { data, error } = await this.supabase
        .from('geozones')
        .select('*')
        .eq('partnership_id', partnership.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al obtener geozonas:', err);
      return [];
    }
  }

  // Crear un lugar especial (geozone)
  async createGeozone(name: string, latitude: number, longitude: number, radius: number = 50): Promise<any> {
    try {
      const partnership = await this.getActivePartnership();
      if (!partnership) throw new Error('No hay vinculación activa');

      const { data, error } = await this.supabase
        .from('geozones')
        .insert({
          partnership_id: partnership.id,
          name,
          latitude,
          longitude,
          radius
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('Error al crear geozona:', err);
      return { data: null, error: err };
    }
  }

  // Eliminar un lugar especial (geozone)
  async deleteGeozone(id: string): Promise<any> {
    try {
      const { error } = await this.supabase
        .from('geozones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error al eliminar geozona:', err);
      return { error: err };
    }
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

    // Buscamos el partnerId directamente en la tabla partnerships
    const partnership = await this.getActivePartnership();
    if (!partnership) return { data: null, error: 'No hay vinculación activa' };

    const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;

    return await this.supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', partnerId)
      .single();
  }

  async requestPoints(partnerId: string, activity: string, points: number) {
    const user = await this.getCurrentUser();
    const currentUserId = user?.id;

    return firstValueFrom(
      this.http.post(`${this.apiUrl}/api/v1/points/request`, {
        sender_id: currentUserId,
        receiver_id: partnerId,
        activity_name: activity,
        points_value: points
      })
    );
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

  /* ========================================================================
     7. LÓGICA DE MENSAJES NO LEÍDOS
     ======================================================================== */

  /**
   * Marca una sala como leída guardando el timestamp actual localmente.
   */
  setLastRead(roomId: string) {
    localStorage.setItem(`last_read_${roomId}`, new Date().toISOString());
  }

  /**
   * Obtiene la fecha de la última vez que se leyó la sala.
   */
  getLastRead(roomId: string): string {
    return localStorage.getItem(`last_read_${roomId}`) || '1970-01-01T00:00:00.000Z';
  }

  /**
   * Cuenta los mensajes nuevos en una sala desde la última vez que se leyó.
   */
  async getUnreadCount(roomId: string): Promise<number> {
    const user = await this.getCurrentUser();
    if (!user) return 0;

    const lastRead = this.getLastRead(roomId);
    
    const { count, error } = await this.supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .gt('created_at', lastRead)
      .neq('sender_id', user.id);

    if (error) {
      console.error('Error contando no leídos:', error);
      return 0;
    }
    return count || 0;
  }
}