import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
  IonIcon, IonLabel, IonButtons, IonButton, 
  IonAvatar, IonInput, IonCard, IonCardTitle,
  LoadingController, AlertController, IonSpinner, IonModal,
  IonBadge, IonTitle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline, lockClosed, personOutline, checkmarkCircle, chatbubblesOutline,
  cartOutline, timeOutline, phonePortraitOutline, closeCircleOutline, sparkles, notificationsOutline, addOutline, closeOutline, createOutline, listOutline
} from 'ionicons/icons';
import { SupabaseService, Activity, DisconnectChallenge } from '../services/supabase';
import { GroqService } from '../services/groq.service';
import { EmojiPipe } from '../pipes/emoji.pipe';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.page.html',
  styleUrls: ['./actions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
    IonIcon, IonLabel, IonButtons, IonButton, 
    IonAvatar, IonInput, RouterModule, IonCard, IonCardTitle,
    IonSpinner, IonModal, IonBadge, IonTitle,
    CommonModule, FormsModule, EmojiPipe
  ]
})
export class ActionsPage implements OnInit {
  actionsCatalog: Activity[] = [];
  newActionName = '';
  
  get rutinas(): Activity[] {
    return this.actionsCatalog.filter(a => a.activity_type === 'ROUTINE').slice(0, 5);
  }

  get retos(): Activity[] {
    return this.actionsCatalog.filter(a => a.activity_type === 'CHALLENGE').slice(0, 5);
  }
  
  points: number = 0;
  nivelAfinidad: number = 1;
  userAvatarUrl: string | null = null;
  showChallengeMenu = false;

