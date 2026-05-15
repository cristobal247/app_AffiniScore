import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router, 
    private supabaseSvc: SupabaseService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.supabaseSvc.onAuthStateChange((event, session) => {
      // Si el evento es un cierre de sesión (manual o por expiración del token)
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }

      // Si hay una sesión activa, registrar el dispositivo para notificaciones
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        this.registerPushNotifications();
      }
    });
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
      if (data && data.type === 'validation_request') {
        this.showValidationAlert(data.log_id, data.action_name);
      }
    });

    // 5. ¿Qué pasa si el usuario toca la notificación desde fuera de la app?
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notificación tocada: ', notification);
      const data = notification.notification.data;
      if (data && data.type === 'validation_request') {
        this.showValidationAlert(data.log_id, data.action_name);
      }
    });
  }

  async showValidationAlert(logId: string, actionName: string) {
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
          }
        },
        {
          text: 'Sí, confirmo',
          handler: () => {
            console.log('Acción confirmada');
            this.supabaseSvc.validateAction(logId, true);
          }
        }
      ]
    });
    await alert.present();
  }
}
