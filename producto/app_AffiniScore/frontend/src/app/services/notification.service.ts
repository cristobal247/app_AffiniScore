import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase';
import { BehaviorSubject } from 'rxjs';

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

  private initialized = false;
  private userId: string | null = null;
  private partnerId: string | null = null;
  private partnershipId: string | null = null;
  private channels: any[] = [];

  constructor(private supabaseSvc: SupabaseService) {}

  async init() {
    if (this.initialized) return;
    
    const user = await this.supabaseSvc.getCurrentUser();
    if (!user) return;
    this.userId = user.id;

    const partnership = await this.supabaseSvc.getActivePartnership();
    if (partnership) {
      this.partnershipId = partnership.id;
      this.partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
    }

    this.initialized = true;
    await this.fetchNotifications();
    this.setupRealtimeSubscriptions();
  }

  async fetchNotifications() {
    if (!this.userId) return;

    const allNotifications: AppNotification[] = [];

    // 1. Pending action validations from partner
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

    // 2. SOS Alerts from partner
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

    // 3. New memories
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

    // 4. Pending challenges (accepted by partner, but not by me)
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

    // Sort by created_at desc
    allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    this.notificationsSubject.next(allNotifications);
    this.pendingCountSubject.next(allNotifications.length);
  }

  setupRealtimeSubscriptions() {
    this.cleanupSubscriptions();

    if (!this.userId) return;

    // Listen to partner action validations
    if (this.partnerId) {
      const actionChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-actions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_actions_log', filter: `user_id=eq.${this.partnerId}` },
          () => {
            this.fetchNotifications();
          }
        )
        .subscribe();
      this.channels.push(actionChannel);

      // Listen to SOS alerts
      const sosChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-sos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sos_alerts', filter: `user_id=eq.${this.partnerId}` },
          () => {
            this.fetchNotifications();
          }
        )
        .subscribe();
      this.channels.push(sosChannel);
    }

    // Listen to new memories
    if (this.partnershipId) {
      const memChannel = this.supabaseSvc.supabase
        .channel('realtime-notifications-mem')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'memories', filter: `partnership_id=eq.${this.partnershipId}` },
          () => {
            this.fetchNotifications();
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
  }
}
