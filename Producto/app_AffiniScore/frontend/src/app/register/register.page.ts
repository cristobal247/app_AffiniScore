import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { LoadingController, ToastController, IonicModule, NavController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class RegisterPage {
  fullName: string = '';
  email: string = '';
  password: string = '';
  birthDate: string = '';
  formattedDate: string = '';
  isLoading = false;
  showPassword = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onDateInput(event: any) {
    // Eliminar todo lo que no sea número
    let value = event.target.value.replace(/\D/g, ''); 
    
    // Limitar a 8 dígitos (DDMMYYYY)
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    // Formatear visualmente
    if (value.length >= 5) {
      this.formattedDate = `${value.substring(0, 2)} / ${value.substring(2, 4)} / ${value.substring(4, 8)}`;
    } else if (value.length >= 3) {
      this.formattedDate = `${value.substring(0, 2)} / ${value.substring(2)}`;
    } else {
      this.formattedDate = value;
    }

    event.target.value = this.formattedDate;

    // Guardar birthDate en el formato requerido por la base de datos (YYYY-MM-DD) si está completo
    if (value.length === 8) {
      const day = value.substring(0, 2);
      const month = value.substring(2, 4);
      const year = value.substring(4, 8);
      this.birthDate = `${year}-${month}-${day}`;
    } else {
      this.birthDate = ''; // Inválido si no está completa
    }
  }

  isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const parts = dateString.split('-');
    if (parts.length !== 3) return false;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  goToWelcome() {
    this.router.navigate(['/welcome']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async onRegister() {
    if (!this.fullName || !this.email || !this.password || !this.birthDate) {
      this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(this.email)) {
      this.showToast('Por favor ingresa un email válido', 'warning');
      return;
    }

    // Validación de fecha real
    if (!this.isValidDate(this.birthDate)) {
      this.showToast('La fecha de nacimiento no es válida', 'warning');
      return;
    }

    // Validación de longitud de contraseña
    if (this.password.length < 6) {
      this.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingCtrl.create({ message: 'Registrando...' });
    await loading.present();

    try {
      // Enviar full_name y birth_date como metadatos
      const { data, error } = await this.supabase.signUpWithMetadata(
        this.email,
        this.password,
        {
          full_name: this.fullName,
          birth_date: this.birthDate
        }
      );
      if (error) throw error;

      // Actualizar explícitamente el registro en la base de datos por si el trigger no mapea birth_date automáticamente
      if (data.user) {
        await this.supabase.updateProfile(data.user.id, { 
          birth_date: this.birthDate 
        });
      }

      // Cerrar la sesión iniciada automáticamente por Supabase al registrarse para forzar login manual
      await this.supabase.signOut();

      await loading.dismiss();
      this.isLoading = false;
      this.showToast('¡Cuenta creada con éxito! Ya puedes iniciar sesión.', 'success');
      this.router.navigate(['/login']);
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;
      this.showToast(error.message || 'Error al registrarse', 'danger');
    }
  }

  async showToast(message: string, color: string = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }
}