import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private partnerId: string | null = null;
  private partnerName: string = 'Pareja';
  private sosSub: any = null;
  // FIX #6: Guardar referencia para cleanup en ngOnDestroy
  private notificationClickSub: any = null;
  private currentUserId: string | null = null;
  private activeValidationAlerts = new Set<string>();

  constructor(
    private router: Router, 
    private supabaseSvc: SupabaseService,
    private alertCtrl: AlertController,
    private notificationSvc: NotificationService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    try {
      this.initializeApp();
    } catch (err) {
      console.error('[AppComponent] Error crítico en ngOnInit. Redirigiendo a /welcome.', err);
      this.handleStartupError();
    }
  }

  private handleStartupError(): void {
    // Limpiar solo las claves de sesión de Supabase para no perder preferencias del usuario
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignorar errores secundarios */ }

    this.router.navigate(['/welcome']);
  }

  private initializeApp(): void {
    // FIX #6: Guardamos la suscripción para poder destruirla en ngOnDestroy
    this.notificationClickSub = this.notificationSvc.notificationClick$.subscribe(async (extra) => {
      console.log('AppComponent: Notificación local/web tocada:', extra);
      if (!extra) return;

      if (extra.type === 'sos_alert') {
        // Reproducir audio si existe
        if (extra.audioUrl) {
          try {
            let audioSrc = extra.audioUrl;
            if (audioSrc && !audioSrc.startsWith('http') && !audioSrc.startsWith('data:')) {
              audioSrc = 'data:audio/webm;base64,' + audioSrc;
            }
            const audio = new Audio(audioSrc);
            audio.play().catch(err => console.warn('SOS click playback failed:', err));
          } catch (e) {
            console.error('Error reproduciendo audio SOS desde click:', e);
          }
        }

        // Guardar coordenadas de la alerta en la caché temporal del partner
        if (extra.latitude && extra.longitude) {
          localStorage.setItem('partner_last_lat', String(extra.latitude));
          localStorage.setItem('partner_last_lng', String(extra.longitude));
        }

        // Navegar a la pestaña del mapa
        this.router.navigate(['/tabs/mapa']);
      } else if (extra.type === 'action_validation') {
        if (extra.logId) {
          this.showValidationAlert(extra.logId, extra.actionName || 'Acción registrada');
        }
      }
    });

    this.supabaseSvc.onAuthStateChange((event, session) => {
      // Si el evento es un cierre de sesión (manual o por expiración del token)
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
        this.cleanupSosListener();
      }

      // Si hay una sesión activa, registrar el dispositivo para notificaciones y configurar SOS
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const user = session.user;
        if (user) {
          this.currentUserId = user.id;
          this.setupSosListener();
        }
        this.registerPushNotifications();
      }
    });
  }

  ngOnDestroy() {
    this.cleanupSosListener();
    // FIX #6: Destruir suscripción al Subject de notificaciones
    if (this.notificationClickSub) {
      this.notificationClickSub.unsubscribe();
      this.notificationClickSub = null;
    }
  }

  setupSosListener() {
    if (this.sosSub) return;

    this.sosSub = this.supabaseSvc.subscribeToSosAlerts(async (newAlert) => {
      console.log('AppComponent: SOS alert recibida en tiempo real:', newAlert);
      if (newAlert && newAlert.user_id !== this.currentUserId) {
        try {
          const partnerInfo = await this.supabaseSvc.getPartnerLocation();
          if (partnerInfo && newAlert.user_id === partnerInfo.id) {
            this.partnerId = partnerInfo.id;
            this.partnerName = partnerInfo.name;
            this.showSosAlert(newAlert);
          }
        } catch (err) {
          console.error('Error al procesar alerta SOS en tiempo real:', err);
        }
      }
    });
  }

  cleanupSosListener() {
    if (this.sosSub) {
      this.sosSub.unsubscribe();
      this.sosSub = null;
    }
    this.partnerId = null;
    this.partnerName = 'Pareja';
    this.currentUserId = null;
  }

  async registerPushNotifications() {
    // Las notificaciones push de Firebase solo funcionan en el teléfono, no en la web
    if (!Capacitor.isNativePlatform()) {
      return; 
    }

    // 1. Pedir permiso al usuario
    console.log('DEBUG: Revisando permisos de notificación...');
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== 'granted') {
      console.log('DEBUG: Permiso no concedido, solicitando...');
      permStatus = await PushNotifications.requestPermissions();
    }

    console.log('DEBUG: Estado de permisos final:', permStatus.receive);

    if (permStatus.receive !== 'granted') {
      console.warn('DEBUG: El usuario denegó los permisos. No se podrán recibir notificaciones.');
    }

    // Crear canales nativos de alta prioridad
    try {
      await PushNotifications.createChannel({
        id: 'sos-channel',
        name: 'Alertas SOS Urgentes',
        description: 'Canal de alerta de emergencia de tu pareja con sonido prioritario.',
        importance: 5, // 5 = IMPORTANCE_HIGH / MAX
        visibility: 1, // VISIBILITY_PUBLIC
        sound: 'sos_sound',
        vibration: true,
        lights: true,
        lightColor: '#FF0000'
      });

      await PushNotifications.createChannel({
        id: 'chat-channel',
        name: 'Mensajes de Chat',
        description: 'Mensajes directos de pareja y consejos terapéuticos de AffiniCoach IA.',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true
      });

      await PushNotifications.createChannel({
        id: 'gamification-channel',
        name: 'Logros e Interacciones',
        description: 'Notificaciones sobre Bingo, Retos de desconexión y Recuerdos.',
        importance: 4,
        visibility: 1,
        sound: 'default',
        vibration: true
      });
      console.log('Canales nativos de alta prioridad creados.');
    } catch (e) {
      console.warn('Error al crear canales de PushNotifications:', e);
    }

    // Limpiar listeners previos para evitar alertas duplicadas al reconectar o cambiar estado de auth
    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.warn('No se pudieron remover los listeners de PushNotifications:', e);
    }

    // 2. Registrar el dispositivo en Firebase (FCM)
    console.log('DEBUG: Registrando dispositivo en FCM...');
    await PushNotifications.register();

    // 3. Capturar el Token Mágico y guardarlo en Supabase
    PushNotifications.addListener('registration', async (token) => {
      console.log('DEBUG: Token de Firebase obtenido: ', token.value);
      
      const user = await this.supabaseSvc.getCurrentUser();
      if (user) {
        console.log('DEBUG: Guardando token en Supabase para el usuario:', user.id);
        await this.supabaseSvc.updateProfile(user.id, { fcm_token: token.value });
        console.log('DEBUG: Token guardado exitosamente.');
      } else {
        console.warn('DEBUG: No se encontró usuario para asociar el token.');
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error al registrar notificaciones: ', JSON.stringify(error));
    });

    // 4. ¿Qué pasa si llega la notificación mientras la app está abierta?
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notificación recibida: ', notification);
      const data = notification.data;
      if (!data) return;

      // REGLA DE EXCLUSIÓN: ¿Está el usuario ya en la vista del chat correspondiente?
      const isCurrentlyInChatRoom = this.checkIfUserIsActiveInChat(data.room_id, data.type);

      if (isCurrentlyInChatRoom) {
        console.log('Exclusión activa: El usuario está viendo este chat. Omitiendo banner.');
        return;
      }

      if (data.type === 'validation_request') {
        this.showValidationAlert(data.log_id, data.action_name);
      } else if (data.type === 'sos_alert' || data.type === 'chat_message') {
        this.showLocalOverlayBanner(notification);
      }
    });

    // 5. ¿Qué pasa si el usuario toca la notificación desde fuera de la app?
    PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
      console.log('Notificación tocada: ', notificationAction);
      const data = notificationAction.notification.data;
      if (data) {
        if (data.type === 'validation_request') {
          this.showValidationAlert(data.log_id, data.action_name);
        } else if (data.type === 'sos_alert') {
          this.notificationSvc.triggerNotificationClick({
            type: 'sos_alert',
            audioUrl: data.audio_url || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null
          });
        } else if (data.type === 'chat_message') {
          this.notificationSvc.triggerNotificationClick({
            type: 'chat_message',
            room_id: data.room_id
          });
        }
      }
    });
  }

  async showValidationAlert(logId: string, actionName: string) {
    if (this.activeValidationAlerts.has(logId)) {
      console.log('Alerta de validación ya mostrada para logId:', logId);
      return;
    }
    this.activeValidationAlerts.add(logId);

    const alert = await this.alertCtrl.create({
      header: '¡Acción por confirmar!',
      message: `¿Confirmas que tu pareja realizó esta acción: "${actionName}"?`,
      buttons: [
        {
          text: 'No, es falso',
          role: 'cancel',
          handler: () => {
            console.log('Acción denegada');
            this.supabaseSvc.validateAction(logId, false);
            this.activeValidationAlerts.delete(logId);
          }
        },
        {
          text: 'Sí, confirmo',
          handler: () => {
            console.log('Acción confirmada');
            this.supabaseSvc.validateAction(logId, true);
            this.activeValidationAlerts.delete(logId);
          }
        }
      ]
    });
    alert.onDidDismiss().then(() => {
      this.activeValidationAlerts.delete(logId);
    });
    await alert.present();
  }

  async showSosAlert(alertData: any) {
    let audio: HTMLAudioElement | null = null;
    if (alertData.audio_url) {
      try {
        let audioSrc = '';
        if (alertData.audio_url.startsWith('http') || alertData.audio_url.startsWith('data:')) {
          audioSrc = alertData.audio_url;
        } else {
          audioSrc = 'data:audio/webm;base64,' + alertData.audio_url;
        }
        audio = new Audio(audioSrc);
        audio.play().catch(err => console.warn('Auto-play blocked or failed:', err));
      } catch (e) {
        console.error('Error initializing SOS audio:', e);
      }
    }

    const alert = await this.alertCtrl.create({
      header: '🚨 ¡ALERTA SOS URGENTE! 🚨',
      subHeader: `De: ${this.partnerName}`,
      message: `Tu pareja necesita ayuda urgente. Revisa su ubicación inmediatamente.`,
      cssClass: 'custom-alert-sos',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel',
          handler: () => {
            if (audio) {
              audio.pause();
            }
          }
        },
        {
          text: 'Escuchar Audio 🔊',
          handler: () => {
            if (audio) {
              audio.currentTime = 0;
              audio.play().catch(err => console.warn('Playback failed:', err));
            }
            return false; // Keep the dialog open
          }
        },
        {
          text: 'Ver en Mapa 📍',
          handler: () => {
            if (audio) {
              audio.pause();
            }
            this.router.navigate(['/tabs/mapa']);
          }
        }
      ]
    });

    await alert.present();
  }

  private checkIfUserIsActiveInChat(notificationRoomId: string, notificationType: string): boolean {
    const currentUrl = this.router.url;
    if (notificationType === 'chat_message') {
      if (currentUrl.includes('/tabs/group-chat')) {
        return true;
      }
      if (currentUrl.includes('/tabs/chat-partner')) {
        return true;
      }
      if (currentUrl.includes('/tabs/chat') && notificationRoomId) {
        return currentUrl.includes(notificationRoomId);
      }
    }
    return false;
  }

  private async showLocalOverlayBanner(notification: any) {
    const toast = await this.toastCtrl.create({
      header: notification.title || 'Nueva Notificación',
      message: notification.body || '',
      position: 'top',
      duration: 4000,
      color: 'light',
      buttons: [
        {
          text: 'Ver',
          handler: () => {
            const data = notification.data;
            if (data) {
              if (data.type === 'sos_alert') {
                this.notificationSvc.triggerNotificationClick({
                  type: 'sos_alert',
                  audioUrl: data.audio_url || null,
                  latitude: data.latitude || null,
                  longitude: data.longitude || null
                });
              } else if (data.type === 'chat_message') {
                this.notificationSvc.triggerNotificationClick({
                  type: 'chat_message',
                  room_id: data.room_id
                });
              }
            }
          }
        }
      ]
    });
    await toast.present();
  }
}
