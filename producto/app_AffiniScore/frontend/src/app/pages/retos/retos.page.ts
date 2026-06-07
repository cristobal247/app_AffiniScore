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
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO0BI4plo40cKmuzfXv3ch3sfjl88YKWMqTo-17cgk7kwaBYBb1YhsR0544HY0oppAlTSfKh0k5D2zoLGQZPXYFzpyXBcuocRJVhlFFQGw8L17dCQxb2f9cFe7BDcPt4KnPA3ljxYAM3UsRsNSeBoUST_obWnTq9OG7Y423kV7unx1YsNx6YyuEKH0L0TD7SWHJQrl2_N-Psjb7ewDZ0bh4NPf0C699mjjHlB1-ptQet37X2hGpjkusFGCBVmSzwlK9aOZq4-C988',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCDFq81_0BDne6HQKF0ss82iQltc0787WRT8395azpeFGUljhW2vSCjSMBhbEmSfEKr5Jk7awZnVs5t6rpDz0IbQ4rl1SzV_HN-T93Mphkp2HQQQ2Q8Bmgs4B-we1jBezZ2RYBI46mTike6kzMPHBsd05MPNhQ00fB98zQ3frXD0PO7zVxSBAZnrFfh4DjwEu4VZSWRMdTrxyFkiiUSvLmroJMdXN-NpQuyWCy9qAKUW3t-6obBFlpMsV_9_u4CoFfSGxvVXwNzHBA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDED7_vj5Bo9tZfdjGKmrrdmjn99oTlgDpHJtU83qm2tYs-Qj0F6U11B-3HzNyWP8--ijruBiWu7cX0q_WPETd6HXjp46NwhV-dJnaYS_8FE9qkAEdqGwUA8zLW0hXvSQtgyvHddxlleUvbmA2ptfYjarYED3qm-Uk98HIg0nixgtZ1qklCjqlCd07txC305J5ppZZvKj8Y3VQpDT_9dkL_BPkGufQzsU51oZUrFzX1pluX5FN7ekU4fog9Eu4BLNgjhGx8dghhIoQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBlu1dSU7bWRjUMbvwG4E8P2SZd8_3pPaUOF2IRsljbalik6aZRsuYjvC-xuEJwSyuMSvk2LKHoON5MmtccjZBaTJEjh_TRi1FzJYaljUKTNgaVcl0usDYOL6y-UQqgVHxMVTVXq6qGSK_F2RhWYYP2R1_tfU_KxprF0LIuQlDSUItASzZKGNV03b37KQjU3D1bb729uvHn67BbBeTJLWM2-GpMK3E9Oj7jK_irXvkCZp2xRmzO1GP2KxjVD_nPwCotAAinmZv9kqA'
  ];

  isSearching = false;
  searchTerm = '';
  filteredChallenges: DisconnectChallenge[] = [];

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

  getChallengeImage(index: number): string {
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

    // Navigate to challenge validation page passing challenge in extras state
    this.router.navigate(['/challenge-validation'], {
      state: { challenge: item }
    });
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
