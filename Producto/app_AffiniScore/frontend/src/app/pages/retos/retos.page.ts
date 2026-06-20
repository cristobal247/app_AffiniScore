import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonIcon, AlertController, IonAvatar, IonButton, IonSearchbar, LoadingController, IonModal
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DisconnectChallenge, SupabaseService } from '../../services/supabase';
import { addIcons } from 'ionicons';
import { menuOutline, flash, chevronBackOutline, searchOutline, closeOutline, phonePortraitOutline, closeCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-retos',
  templateUrl: './retos.page.html',
  styleUrls: ['./retos.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonIcon, IonAvatar, IonButton, IonSearchbar, IonModal, CommonModule, FormsModule
  ]
})
export class RetosPage implements OnInit {
  disconnectChallenges: DisconnectChallenge[] = [];

  challengeImages = [
    'assets/images/retos/cena_sin_celulares.png',
    'assets/images/retos/paseo_parque.png',
    'assets/images/retos/juegos_mesa.png',
    'assets/images/retos/cocinar_juntos.png',
    'assets/images/retos/maraton_peliculas.png',
    'assets/images/retos/mirar_estrellas.png',
    'assets/images/retos/maraton_lectura.png',
    'assets/images/retos/caminata_ejercicio.png',
    'assets/images/retos/cafe_charla.png',
    'assets/images/retos/meditacion_pareja.png'
  ];

  isSearching = false;
  searchTerm = '';
  filteredChallenges: DisconnectChallenge[] = [];

  individualPoints = 0;
  couplePoints = 0;

