import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonText, 
  IonCard, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
  IonAvatar, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  heart, flash, settingsSharp, homeOutline, headsetOutline, mapOutline, 
  personOutline, alertCircle, locationOutline, imagesOutline, trendingUpOutline,
  starOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonText, 
    IonCard, IonItem, IonLabel, IonIcon, IonButton,
    IonAvatar, IonButtons
  ]
})
export class HomePage implements OnInit {
  points: number = 0;
  meta: number = 2000;
  nivelAfinidad: number = 1;
  porcentajeAfinidad: number = 0;

  constructor(private supabaseSvc: SupabaseService, private navCtrl: NavController) {
    addIcons({
      heart, alertCircle, flash, homeOutline, headsetOutline, mapOutline, 
      personOutline, settingsSharp, locationOutline, imagesOutline, trendingUpOutline,
      starOutline
    });
  }

  async ngOnInit() {
    await this.cargarDatosAfinidad();
  }

  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
  }

  async cargarDatosAfinidad() {
    try {
      const { data, error } = await this.supabaseSvc.getUserProfile();
      if (data) {
        this.points = data.total_points || 0;
        this.calcularNivel();
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  }

  calcularNivel() {
    this.nivelAfinidad = Math.floor(this.points / 500) + 1;
    
    // El porcentaje representa el total de puntos sobre la meta de 2000
    // Solo bajará cuando el usuario canjee puntos en la tienda
    let calc = Math.floor((this.points / this.meta) * 100);
    if (calc > 100) {
      calc = 100; // Tope visual en 100%
    }
    this.porcentajeAfinidad = calc;
  }

  goToActions() {
    this.navCtrl.navigateForward('/actions', { animationDirection: 'forward' });
  }
}