import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonText,
  IonCard, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
  IonAvatar, IonButtons, ToastController
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
  imagesOutline,
  sparkles,
  gridOutline,
  timeOutline
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
  reflectionPhrase: string = '';
  reflectionAuthor: string = '';
  reflectionsCatalog: { phrase: string; author: string }[] = [];

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController
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
      imagesOutline,
      sparkles,
      gridOutline,
      timeOutline
    });
  }

  private pointsSub?: import('rxjs').Subscription;
  private realtimeChannels: any[] = [];

  async ngOnInit() {
    await this.cargarDatosAfinidad();

    // Revisar si cambió el mes al iniciar la app y rotar registros si aplica
    try {
      await this.supabaseSvc.checkAndRotateMonthlyAffinity();
    } catch (e) {
      console.warn('Error al chequear rotación mensual:', e);
    }
    
    // Suscribirse a los cambios de puntos locales
    this.pointsSub = this.supabaseSvc.pointsUpdated.subscribe(() => {
      this.cargarDatosAfinidad();
    });

    // Suscribirse en tiempo real a los puntos de la pareja en Supabase
    const channels = await this.supabaseSvc.subscribeToPointsRealtime(async (payload) => {
      const user = await this.supabaseSvc.getCurrentUser();
      
      // Solo reaccionamos si la acción es de la pareja (no propia)
      if (payload.new.user_id !== user?.id) {
        await this.cargarDatosAfinidad();
        
        // Solo mostramos el Toast si la acción ya está CONFIRMADA (puntos sumados)
        // Si está PENDING, el PushNotification/Alert ya se encarga de avisar
        if (payload.new.status === 'CONFIRMED') {
          const toast = await this.toastCtrl.create({
            message: '¡Tu pareja ha ganado puntos!',
            duration: 3000,
            position: 'top',
            color: 'success',
            icon: 'sparkles',
            cssClass: 'custom-toast'
          });
          await toast.present();
        }
      }
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
      // Cargar la reflexión diaria dinámicamente
      this.reflectionsCatalog = await this.supabaseSvc.getReflectionsCatalog();
      if (this.reflectionsCatalog && this.reflectionsCatalog.length > 0) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - startOfYear.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        const index = dayOfYear % this.reflectionsCatalog.length;
        this.reflectionPhrase = this.reflectionsCatalog[index].phrase;
        this.reflectionAuthor = this.reflectionsCatalog[index].author;
      }

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
        // Guardamos snapshot en el perfil para uso en rotación mensual
        try {
          await this.supabaseSvc.updateMonthlySnapshot(this.porcentajeAfinidad);
        } catch (e) {
          console.warn('Error guardando snapshot mensual:', e);
        }
        
        this.userAvatarUrl = data.avatar_url || null;
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  }

  cambiarFraseAleatoria() {
    if (this.reflectionsCatalog && this.reflectionsCatalog.length > 0) {
      // Filtrar para evitar mostrar la misma frase consecutivamente si el catálogo tiene más opciones
      const otrasFrases = this.reflectionsCatalog.filter(
        r => r.phrase !== this.reflectionPhrase
      );
      const fuente = otrasFrases.length > 0 ? otrasFrases : this.reflectionsCatalog;
      const indexAleatorio = Math.floor(Math.random() * fuente.length);
      
      this.reflectionPhrase = fuente[indexAleatorio].phrase;
      this.reflectionAuthor = fuente[indexAleatorio].author;
    }
  }

  goToActions() {
    this.navCtrl.navigateForward('/tabs/actions', { animated: true, animationDirection: 'forward' });
  }
}