  constructor(
    private supabaseSvc: SupabaseService,
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {  
    addIcons({ menuOutline, flash, chevronBackOutline, searchOutline, closeOutline, phonePortraitOutline, closeCircleOutline });
  }

  goBack() {
    this.navCtrl.back();
  }

  async ngOnInit() {
    await this.loadDisconnectChallenges();
  }

  async loadDisconnectChallenges() {
    this.disconnectChallenges = await this.supabaseSvc.getDisconnectChallenges();
    this.filterChallenges();
    await this.cargarPuntos();
  }

  async cargarPuntos() {
    try {
      const { data: profile } = await this.supabaseSvc.getUserProfile(true);
      if (profile) {
        this.individualPoints = profile.total_points || profile.points_total || 0;
        
        // Cargar puntos de pareja si está vinculado
        const partnership = await this.supabaseSvc.getActivePartnership();
        if (partnership) {
          const user = await this.supabaseSvc.getCurrentUser();
          if (user) {
            const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
            if (partnerId) {
              const { data: partnerProfile } = await this.supabaseSvc.supabase
                .from('profiles')
                .select('total_points')
                .eq('id', partnerId)
                .single();
              
              if (partnerProfile) {
                this.couplePoints = this.individualPoints + (partnerProfile.total_points || 0);
                return;
              }
            }
          }
        }
        // Fallback si no hay pareja o error
        this.couplePoints = this.individualPoints;
      }
    } catch (err) {
      console.error('Error al cargar puntos:', err);
    }
  }

  toggleSearch() {
    this.isSearching = !this.isSearching;
    if (!this.isSearching) {
      this.searchTerm = '';
      this.filteredChallenges = [...this.disconnectChallenges];
    }
  }

  filterChallenges() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredChallenges = [...this.disconnectChallenges];
    } else {
      this.filteredChallenges = this.disconnectChallenges.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.description.toLowerCase().includes(term)
      );
    }
  }

  async empezarReto(item: DisconnectChallenge) {
    const loading = await this.loadingCtrl.create({ message: 'Enviando propuesta...', spinner: 'crescent' });
    await loading.present();
    const res = await this.supabaseSvc.proposeDisconnectChallenge(item.id, item.points);
    loading.dismiss();

    if (res.error) {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo proponer el reto: ' + (res.error?.message || JSON.stringify(res.error)),
        buttons: ['OK'],
        mode: 'ios'
      });
      await alert.present();
      return;
    }

    await this.loadDisconnectChallenges();

    const alert = await this.alertCtrl.create({
      header: 'Reto Propuesto 🎯',
      message: `Le enviamos una invitación a tu pareja para hacer "${item.title}". Cuando acepte, comenzará el Modo Enfoque.`,
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel'
        },
        {
          text: 'Demo: Aceptar Reto',
          handler: async () => {
            if (res.data) {
              const loading = await this.loadingCtrl.create({ message: 'Simulando aceptación de pareja...', spinner: 'crescent' });
              await loading.present();
              
              const partnership = await this.supabaseSvc.getActivePartnership();
              if (partnership) {
                const partnerId = partnership.user1_id === res.data.user_id ? partnership.user2_id : partnership.user1_id;
                await this.supabaseSvc.supabase
                  .from('user_actions_log')
                  .update({
                    status: 'ACTIVE',
                    validated_by: partnerId
                  })
                  .eq('id', res.data.id);
              }
              
              await this.loadDisconnectChallenges();
              loading.dismiss();
              
              const updatedChallenges = await this.supabaseSvc.getDisconnectChallenges();
              const updatedItem = updatedChallenges.find(c => c.id === item.id);
              if (updatedItem) {
                this.startFocusMode(updatedItem);
              }
            }
          }
        }
      ],
      mode: 'ios'
    });
    await alert.present();
  }

  async confirmarReto(item: DisconnectChallenge) {
    if (!item.logId) return;
    const loading = await this.loadingCtrl.create({ message: 'Iniciando Modo Enfoque...', spinner: 'crescent' });
    await loading.present();
    await this.supabaseSvc.acceptProposedChallenge(item.logId);
    loading.dismiss();

    await this.loadDisconnectChallenges();

    // Iniciar Modo Enfoque de inmediato
    this.startFocusMode(item);
  }

  getChallengeImage(title: string, index: number): string {
    const t = (title || '').toLowerCase();
    if (t.includes('cena') || t.includes('comida') || t.includes('restaurante') || t.includes('velas')) return 'assets/images/retos/cena_sin_celulares.png';
    if (t.includes('paseo') || t.includes('caminata') || t.includes('parque')) return 'assets/images/retos/paseo_parque.png';
    if (t.includes('juego') || t.includes('cartas') || t.includes('mesa')) return 'assets/images/retos/juegos_mesa.png';
    if (t.includes('cocin') || t.includes('receta')) return 'assets/images/retos/cocinar_juntos.png';
    if (t.includes('película') || t.includes('pelicula') || t.includes('serie') || t.includes('cine') || t.includes('maratón') || t.includes('maraton')) return 'assets/images/retos/maraton_peliculas.png';
    if (t.includes('estrellas') || t.includes('stargazing') || t.includes('mirar')) return 'assets/images/retos/mirar_estrellas.png';
    if (t.includes('lectura') || t.includes('leer') || t.includes('libro')) return 'assets/images/retos/maraton_lectura.png';
    if (t.includes('deporte') || t.includes('ejercicio') || t.includes('correr')) return 'assets/images/retos/caminata_ejercicio.png';
    if (t.includes('café') || t.includes('cafe') || t.includes('charla') || t.includes('conversar')) return 'assets/images/retos/cafe_charla.png';
    if (t.includes('medita') || t.includes('yoga') || t.includes('relaj')) return 'assets/images/retos/meditacion_pareja.png';
    
    return this.challengeImages[index % this.challengeImages.length];
  }

  // --- MODO ENFOQUE EN CATÁLOGO --- //
  activeChallenge: any = null;
  focusTimeLeft = 900;
  focusInterval: any;
  completedChallengeForUpload: DisconnectChallenge | null = null;

  startFocusMode(item: DisconnectChallenge) {
    this.activeChallenge = item;
    this.focusTimeLeft = 900;
    this.focusInterval = setInterval(() => {
      this.focusTimeLeft--;
      if (this.focusTimeLeft <= 0) {
        this.finishFocusEarly();
      }
    }, 1000);
  }

  abandonFocus() {
    clearInterval(this.focusInterval);
    if (this.activeChallenge?.logId) {
      this.supabaseSvc.abandonProposedChallenge(this.activeChallenge.logId);
    }
    this.activeChallenge = null;
    this.loadDisconnectChallenges();
  }

  async finishFocusEarly() {
    clearInterval(this.focusInterval);
    const item = this.activeChallenge;
    this.activeChallenge = null;

    if (!item) return;

    // Verificar si la verificación con IA está habilitada
    const aiVerification = await this.supabaseSvc.getAiVerificationPreference();
    if (!aiVerification) {
      const loading = await this.loadingCtrl.create({ 
        message: 'Completando reto y sumando puntos...', 
        spinner: 'crescent',
        mode: 'ios'
      });
      await loading.present();
      
      const res = await this.supabaseSvc.completeChallengeDirectly(item.id, item.title, item.points);
      await loading.dismiss();

      if (res.error) {
        const alert = await this.alertCtrl.create({
          header: 'Error',
          message: 'No se pudo completar el reto: ' + res.error,
          buttons: ['OK'],
          mode: 'ios'
        });
        await alert.present();
      } else {
        const alert = await this.alertCtrl.create({
          header: '¡Reto Completado! 🎉',
          message: `Has completado "${item.title}". Se han sumado +${item.points} puntos a tu perfil de forma directa (sin foto).`,
          buttons: ['¡Excelente!'],
          mode: 'ios'
        });
        await alert.present();
        await this.loadDisconnectChallenges();
      }
    } else {
      // Redirige a la página de la validación del reto (con foto)
      this.router.navigate(['/challenge-validation'], {
        state: { challenge: item }
      });
    }
  }

  async onChallengeFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file || !this.completedChallengeForUpload) return;

    const item = this.completedChallengeForUpload;
    this.completedChallengeForUpload = null;

    const loading = await this.loadingCtrl.create({
      message: 'Subiendo e iniciando análisis con AffiniCoach IA...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    try {
      const res = await this.supabaseSvc.validateChallengePhoto(
        item.id,
        item.title,
        item.description,
        item.points,
        file
      );

      await loading.dismiss();

      if (res.success && res.data) {
        const valData = res.data;
        await this.loadDisconnectChallenges();

        const alert = await this.alertCtrl.create({
          header: '¡Reto Validado por la IA! 🎉',
          subHeader: `Puntos obtenidos: +${valData.points_awarded} / ${valData.max_points}`,
          message: valData.feedback,
          buttons: ['¡Genial!'],
          mode: 'ios'
        });
        await alert.present();
      } else {
        const alert = await this.alertCtrl.create({
          header: 'Error al validar',
          message: res.error || 'No se pudo subir o validar la imagen. Inténtalo de nuevo.',
          buttons: ['OK'],
          mode: 'ios'
        });
        await alert.present();
      }
    } catch (e: any) {
      await loading.dismiss();
      const alert = await this.alertCtrl.create({
        header: 'Error inesperado',
        message: e.message || String(e),
        buttons: ['OK'],
        mode: 'ios'
      });
      await alert.present();
    } finally {
      ev.target.value = '';
    }
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
