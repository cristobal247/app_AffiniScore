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
  IonBackButton,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';

// Iconos y Servicios
import { addIcons } from 'ionicons';
import { personOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, 
    IonText, IonCard, IonItem, IonLabel, IonInput, 
    IonButton, IonBackButton, CommonModule, FormsModule
  ]
})
export class RegisterPage implements OnInit {
  // Variables vinculadas al [(ngModel)] del HTML
  nombre: string = '';
  email: string = '';
  password: string = '';

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {
    // Registramos los iconos que usamos en el diseño esmerado
    addIcons({ personOutline, mailOutline, lockClosedOutline });
  }

  ngOnInit() {}

  async onRegister() {
    // 1. Validaciones básicas antes de llamar a Supabase
    if (!this.nombre || !this.email || !this.password) {
      this.showAlert('Atención', 'Por favor, completa todos los campos para continuar.');
      return;
    }

    if (this.password.length < 6) {
      this.showAlert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // 2. Mostrar indicador de carga (Loading)
    const loading = await this.loadingCtrl.create({
      message: 'Creando tu cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // 3. Llamada al servicio de Supabase
      const { data, error } = await this.supabaseSvc.signUp(this.email, this.password);

      if (error) {
        this.showAlert('Error', error.message);
      } else {
        // Registro exitoso
        await this.showAlert(
          '¡Bienvenida!', 
          'Tu cuenta ha sido creada. Revisa tu correo para verificarla antes de iniciar sesión.'
        );
        this.router.navigateByUrl('/login');
      }
    } catch (err) {
      this.showAlert('Error Inesperado', 'No pudimos conectar con el servidor.');
    } finally {
      loading.dismiss();
    }
  }

  // Navegación manual al Login
  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  // Función auxiliar para mostrar alertas estéticas
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert' // Puedes darle estilo en global.scss
    });
    await alert.present();
  }
}