import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { BehaviorSubject, Subscription, Subject } from 'rxjs';
import { GeolocationService } from './geolocation.service';
import { ToastController } from '@ionic/angular/standalone';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface AppNotification {
  id: string;
  type: 'action_validation' | 'sos_alert' | 'new_memory' | 'challenge_invite' | 'challenge_invite_sent';
  title: string;
  body: string;
  created_at: string;
  raw_data: any;
  action_id?: string;
  audio_url?: string;
  latitude?: number;
  longitude?: number;
  points?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private pendingCountSubject = new BehaviorSubject<number>(0);
  public pendingCount$ = this.pendingCountSubject.asObservable();

  private notificationClickSubject = new Subject<any>();
  public notificationClick$ = this.notificationClickSubject.asObservable();

  triggerNotificationClick(extra: any) {
    if (extra) {
      this.notificationClickSubject.next(extra);
    }
  }

  private initialized = false;
  private userId: string | null = null;
  private partnerId: string | null = null;
  private partnershipId: string | null = null;
  private channels: any[] = [];

  // Variables para Geofencing
  private geozones: any[] = [];
  private notifiedGeozoneIds = new Set<string>();
  private gpsSubscription: Subscription | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private geolocationService: GeolocationService,
    private toastCtrl: ToastController
  ) {
    this.supabaseSvc.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.userId = null;
        this.partnerId = null;
        this.partnershipId = null;
        this.initialized = false;
        this.cleanupSubscriptions();
        this.notificationsSubject.next([]);
        this.pendingCountSubject.next(0);
        // Invalidar cache de preferences para que la próxima sesión lea datos frescos
        this.supabaseSvc.invalidatePreferencesCache();
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        this.initialized = false;
        await this.init();
      }
    });

    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra;
        if (extra) {
          this.notificationClickSubject.next(extra);
        }
      });
    }
  }

  async init() {
    if (this.initialized) return;
    
    const user = await this.supabaseSvc.getCurrentUser();
    if (!user) return;
    this.userId = user.id;

    const partnership = await this.supabaseSvc.getActivePartnership();
    if (partnership) {
      this.partnershipId = partnership.id;
      this.partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
    } else {
      this.partnershipId = null;
      this.partnerId = null;
    }

    this.initialized = true;
    await this.fetchNotifications();
    this.setupRealtimeSubscriptions();

    // Carga geozonas e inicia chequeo
    await this.reloadGeozones();
    this.startGeofencingCheck();
    this.requestWebNotificationPermission();
  }

  async requestWebNotificationPermission() {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.warn('Error al solicitar permisos de notificación nativos:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('No se pudieron solicitar permisos de notificación en web:', e);
      }
    }
  }

  async reloadGeozones() {
    try {
      this.geozones = await this.supabaseSvc.getGeozones();
    } catch (e) {
      console.warn('Error al cargar geozonas para geofencing:', e);
    }
  }

  startGeofencingCheck() {
    if (this.gpsSubscription) {
      this.gpsSubscription.unsubscribe();
    }

    // Iniciamos el rastreo de geolocalización globalmente para que funcione en background
    this.geolocationService.startTracking().catch((err) => {
      console.warn('Error al iniciar rastreo de GPS en NotificationService:', err);
    });

    this.gpsSubscription = this.geolocationService.position$.subscribe(async (position) => {
      if (!position || !this.geozones || this.geozones.length === 0) return;

      for (const zone of this.geozones) {
        const dist = this.calculateDistance(
          position.latitude,
          position.longitude,
          zone.latitude,
          zone.longitude
        );

        // Pasamos distancia de kilómetros a metros
        const distanceInMeters = dist * 1000;
        const radius = zone.radius || 50; // 50 metros por defecto

        if (distanceInMeters <= radius) {
          if (!this.notifiedGeozoneIds.has(zone.id)) {
            this.notifiedGeozoneIds.add(zone.id);
            await this.triggerGeofenceNotification(zone);
          }
        } else {
          // Si el usuario se aleja, permitimos volver a notificar en el futuro
          if (this.notifiedGeozoneIds.has(zone.id)) {
            this.notifiedGeozoneIds.delete(zone.id);
          }
        }
      }
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async triggerGeofenceNotification(zone: any) {
    const title = '📍 ¡Lugar Especial Cerca! 💖';
    const message = `Estás pasando por: ${zone.name}`;

    // Alerta visual dentro de la aplicación
    const toast = await this.toastCtrl.create({
      message: `${title} - ${message}`,
      duration: 5000,
      color: 'danger',
      position: 'top',
      buttons: [{ text: 'Ok', role: 'cancel' }]
    });
    await toast.present();

    // Notificación del sistema nativa (dispositivo móvil o navegador)
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: message,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default'
            }
          ]
        });
      } catch (e) {
        console.warn('Error al enviar notificación nativa:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message
        });
      } catch (e) {
        console.warn('Error al mostrar notificación de geofencing en web:', e);
      }
    }
  }

  async fetchNotifications() {
    if (!this.userId) return;

    const allNotifications: AppNotification[] = [];

    // 1. Validaciones de acciones pendientes de la pareja
    if (this.partnerId) {
      const { data: pendingLogs, error: logError } = await this.supabaseSvc.supabase
        .from('user_actions_log')
        .select('*')
        .eq('user_id', this.partnerId)
        .eq('status', 'PENDING');

      if (!logError && pendingLogs) {
        const { data: catalog } = await this.supabaseSvc.getFullCatalog();
        const catalogMap = new Map(catalog?.map(c => [c.id, c]) || []);

        for (const log of pendingLogs) {
          const actionDetails = catalogMap.get(log.action_id);
          if (actionDetails?.activity_type === 'CHALLENGE') {
            // Ignorar propuestas de retos en este bloque de validación rápida de acciones de servicio
            continue;
          }
          allNotifications.push({
            id: `action_${log.id}`,
            type: 'action_validation',
            title: 'Validación de acción 💖',
            body: `Tu pareja registró "${actionDetails?.name || 'una acción'}" y está esperando confirmación para sumar +${log.points_earned} Pts.`,
            created_at: log.created_at,
            points: log.points_earned,
            action_id: log.id,
            raw_data: log
          });
        }
      }
    }

    // 2. Alertas SOS de la pareja
    if (this.partnerId) {
      const { data: sosAlerts, error: sosError } = await this.supabaseSvc.supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', this.partnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!sosError && sosAlerts) {
        for (const alert of sosAlerts) {
          allNotifications.push({
            id: `sos_${alert.id}`,
            type: 'sos_alert',
            title: '🚨 ¡ALERTA SOS URGENTE! 🚨',
            body: 'Tu pareja necesita ayuda urgente. Revisa su ubicación.',
            created_at: alert.created_at,
            audio_url: alert.audio_url,
            latitude: alert.latitude,
            longitude: alert.longitude,
            raw_data: alert
          });
        }
      }
    }

    // 3. Nuevos recuerdos
    if (this.partnershipId && this.partnerId) {
      const { data: memories, error: memError } = await this.supabaseSvc.supabase
        .from('memories')
        .select('*')
        .eq('partnership_id', this.partnershipId)
        .eq('user_id', this.partnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!memError && memories) {
        for (const mem of memories) {
          allNotifications.push({
            id: `memory_${mem.id}`,
            type: 'new_memory',
            title: '📸 Nuevo recuerdo',
            body: `Tu pareja subió un nuevo recuerdo en: ${mem.location_name || 'Sin locación'}`,
            created_at: mem.created_at,
            raw_data: mem
          });
        }
      }
    }

    // 4. Retos pendientes (aceptados por mi pareja pero no por mí)
    try {
      const challenges = await this.supabaseSvc.getDisconnectChallenges();
      for (const challenge of challenges) {
        if (challenge.partnerAccepted && !challenge.myAccepted) {
          allNotifications.push({
            id: `challenge_${challenge.id}`,
            type: 'challenge_invite',
            title: '🎯 Reto de desconexión pendiente',
            body: `Tu pareja aceptó "${challenge.title}" y te espera para empezar juntos.`,
            created_at: new Date().toISOString(), // Usamos hora actual
            raw_data: challenge,
            action_id: challenge.logId
          });
        }
        if (challenge.myAccepted && !challenge.partnerAccepted) {
          allNotifications.push({
            id: `challenge_sent_${challenge.id}`,
            type: 'challenge_invite_sent',
            title: '🎯 Reto propuesto (Esperando pareja)',
            body: `Has propuesto el reto "${challenge.title}". Esperando confirmación de tu pareja.`,
            created_at: new Date().toISOString(),
            raw_data: challenge,
            action_id: challenge.logId
          });
        }
      }
    } catch (e) {
      console.warn('Error loading disconnect challenge notifications:', e);
    }

    // Ordenar por fecha de creación descendente
    allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    this.notificationsSubject.next(allNotifications);

    // Calcular notificaciones pendientes según el timestamp de la última revisión
    const lastReviewedStr = localStorage.getItem('last_reviewed_timestamp');
    let pendingDisplay = 0;
    if (lastReviewedStr) {
      const lastReviewedTime = new Date(lastReviewedStr).getTime();
      pendingDisplay = allNotifications.filter(n => new Date(n.created_at).getTime() > lastReviewedTime).length;
    } else {
      pendingDisplay = allNotifications.length;
    }
    this.pendingCountSubject.next(pendingDisplay);
  }

  markAsReviewed() {
    const notifications = this.notificationsSubject.value;
    if (notifications.length > 0) {
      // Usamos el timestamp de la notificación más reciente
      const latestTimestamp = notifications[0].created_at;
      localStorage.setItem('last_reviewed_timestamp', latestTimestamp);
    } else {
      localStorage.setItem('last_reviewed_timestamp', new Date().toISOString());
    }
    this.pendingCountSubject.next(0);
  }

  async showNativeNotification(title: string, message: string, extraData?: any) {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: message,
              id: Math.floor(Math.random() * 100000),
              extra: extraData || {},
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default'
            }
          ]
        });
      } catch (e) {
        console.warn('Error al enviar notificación nativa:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body: message
        });
        n.onclick = () => {
          window.focus();
          if (extraData) {
            this.notificationClickSubject.next(extraData);
          }
        };
      } catch (e) {
        console.warn('Error al mostrar notificación en web:', e);
      }
    }
  }

  setupRealtimeSubscriptions() {
    this.cleanupSubscriptions();

    if (!this.userId) return;

    // Escucha validaciones de acciones de la pareja
    if (this.partnerId) {
      const actionChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-actions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_actions_log', filter: `user_id=eq.${this.partnerId}` },
          (payload: any) => {
            this.fetchNotifications();
            if (payload.eventType === 'INSERT') {
              this.showNativeNotification(
                '💖 Validación de acción',
                'Tu pareja ha registrado una nueva acción que requiere tu confirmación.',
                { type: 'action_validation', logId: payload.new.id, actionName: 'una acción' }
              );
            }
          }
        )
        .subscribe();
      this.channels.push(actionChannel);

      // Escucha alertas SOS
      const sosChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-sos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sos_alerts', filter: `user_id=eq.${this.partnerId}` },
          (payload: any) => {
            this.fetchNotifications();
            if (payload.new) {
              this.showNativeNotification(
                '🚨 ¡ALERTA SOS URGENTE! 🚨',
                'Tu pareja necesita ayuda urgente. Revisa su ubicación inmediatamente.',
                { 
                  type: 'sos_alert', 
                  audioUrl: payload.new.audio_url, 
                  latitude: payload.new.latitude, 
                  longitude: payload.new.longitude,
                  userId: payload.new.user_id
                }
              );
            }
          }
        )
        .subscribe();
      this.channels.push(sosChannel);
    }

    // Escucha nuevos recuerdos
    if (this.partnershipId) {
      const memChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-mem')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'memories', filter: `partnership_id=eq.${this.partnershipId}` },
          (payload: any) => {
            this.fetchNotifications();
            if (payload.new && payload.new.user_id === this.partnerId) {
              this.showNativeNotification(
                '📸 Nuevo recuerdo',
                'Tu pareja ha subido un nuevo recuerdo especial.',
                { type: 'new_memory', memoryId: payload.new.id }
              );
            }
          }
        )
        .subscribe();
      this.channels.push(memChannel);
    }
  }

  async validateAction(logId: string, confirm: boolean) {
    try {
      const { data: log } = await this.supabaseSvc.supabase
        .from('user_actions_log')
        .select('action_id')
        .eq('id', logId)
        .maybeSingle();

      if (log) {
        const { data: catalogItem } = await this.supabaseSvc.supabase
          .from('activity_catalog')
          .select('activity_type')
          .eq('id', log.action_id)
          .maybeSingle();

        if (catalogItem?.activity_type === 'CHALLENGE') {
          let res;
          if (confirm) {
            res = await this.supabaseSvc.acceptProposedChallenge(logId);
          } else {
            res = await this.supabaseSvc.abandonProposedChallenge(logId);
          }
          await this.fetchNotifications();
          return res;
        }
      }
    } catch (e) {
      console.warn('Error intercepting challenge validation:', e);
    }

    const res = await this.supabaseSvc.validateAction(logId, confirm);
    await this.fetchNotifications();
    return res;
  }

  cleanupSubscriptions() {
    this.channels.forEach(ch => this.supabaseSvc.supabase.removeChannel(ch));
    this.channels = [];
    if (this.gpsSubscription) {
      this.gpsSubscription.unsubscribe();
      this.gpsSubscription = null;
    }
  }
}
