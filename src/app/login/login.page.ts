import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonIcon, 
  IonText, 
  IonCard, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton,
  AlertController,
  LoadingController 
} from '@ionic/angular/standalone';

// Iconos y Servicio
import { addIcons } from 'ionicons';
import { heart, eyeOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, 
    IonText, IonCard, IonItem, IonLabel, IonInput, 
    IonButton, CommonModule, FormsModule
  ]
})
export class LoginPage implements OnInit {
  // Variables vinculadas al [(ngModel)] del HTML
  email: string = '';
  password: string = '';

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    // Registramos los iconos para evitar warnings en consola
    addIcons({ heart, eyeOutline });
  }

  ngOnInit() {}

  /**
   * Intenta iniciar sesión con las credenciales ingresadas
   */
  async onLogin() {
    // 1. Validación de campos
    if (!this.email || !this.password) {
      this.showAlert('Atención', 'Por favor, ingresa tu correo y contraseña.');
      return;
    }

    // 2. Mostrar feedback visual de "Cargando"
    const loading = await this.loadingCtrl.create({
      message: 'Verificando credenciales...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // 3. Llamada al servicio de Supabase
      const { data, error } = await this.supabaseSvc.signIn(this.email, this.password);

      if (error) {
        await this.handleLoginError(error);
      } else {
        console.log('Login exitoso:', data);
        
        // 4. ¡NUEVO! Redirección a la pantalla de Acciones tras éxito
        this.router.navigateByUrl('/actions'); 
      }
    } catch (err) {
      this.showAlert('Error Crítico', 'No se pudo establecer conexión con el servidor.');
    } finally {
      // Siempre quitamos el cargando al terminar
      loading.dismiss();
    }
  }

  private async handleLoginError(error: { code?: string; message?: string }) {
    if (error.code === 'email_not_confirmed') {
      const alert = await this.alertCtrl.create({
        header: 'Confirma tu correo',
        message: 'Tu cuenta existe, pero falta confirmar el correo. Revisa tu bandeja o spam.',
        buttons: [
          {
            text: 'Reenviar correo',
            handler: () => {
              this.resendConfirmationEmail();
            },
          },
          {
            text: 'Entendido',
            role: 'cancel',
          },
        ],
      });
      await alert.present();
      return;
    }

    this.showAlert('Error de Acceso', 'Correo o contraseña incorrectos.');
  }

  private async resendConfirmationEmail() {
    if (!this.email) {
      await this.showAlert('Atencion', 'Ingresa tu correo para reenviar la confirmacion.');
      return;
    }

    const { error } = await this.supabaseSvc.resendSignupConfirmation(this.email);
    if (error) {
      await this.showAlert('No se pudo reenviar', error.message || 'Intenta nuevamente en unos minutos.');
      return;
    }

    await this.showAlert('Correo reenviado', 'Te enviamos un nuevo enlace de confirmacion. Revisa tambien spam.');
  }

  /**
   * Navega a la pantalla de registro
   */
  goToRegister() {
    this.router.navigateByUrl('/register');
  }

  /**
   * Función auxiliar para mostrar mensajes al usuario
   */
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['Entendido']
    });
    await alert.present();
  }
}