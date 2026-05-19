import { Component, OnInit } from '@angular/core';
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
import { chevronBackOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonIcon, IonItem, IonInput, CommonModule, FormsModule]
})
export class ResetPasswordPage implements OnInit {
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ chevronBackOutline, eyeOutline, eyeOffOutline });
  }

  ngOnInit() {
    this.checkSession();
  }

  async checkSession() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (!user) {
      this.showToast('No se detectó una sesión activa para restablecer contraseña. Por favor, solicita un nuevo enlace.', 'danger');
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  async onSubmit() {
    if (!this.password || !this.confirmPassword) {
      this.showToast('Por favor, completa todos los campos.', 'warning');
      return;
    }

    if (this.password.length < 6) {
      this.showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showToast('Las contraseñas no coinciden.', 'warning');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { error } = await this.supabaseSvc.updatePassword(this.password);
      await loading.dismiss();
      this.isLoading = false;

      if (error) {
        this.showToast('Error al actualizar contraseña: ' + error.message, 'danger');
      } else {
        this.showToast('¡Éxito! Tu contraseña ha sido actualizada.', 'success');
        this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
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
