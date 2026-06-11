import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonText,
  IonCard, IonItem, IonLabel, IonIcon, IonBadge, IonButton,
  IonAvatar, IonButtons, ToastController, IonSpinner, IonModal
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
  timeOutline,
  notificationsOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase'; // Ajusta la ruta si es necesario
import { NotificationService } from '../../services/notification.service';

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
    IonAvatar, IonButtons, IonSpinner, IonModal
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

  notifications: any[] = [];
  unreadCount = 0;
  isNotificationsOpen = false;
  playingAudioUrl: string | null = null;
  audioObj: HTMLAudioElement | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private notificationSvc: NotificationService
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
      timeOutline,
      notificationsOutline
    });
  }

  private pointsSub?: import('rxjs').Subscription;
  private realtimeChannels: any[] = [];
  async ngOnInit() {
    await this.cargarDatosAfinidad();

    // Reisar si cambió el mes al iniciar la app y rotar registros si aplica
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

    // Inicializar y suscribirse al NotificationService
    await this.notificationSvc.init();
    this.notificationSvc.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationSvc.pendingCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  openNotifications() {
    this.isNotificationsOpen = true;
    this.notificationSvc.markAsReviewed();
  }

  async validateActionNotification(logId: string, confirm: boolean) {
    await this.notificationSvc.validateAction(logId, confirm);
    await this.cargarDatosAfinidad();
  }

  toggleAudio(url: string) {
    if (this.playingAudioUrl === url) {
      if (this.audioObj) {
        this.audioObj.pause();
      }
      this.playingAudioUrl = null;
      this.audioObj = null;
    } else {
      if (this.audioObj) {
        this.audioObj.pause();
      }
      this.playingAudioUrl = url;
      this.audioObj = new Audio(url);
      this.audioObj.play();
      this.audioObj.onended = () => {
        this.playingAudioUrl = null;
        this.audioObj = null;
      };
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

    if (this.audioObj) {
      this.audioObj.pause();
    }
  }  // Se ejecuta cada vez que el usuario vuelve a esta pestaña
  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
  }

  async cargarDatosAfinidad() {
    try {
      // Cargar datos en paralelo para optimizar la velocidad de carga
      const [reflections, profileRes, weeklyRes] = await Promise.all([
        this.supabaseSvc.getReflectionsCatalog(),
        this.supabaseSvc.getUserProfile(),
        this.supabaseSvc.getWeeklyPoints()
      ]);

      this.reflectionsCatalog = reflections;
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

      const data = profileRes.data;
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