import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { AlertController } from '@ionic/angular/standalone';

export const partnerGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabaseSvc = inject(SupabaseService);
  const alertCtrl = inject(AlertController);

  const partnership = await supabaseSvc.getActivePartnership();

  if (partnership) {
    return true;
  } else {
    const alert = await alertCtrl.create({
      header: 'Pareja Requerida ⚠️',
      subHeader: 'Función Bloqueada',
      message: 'Para acceder a esta sección, necesitas tener vinculada una pareja en tu perfil. ¿Quieres ir a vincular a alguien ahora?',
      mode: 'ios',
      buttons: [
        {
          text: 'Quizás más tarde',
          role: 'cancel',
          handler: () => {
            if (state.url !== '/tabs/dashboard' && router.url !== '/tabs/dashboard') {
              router.navigate(['/tabs/dashboard']);
            }
          }
        },
        {
          text: 'Vincular Pareja 🔗',
          handler: () => {
            router.navigate(['/profile']);
          }
        }
      ]
    });
    await alert.present();

    if (state.url !== '/tabs/dashboard' && router.url !== '/tabs/dashboard') {
      router.navigate(['/tabs/dashboard']);
    }

    return false;
  }
};
