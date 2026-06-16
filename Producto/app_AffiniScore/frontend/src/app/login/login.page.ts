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
  IonCheckbox,
  AlertController,
  LoadingController 
} from '@ionic/angular/standalone';

// Iconos y Servicio
import { addIcons } from 'ionicons';
import { heart, eyeOutline, eyeOffOutline, chevronBackOutline, logoFacebook, logoApple } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, 
    IonText, IonCard, IonItem, IonLabel, IonInput, 
    IonButton, IonCheckbox, CommonModule, FormsModule
  ]
})
export class LoginPage implements OnInit {
  // Variables vinculadas al [(ngModel)] del HTML
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    // Registramos los iconos para evitar warnings en consola
    addIcons({ heart, eyeOutline, eyeOffOutline, chevronBackOutline, logoFacebook, logoApple });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  ngOnInit() {
    // Escuchar si venimos de un enlace de recuperación de contraseña
    this.supabaseSvc.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.router.navigateByUrl('/reset-password');
      }
    });
  }

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
        // Mostrar el mensaje real de Supabase (ej. "Email not confirmed")
        let errorMsg = 'Correo o contraseña incorrectos.';
        if (error.message.includes('Email not confirmed')) {
          errorMsg = 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
        } else if (error.message) {
          errorMsg = error.message; // Mostrar el error real temporalmente para debug
        }
        this.showAlert('Error de Acceso', errorMsg);
      } else {
        console.log('Login exitoso:', data);
        
        // 4. Redirección a la pantalla de Home tras éxito
        this.router.navigateByUrl('/tabs/dashboard');
      }
    } catch (err) {
      this.showAlert('Error Crítico', 'No se pudo establecer conexión con el servidor.');
    } finally {
      // Siempre quitamos el cargando al terminar
      loading.dismiss();
    }
  }

  /**
   * Navega a la pantalla de registro
   */
  goToRegister() {
    this.router.navigateByUrl('/register');
  }

  /**
   * Navega a la pantalla principal de bienvenida
   */
  goToWelcome() {
    this.router.navigate(['/welcome']);
  }

  /**
   * Login con Google, Facebook, etc.
   */
  async loginWithProvider(provider: 'google' | 'apple' | 'facebook') {
    const loading = await this.loadingCtrl.create({ message: `Conectando con ${provider}...` });
    await loading.present();

    try {
      const { data, error } = await this.supabaseSvc.signInWithProvider(provider);
      if (error) {
        this.showAlert('Error', `No se pudo iniciar sesión con ${provider}.`);
      }
    } catch (err) {
      this.showAlert('Error', 'Ocurrió un problema de conexión.');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Olvidé mi contraseña - Redirige a la página dedicada
   */
  forgotPassword() {
    this.router.navigateByUrl('/forgot-password');
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