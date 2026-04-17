import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export interface PrivacySettings {
  profileVisibleToPartner: boolean;
  showStreak: boolean;
  shareActivityStatus: boolean;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  dailyReminder: boolean;
  challengeInvites: boolean;
  scoreMilestones: boolean;
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
  private readonly defaultPrivacySettings: PrivacySettings = {
    profileVisibleToPartner: true,
    showStreak: true,
    shareActivityStatus: true,
  };
  private readonly defaultNotificationSettings: NotificationSettings = {
    pushEnabled: false,
    dailyReminder: true,
    challengeInvites: true,
    scoreMilestones: true,
  };
  private readonly baseDisconnectChallenges: DisconnectChallenge[] = [
    {
      id: 'dc-01',
      title: 'Cena sin pantallas',
      description: 'Compartan una comida completa dejando el celular fuera de la mesa.',
      points: 80,
      difficulty: 'Bajo',
      category: 'Desconexion',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    },
    {
      id: 'dc-02',
      title: 'Paseo mindful de 30 min',
      description: 'Salgan a caminar 30 minutos sin redes ni notificaciones.',
      points: 120,
      difficulty: 'Medio',
      category: 'Bienestar',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    },
    {
      id: 'dc-03',
      title: 'Noche analogica',
      description: 'Dedicar 2 horas a una actividad offline en pareja.',
      points: 180,
      difficulty: 'Alto',
      category: 'Conexion',
      myAccepted: false,
      partnerAccepted: false,
      status: 'disponible',
    },
  ];

  constructor() {
    // Usamos las variables del environment que configuramos
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  private async getActivePartnershipId(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.id as string;
  }

  private async ensureProfileExists(userId: string, email?: string | null): Promise<void> {
    const { data } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (data) return;

    const fallbackName = (email?.split('@')[0] || 'Usuario').trim();
    await this.supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fallbackName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
  }

  /* ========================================================================
     1. AUTENTICACIÓN (LOGIN & REGISTER)
     ======================================================================== */

  // Crear cuenta nueva (El Trigger de SQL creará el perfil automáticamente)
  async signUp(email: string, password: string) {
    const result = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    // Si la base no tiene trigger de creación de perfil, lo intentamos aquí.
    if (result.data?.user?.id) {
      await this.ensureProfileExists(result.data.user.id, result.data.user.email);
    }

    return result;
  }

  // Reenviar correo de confirmacion de cuenta
  async resendSignupConfirmation(email: string) {
    return await this.supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
  }

  // Iniciar sesión
  async signIn(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.data?.user?.id) {
      await this.ensureProfileExists(result.data.user.id, result.data.user.email);
    }

    return result;
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

  /* ========================================================================
     2. PERFIL Y BALANCE (PARA EL DASHBOARD)
     ======================================================================== */

  // Obtener los datos del perfil (nombre, puntos totales, etc.)
  async getUserProfile() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null, error: 'No user' };

    await this.ensureProfileExists(user.id, user.email);

    // Esquema actual del SQL adjunto: profiles + points_ledger
    const profileRes = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileRes.error && profileRes.data) {
      const ledgerRes = await this.supabase
        .from('points_ledger')
        .select('points')
        .eq('user_id', user.id);

      const totalPoints = (ledgerRes.data || []).reduce((acc: number, row: { points: number }) => {
        return acc + (row.points || 0);
      }, 0);

      return {
        data: {
          ...profileRes.data,
          total_points: totalPoints,
        },
        error: null,
      };
    }

    // Fallback para esquema legado (si existe en algún entorno)
    return await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
  }

  /* ========================================================================
     3. CATÁLOGO Y REGISTRO DE ACCIONES
     ======================================================================== */

  // Traer 6 acciones para la vista rápida
  async getCatalog() {
    const currentSchema = await this.supabase
      .from('acts_of_service_catalog')
      .select('id, name, default_points, category')
      .limit(6)
      .order('default_points', { ascending: false });

    if (!currentSchema.error) {
      return currentSchema;
    }

    // Fallback para esquema legado
    return await this.supabase
      .from('catalog_actions')
      .select('*')
      .limit(6)
      .order('default_points', { ascending: false });
  }

  // Traer el catálogo completo para el buscador
  async getFullCatalog() {
    const currentSchema = await this.supabase
      .from('acts_of_service_catalog')
      .select('id, name, default_points, category')
      .order('name', { ascending: true });

    if (!currentSchema.error) {
      return currentSchema;
    }

    // Fallback para esquema legado
    return await this.supabase
      .from('catalog_actions')
      .select('*')
      .order('name', { ascending: true });
  }

  // Registrar una acción y sumar puntos
  async saveActionPoint(actionId: string | number, points: number) {
    const user = await this.getCurrentUser();
    if (!user) return { error: 'Usuario no autenticado' };

    // Esquema actual del SQL adjunto: points_ledger
    const partnershipId = await this.getActivePartnershipId(user.id);
    const ledgerInsert = await this.supabase
      .from('points_ledger')
      .insert({
        partnership_id: partnershipId,
        user_id: user.id,
        act_id: Number(actionId),
        points,
        ai_validated: false,
      });

    if (!ledgerInsert.error) {
      return { error: null };
    }

    // Fallback para esquema legado
    const { error: logError } = await this.supabase
      .from('user_actions_log')
      .insert({
        user_id: user.id,
        action_id: actionId,
        points_earned: points
      });

    if (logError) return { error: logError };

    const { data: profile } = await this.getUserProfile();
    const newTotal = (profile?.total_points || 0) + points;

    return await this.supabase
      .from('user_profiles')
      .update({ total_points: newTotal, updated_at: new Date() })
      .eq('id', user.id);
  }

  /* ========================================================================
     4. S6: PERFIL + TOGGLES DE PRIVACIDAD
     ======================================================================== */

  private async getStorageKey(prefix: string): Promise<string> {
    const user = await this.getCurrentUser();
    return `${prefix}:${user?.id ?? 'guest'}`;
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

  async getPrivacySettings(): Promise<PrivacySettings> {
    const key = await this.getStorageKey('affiniscore:privacy');
    const local = this.readLocalJson<PrivacySettings>(key, this.defaultPrivacySettings);
    const user = await this.getCurrentUser();
    if (!user) return local;

    const { data, error } = await this.supabase
      .from('user_privacy_settings')
      .select('profile_visible_to_partner, show_streak, share_activity_status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return local;
    }

    const mapped: PrivacySettings = {
      profileVisibleToPartner: data.profile_visible_to_partner,
      showStreak: data.show_streak,
      shareActivityStatus: data.share_activity_status,
    };

    this.writeLocalJson(key, mapped);
    return mapped;
  }

  async savePrivacySettings(settings: PrivacySettings): Promise<void> {
    const key = await this.getStorageKey('affiniscore:privacy');
    this.writeLocalJson(key, settings);

    const user = await this.getCurrentUser();
    if (!user) return;

    await this.supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: user.id,
        profile_visible_to_partner: settings.profileVisibleToPartner,
        show_streak: settings.showStreak,
        share_activity_status: settings.shareActivityStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  /* ========================================================================
     5. S8: SISTEMA DE NOTIFICACIONES PUSH (MVP WEB)
     ======================================================================== */

  async getNotificationSettings(): Promise<NotificationSettings> {
    const key = await this.getStorageKey('affiniscore:notifications');
    const local = this.readLocalJson<NotificationSettings>(key, this.defaultNotificationSettings);
    const user = await this.getCurrentUser();
    if (!user) return local;

    const { data, error } = await this.supabase
      .from('user_notification_settings')
      .select('push_enabled, daily_reminder, challenge_invites, score_milestones')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return local;
    }

    const mapped: NotificationSettings = {
      pushEnabled: data.push_enabled,
      dailyReminder: data.daily_reminder,
      challengeInvites: data.challenge_invites,
      scoreMilestones: data.score_milestones,
    };

    this.writeLocalJson(key, mapped);
    return mapped;
  }

  async saveNotificationSettings(settings: NotificationSettings): Promise<void> {
    const key = await this.getStorageKey('affiniscore:notifications');
    this.writeLocalJson(key, settings);

    const user = await this.getCurrentUser();
    if (!user) return;

    await this.supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        push_enabled: settings.pushEnabled,
        daily_reminder: settings.dailyReminder,
        challenge_invites: settings.challengeInvites,
        score_milestones: settings.scoreMilestones,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  async requestPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    return Notification.requestPermission();
  }

  async sendTestPushNotification(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    new Notification('AffiniScore', {
      body: 'Tus notificaciones estan activas. Vamos por esa racha juntos.',
    });

    return true;
  }

  /* ========================================================================
     6. S7: RETOS DE DESCONEXION (CATALOGO + ACEPTACION CONJUNTA)
     ======================================================================== */

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