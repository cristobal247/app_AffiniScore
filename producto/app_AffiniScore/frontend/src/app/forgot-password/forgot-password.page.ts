import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonButton,
  IonIcon, 
  IonItem, 
  IonInput,
  LoadingController,
  ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, IonItem, IonInput, CommonModule, FormsModule]
})
export class ForgotPasswordPage {
  email: string = '';
  isLoading: boolean = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ chevronBackOutline });
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  async onSubmit() {
    if (!this.email) {
      this.showToast('Por favor, ingresa tu correo electrónico', 'warning');
      return;
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(this.email)) {
      this.showToast('Por favor, ingresa un correo válido', 'warning');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Enviando enlace...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { error } = await this.supabaseSvc.resetPassword(this.email);
      await loading.dismiss();
      this.isLoading = false;

      if (error) {
        this.showToast('No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo.', 'danger');
      } else {
        this.showToast('¡Enlace enviado! Revisa tu correo o carpeta de spam.', 'success');
        this.router.navigateByUrl('/login');
      }
    } catch (err) {
      await loading.dismiss();
      this.isLoading = false;
      this.showToast('Error de conexión al servidor.', 'danger');
    }
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3500,
      position: 'top',
      color
    });
    await toast.present();
  }
}