  disconnectChallenges: DisconnectChallenge[] = [];
  challengeImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO0BI4plo40cKmuzfXv3ch3sfjl88YKWMqTo-17cgk7kwaBYBb1YhsR0544HY0oppAlTSfKh0k5D2zoLGQZPXYFzpyXBcuocRJVhlFFQGw8L17dCQxb2f9cFe7BDcPt4KnPA3ljxYAM3UsRsNSeBoUST_obWnTq9OG7Y423kV7unx1YsNx6YyuEKH0L0TD7SWHJQrl2_N-Psjb7ewDZ0bh4NPf0C699mjjHlB1-ptQet37X2hGpjkusFGCBVmSzwlK9aOZq4-C988',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCDFq81_0BDne6HQKF0ss82iQltc0787WRT8395azpeFGUljhW2vSCjSMBhbEmSfEKr5Jk7awZnVs5t6rpDz0IbQ4rl1SzV_HN-T93Mphkp2HQQQ2Q8Bmgs4B-we1jBezZ2RYBI46mTike6kzMPHBsd05MPNhQ00fB98zQ3frXD0PO7zVxSBAZnrFfh4DjwEu4VZSWRMdTrxyFkiiUSvLmroJMdXN-NpQuyWCy9qAKUW3t-6obBFlpMsV_9_u4CoFfSGxvVXwNzHBA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDED7_vj5Bo9tZfdjGKmrrdmjn99oTlgDpHJtU83qm2tYs-Qj0F6U11B-3HzNyWP8--ijruBiWu7cX0q_WPETd6HXjp46NwhV-dJnaYS_8FE9qkAEdqGwUA8zLW0hXvSQtgyvHddxlleUvbmA2ptfYjarYED3qm-Uk98HIg0nixgtZ1qklCjqlCd07txC305J5ppZZvKj8Y3VQpDT_9dkL_BPkGufQzsU51oZUrFzX1pluX5FN7ekU4fog9Eu4BLNgjhGx8dghhIoQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBlu1dSU7bWRjUMbvwG4E8P2SZd8_3pPaUOF2IRsljbalik6aZRsuYjvC-xuEJwSyuMSvk2LKHoON5MmtccjZBaTJEjh_TRi1FzJYaljUKTNgaVcl0usDYOL6y-UQqgVHxMVTVXq6qGSK_F2RhWYYP2R1_tfU_KxprF0LIuQlDSUItASzZKGNV03b37KQjU3D1bb729uvHn67BbBeTJLWM2-GpMK3E9Oj7jK_irXvkCZp2xRmzO1GP2KxjVD_nPwCotAAinmZv9kqA'
  ];

  notifications: any[] = [];
  unreadCount = 0;
  isNotificationsOpen = false;
  playingAudioUrl: string | null = null;
  audioObj: HTMLAudioElement | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private groqSvc: GroqService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private notificationSvc: NotificationService,
    private router: Router
  ) {
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline, lockClosed, personOutline, checkmarkCircle, chatbubblesOutline,
      cartOutline, timeOutline, phonePortraitOutline, closeCircleOutline, sparkles, notificationsOutline, addOutline, closeOutline, createOutline, listOutline
    });
  }

  async ngOnInit() {
    await this.refreshCatalog();
    await this.cargarDatosAfinidad();
    await this.loadDisconnectChallenges();

    await this.notificationSvc.init();
    this.notificationSvc.notifications$.subscribe(notifs => {
      this.notifications = notifs;
    });
    this.notificationSvc.pendingCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  async validateActionNotification(logId: string, confirm: boolean) {
    const loading = await this.loadingCtrl.create({ message: 'Procesando...', spinner: 'crescent' });
    await loading.present();
    await this.notificationSvc.validateAction(logId, confirm);
    loading.dismiss();
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
    if (this.audioObj) {
      this.audioObj.pause();
    }
  }

  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
  }

  async cargarDatosAfinidad() {
    try {
      const { data, error } = await this.supabaseSvc.getUserProfile();
      if (data) {
        this.points = data.total_points || 0;
        this.userAvatarUrl = data.avatar_url || null;
        this.calcularNivel();
      }
    } catch (error) {
      console.error('Error al cargar puntos:', error);
    }
  }

  calcularNivel() {
    this.nivelAfinidad = Math.floor(this.points / 500) + 1;
  }

  private async refreshCatalog() {
    const [routinesRes, challengesRes] = await Promise.all([
      this.supabaseSvc.getCatalog('ROUTINE'),
      this.supabaseSvc.getCatalog('CHALLENGE')
    ]);
    const routines = routinesRes.data || [];
    const challenges = challengesRes.data || [];
    this.actionsCatalog = [...routines, ...challenges];
  }

  goToFullCatalog() {
    this.navCtrl.navigateForward('/catalog', { animationDirection: 'forward' });
  }



  async registerAction(item: any) {
    if (item?.isCompleting) {
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Registrando...', spinner: 'crescent' });
    await loading.present();
    const { data: log, error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
    loading.dismiss();
    
    if (error) {
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo registrar: ' + (typeof error === 'string' ? error : (error?.message || JSON.stringify(error))),
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    item.isCompleting = true;
    setTimeout(() => {
      this.replaceCard(item);
    }, 500);

    const isPending = log?.status === 'PENDING';
    
    if (!isPending) {
      // Actualización inmediata solo si NO es un acto de servicio (porque ya se confirmaron)
      this.points += item.default_points;
      this.calcularNivel();
    }

    const alert = await this.alertCtrl.create({
      header: isPending ? 'Acción pendiente' : '¡Éxito!',
      message: isPending 
        ? `Esta acción es un "Acto de servicio" y requiere que tu pareja la confirme para sumarte los puntos. ¡Le acabamos de avisar!`
        : `Sumaste ${item.default_points} pts. Ahora tienes ${this.points} puntos (Nivel ${this.nivelAfinidad})`,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  private replaceCard(item: any) {
    // Ya no usamos catalogPool, puedes dejar esta función vacía o recargar el catálogo
    this.refreshCatalog();
  }

  async addCustomAction() {
    const trimmed = this.newActionName.trim();
    if (!trimmed) {
      const alert = await this.alertCtrl.create({
        header: 'Nombre requerido',
        message: 'Escribe una acción antes de registrar.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({ 
      message: 'AffiniCoach IA evaluando tu acción...', 
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    // 1. Consultar a la IA para clasificar y puntuar
    const aiResult = await this.groqSvc.analyzeCustomAction(trimmed);

    // 2. Registrar la acción en Supabase con los datos de la IA, marcándola con la subcategoría 'CUSTOM'
    const { error } = await this.supabaseSvc.createCatalogAction(
      trimmed, 
      aiResult.category, 
      aiResult.points,
      'ROUTINE',
      aiResult.description,
      'CUSTOM'
    );
    loading.dismiss();

    // 3. Mostrar alerta con la evaluación y feedback de la IA
    const alert = await this.alertCtrl.create({
      header: '¡Acción Evaluada con IA! ✨',
      subHeader: `Categoría: ${aiResult.category} | +${aiResult.points} Pts`,
      message: error 
        ? 'No se pudo guardar la acción.' 
        : `AffiniCoach analizó "${trimmed}" y generó:\n\n"${aiResult.description}"`,
      buttons: ['¡Genial!'],
      mode: 'ios'
    });
    await alert.present();

    if (!error) {
      this.newActionName = '';
      await this.refreshCatalog();
    }
  }

  async loadDisconnectChallenges() {
    this.disconnectChallenges = await this.supabaseSvc.getDisconnectChallenges();
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

    // Iniciar Modo Enfoque localmente de inmediato
    this.startFocusMode(item);
  }

  getChallengeImage(index: number): string {
    return this.challengeImages[index % this.challengeImages.length];
  }

  // --- NUEVA LÓGICA DE RETOS (IA Y MODO ENFOQUE) --- //
  
  isGeneratingAi = false;
  activeChallenge: any = null;
  focusTimeLeft = 900; // 15 minutos
  focusInterval: any;

  async generateAiChallenge() {
    this.isGeneratingAi = true;
    try {
      const prompt = "Genera un reto de desconexión para parejas único, romántico y divertido. Debe requerir no usar el celular. Responde SOLO con el formato JSON: {\"title\": \"Título\", \"description\": \"Descripción corta\", \"points\": 150}. Sin markdown extra ni saludos.";
      const response = await this.groqSvc.sendMessage(prompt, 'Sistema de Retos');
      
      const match = response.match(/\{[\s\S]*\}/);
      if(match) {
        const retoData = JSON.parse(match[0]);
        const newReto: any = {
          id: 'ai_' + new Date().getTime(),
          title: retoData.title || 'Reto Sorpresa',
          description: retoData.description || 'Disfruten un momento sin pantallas.',
          points: retoData.points || 150,
          difficulty: 'Medio',
          category: 'IA',
          myAccepted: false,
          partnerAccepted: false,
          status: 'disponible',
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDED7_vj5Bo9tZfdjGKmrrdmjn99oTlgDpHJtU83qm2tYs-Qj0F6U11B-3HzNyWP8--ijruBiWu7cX0q_WPETd6HXjp46NwhV-dJnaYS_8FE9qkAEdqGwUA8zLW0hXvSQtgyvHddxlleUvbmA2ptfYjarYED3qm-Uk98HIg0nixgtZ1qklCjqlCd07txC305J5ppZZvKj8Y3VQpDT_9dkL_BPkGufQzsU51oZUrFzX1pluX5FN7ekU4fog9Eu4BLNgjhGx8dghhIoQ'
        };
        this.disconnectChallenges.unshift(newReto);
      }
    } catch(err) {
      console.error('Error generando IA:', err);
    }
    this.isGeneratingAi = false;
  }

  toggleChallengeMenu() {
    this.showChallengeMenu = !this.showChallengeMenu;
  }

  selectCreateManualChallenge() {
    this.showChallengeMenu = false;
    this.openCreateManualChallengeAlert();
  }

  selectViewCatalog() {
    this.showChallengeMenu = false;
    this.navCtrl.navigateForward('/retos');
  }

  async openCreateManualChallengeAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Reto Manual',
      subHeader: 'Establece tus propias reglas',
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Título (ej: Picnic sin pantallas)'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción y reglas del reto'
        },
        {
          name: 'points',
          type: 'number',
          placeholder: 'Puntos de recompensa (ej: 150)',
          min: 10,
          max: 1000
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: (data) => {
            const title = data.title?.trim();
            const description = data.description?.trim();
            const points = parseInt(data.points) || 100;
            
            if (!title || !description) {
              this.showToast('Por favor, completa todos los campos.', 'warning');
              return false;
            }
            
            this.supabaseSvc.createDisconnectChallenge(title, description, points).then(challenges => {
              this.disconnectChallenges = challenges.map(c => ({
                ...c,
                myAccepted: false,
                partnerAccepted: false,
                status: 'disponible'
              }));
            });
            return true;
          }
        }
      ],
      mode: 'ios'
    });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const alert = await this.alertCtrl.create({
      header: 'Atención',
      message: message,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

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

  completedChallengeForUpload: DisconnectChallenge | null = null;

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
        await this.cargarDatosAfinidad(); // Refresh total points

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