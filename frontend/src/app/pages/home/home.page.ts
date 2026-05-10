import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonText,
  IonCard, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
  IonAvatar, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, flash, settingsSharp, chatbubblesOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase'; // Ajusta la ruta si es necesario

import { NavController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonText,
    IonCard, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
    IonAvatar, IonButtons
  ]
})
export class HomePage implements OnInit {
  points: number = 0;
  meta: number = 2000; // Meta para el cálculo del círculo
  nivelAfinidad: number = 1;
  porcentajeAfinidad: number = 0;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private navCtrl: NavController
  ) {
    addIcons({ heart, flash, settingsSharp, chatbubblesOutline });
  }

  async ngOnInit() {
    await this.cargarDatosAfinidad();
  }

  // Se ejecuta cada vez que el usuario vuelve a esta pestaña
  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
  }

  async cargarDatosAfinidad() {
    try {
      const { data, error } = await this.supabaseSvc.getUserProfile();
      if (data) {
        this.points = data.total_points || 0;
        this.porcentajeAfinidad = Math.round((this.points / this.meta) * 100);
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  }

  goToActions() {
    this.navCtrl.navigateForward('/tabs/actions', { animated: true, animationDirection: 'forward' });
  }
}