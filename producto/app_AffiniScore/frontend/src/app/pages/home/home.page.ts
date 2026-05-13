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
import { 
  heart, 
  flash, 
  settingsSharp, 
  documentTextOutline, 
  trendingUpOutline,
  chatbubblesOutline,
  starOutline,
  location,
  imagesOutline
} from 'ionicons/icons';
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
  puntosSemanales: number = 0;
  metaSemanal: number = 3000; // Meta aumentada para que el porcentaje suba más lento y sea realista
  nivelAfinidad: number = 1;
  porcentajeAfinidad: number = 0;
  userAvatarUrl: string | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private navCtrl: NavController
  ) {
    addIcons({ 
      heart, 
      flash, 
      settingsSharp, 
      documentTextOutline, 
      trendingUpOutline,
      chatbubblesOutline,
      starOutline,
      location,
      imagesOutline
    });
  }

  private pointsSub?: import('rxjs').Subscription;
  private realtimeChannels: any[] = [];

  async ngOnInit() {
    await this.cargarDatosAfinidad();
    
    // Suscribirse a los cambios de puntos locales
    this.pointsSub = this.supabaseSvc.pointsUpdated.subscribe(() => {
      this.cargarDatosAfinidad();
    });

    // Suscribirse en tiempo real a los puntos de la pareja en Supabase
    // Esto funciona igual que la IA del chat, actualizando el porcentaje al instante
    const channels = await this.supabaseSvc.subscribeToPointsRealtime(() => {
      this.cargarDatosAfinidad();
    });
    if (channels) {
      this.realtimeChannels = channels;
    }
  }

  ngOnDestroy() {
    if (this.pointsSub) {
      this.pointsSub.unsubscribe();
    }
    
    // Limpiar canales de Supabase Realtime
    this.realtimeChannels.forEach(channel => {
      if (channel) {
        this.supabaseSvc['supabase'].removeChannel(channel);
      }
    });
  }

  // Se ejecuta cada vez que el usuario vuelve a esta pestaña
  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
  }

  async cargarDatosAfinidad() {
    try {
      const { data, error } = await this.supabaseSvc.getUserProfile();
      const weeklyRes = await this.supabaseSvc.getWeeklyPoints();
      
      this.puntosSemanales = weeklyRes.data || 0;

      if (data) {
        this.points = data.total_points || 0;
        
        // Cada 5000 puntos se sube de nivel (hace que sea un reto real)
        const puntosPorNivel = 5000;
        this.nivelAfinidad = Math.floor(this.points / puntosPorNivel) + 1;
        
        // Progreso hacia la meta SEMANAL
        this.porcentajeAfinidad = Math.min(100, Math.round((this.puntosSemanales / this.metaSemanal) * 100));
        
        this.userAvatarUrl = data.avatar_url || null;
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  }

  goToActions() {
    this.navCtrl.navigateForward('/tabs/actions', { animated: true, animationDirection: 'forward' });
  }
}