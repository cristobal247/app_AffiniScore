import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonItem, IonLabel, IonInput, IonButton, 
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonItem, IonLabel, IonInput, IonButton, 
    CommonModule, FormsModule
  ]
})
export class RegisterPage {
  email = '';
  password = '';

  constructor(
    private supabaseSvc: SupabaseService,
    public router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async onRegister() {
    if (!this.email || !this.password) {
      this.showAlert('Atención', 'Debes completar todos los campos.');
      return;  
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creando tu cuenta...',
      mode: 'ios'
    });
    await loading.present();

    const { data, error } = await this.supabaseSvc.signUp(this.email, this.password);

    await loading.dismiss();

    if (error) {
      this.showAlert('Error en registro', error.message);
    } else {
      const alert = await this.alertCtrl.create({
        header: '¡Cuenta creada!',
        message: 'Ya puedes iniciar sesión para empezar a sumar puntos.',
        buttons: [{
          text: 'Ir al Login',
          handler: () => { this.router.navigate(['/login']); }
        }],
        mode: 'ios'
      });
      await alert.present();
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }
}