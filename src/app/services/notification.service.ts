import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Tipos para Privacy y Notification Settings
 */
export interface PrivacySettings {
  user_id: string;
  profile_visible_to_partner: boolean;
  show_streak: boolean;
  share_activity_status: boolean;
  allow_location_sharing: boolean;
  allow_realtime_tracking: boolean;
  updated_at?: string;
}

export interface NotificationSettings {
  user_id: string;
  push_enabled: boolean;
  daily_reminder: boolean;
  challenge_invites: boolean;
  score_milestones: boolean;
  updated_at?: string;
}

/**
 * NotificationService
 * 
 * Gestiona las configuraciones de privacidad y notificaciones push.
 * 
 * Funcionalidades:
 * - Obtener y actualizar configuraciones de privacidad
 * - Obtener y actualizar configuraciones de notificaciones push
 * - Inicializar FCM (Firebase Cloud Messaging)
 * - Solicitar y guardar device tokens
 * - Enviar notificaciones de prueba
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private supabaseClient: SupabaseClientService) {}

  /**
   * Obtiene las configuraciones de privacidad del usuario actual.
   */
  async getPrivacySettings(): Promise<{ data: PrivacySettings | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: null, error: 'No user' };
    }

    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
  }

  /**
   * Actualiza las configuraciones de privacidad del usuario.
   * Todos los cambios se guardan en Supabase.
   */
  async updatePrivacySettings(settings: Omit<PrivacySettings, 'user_id' | 'updated_at'>): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: user.id,
        profile_visible_to_partner: settings.profile_visible_to_partner,
        show_streak: settings.show_streak,
        share_activity_status: settings.share_activity_status,
        allow_location_sharing: settings.allow_location_sharing,
        allow_realtime_tracking: settings.allow_realtime_tracking,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }

  /**
   * Obtiene las configuraciones de notificaciones del usuario actual.
   */
  async getNotificationSettings(): Promise<{ data: NotificationSettings | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: null, error: 'No user' };
    }

    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
  }

  /**
   * Actualiza las configuraciones de notificaciones del usuario.
   * Se guarda en Supabase y se sincroniza con FCM si está habilitado.
   */
  async updateNotificationSettings(settings: Omit<NotificationSettings, 'user_id' | 'updated_at'>): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const result = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: user.id,
        push_enabled: settings.push_enabled,
        daily_reminder: settings.daily_reminder,
        challenge_invites: settings.challenge_invites,
        score_milestones: settings.score_milestones,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Si push está habilitado, inicializar FCM
    if (settings.push_enabled && !result.error) {
      await this.requestPushPermission();
    }

    return result;
  }

  /**
   * Solicita permiso para enviar notificaciones push.
   * Usa Capacitor para aplicaciones híbridas o Notifications API para web.
   */
  async requestPushPermission(): Promise<boolean> {
    // Para web: usar Notifications API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        console.log('✅ Push notifications already enabled');
        return true;
      }

      if (Notification.permission !== 'denied') {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('✅ Push notifications enabled');
            return true;
          }
        } catch (error) {
          console.error('Error requesting push permission:', error);
        }
      }
    }

    // Para Capacitor (apps móviles)
    // Aquí va la integración con Capacitor FCM
    console.warn('Push notifications not available in this environment');
    return false;
  }

  /**
   * Obtiene y almacena el device token para FCM.
   * Se usa para enviar notificaciones push personalizadas.
   */
  async getFCMToken(): Promise<string | null> {
    // TODO: Implementar integración con Capacitor FCM
    // const { Messaging } = await import('@capacitor-firebase/messaging');
    // const { token } = await Messaging.getToken();
    // await this.saveDeviceToken(token);
    // return token;

    console.warn('FCM token retrieval not yet implemented');
    return null;
  }

  /**
   * Guarda el device token en Supabase para enviar notificaciones.
   */
  async saveDeviceToken(token: string): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('user_device_tokens')
      .upsert({
        user_id: user.id,
        token,
        platform: this.detectPlatform(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });
  }

  /**
   * Envía una notificación de prueba al usuario.
   * Útil para verificar que el sistema funciona.
   */
  async sendTestNotification(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Prueba de Notificación', {
        body: 'Si ves esto, ¡los push notifications están funcionando!',
        icon: '/assets/icon/favicon.png'
      });
    } else {
      console.log('Test notification: Push not enabled or not supported');
    }
  }

  /**
   * Detecta la plataforma actual (web, android, ios).
   */
  private detectPlatform(): string {
    if ((window as any).cordova) {
      if ((window as any).cordova.platformId === 'android') {
        return 'android';
      } else if ((window as any).cordova.platformId === 'ios') {
        return 'ios';
      }
    }
    return 'web';
  }

  /**
   * Escucha mensajes push entrantes en foreground.
   * TODO: Implementar con Capacitor FCM
   */
  setupPushMessageListener(): void {
    // TODO: Implementar listener con Capacitor FCM
    // const { Messaging } = await import('@capacitor-firebase/messaging');
    // Messaging.addListener('messageReceived', (event) => {
    //   console.log('Push received:', event);
    //   // Manejar notificación
    // });
    console.log('Push message listener setup (not yet implemented)');
  }
}
