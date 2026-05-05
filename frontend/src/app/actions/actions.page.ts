import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
  IonIcon, IonLabel, IonButtons, IonButton, 
  IonAvatar, IonInput, IonCard, IonCardTitle,
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline, lockClosed, personOutline, checkmarkCircle, chatbubblesOutline,
  cartOutline
} from 'ionicons/icons';
import { SupabaseService, Activity, DisconnectChallenge } from '../services/supabase';
import { EmojiPipe } from '../pipes/emoji.pipe';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.page.html',
  styleUrls: ['./actions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
    IonIcon, IonLabel, IonButtons, IonButton, 
    IonAvatar, IonInput, RouterModule, IonCard, IonCardTitle,
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

  disconnectChallenges: DisconnectChallenge[] = [];
  challengeImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO0BI4plo40cKmuzfXv3ch3sfjl88YKWMqTo-17cgk7kwaBYBb1YhsR0544HY0oppAlTSfKh0k5D2zoLGQZPXYFzpyXBcuocRJVhlFFQGw8L17dCQxb2f9cFe7BDcPt4KnPA3ljxYAM3UsRsNSeBoUST_obWnTq9OG7Y423kV7unx1YsNx6YyuEKH0L0TD7SWHJQrl2_N-Psjb7ewDZ0bh4NPf0C699mjjHlB1-ptQet37X2hGpjkusFGCBVmSzwlK9aOZq4-C988',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCDFq81_0BDne6HQKF0ss82iQltc0787WRT8395azpeFGUljhW2vSCjSMBhbEmSfEKr5Jk7awZnVs5t6rpDz0IbQ4rl1SzV_HN-T93Mphkp2HQQQ2Q8Bmgs4B-we1jBezZ2RYBI46mTike6kzMPHBsd05MPNhQ00fB98zQ3frXD0PO7zVxSBAZnrFfh4DjwEu4VZSWRMdTrxyFkiiUSvLmroJMdXN-NpQuyWCy9qAKUW3t-6obBFlpMsV_9_u4CoFfSGxvVXwNzHBA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDED7_vj5Bo9tZfdjGKmrrdmjn99oTlgDpHJtU83qm2tYs-Qj0F6U11B-3HzNyWP8--ijruBiWu7cX0q_WPETd6HXjp46NwhV-dJnaYS_8FE9qkAEdqGwUA8zLW0hXvSQtgyvHddxlleUvbmA2ptfYjarYED3qm-Uk98HIg0nixgtZ1qklCjqlCd07txC305J5ppZZvKj8Y3VQpDT_9dkL_BPkGufQzsU51oZUrFzX1pluX5FN7ekU4fog9Eu4BLNgjhGx8dghhIoQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBlu1dSU7bWRjUMbvwG4E8P2SZd8_3pPaUOF2IRsljbalik6aZRsuYjvC-xuEJwSyuMSvk2LKHoON5MmtccjZBaTJEjh_TRi1FzJYaljUKTNgaVcl0usDYOL6y-UQqgVHxMVTVXq6qGSK_F2RhWYYP2R1_tfU_KxprF0LIuQlDSUItASzZKGNV03b37KQjU3D1bb729uvHn67BbBeTJLWM2-GpMK3E9Oj7jK_irXvkCZp2xRmzO1GP2KxjVD_nPwCotAAinmZv9kqA'
  ];

  constructor(
    private supabaseSvc: SupabaseService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline, lockClosed, personOutline, checkmarkCircle, chatbubblesOutline,
      cartOutline
    });
  }

  async ngOnInit() {
    await this.refreshCatalog();
    await this.cargarDatosAfinidad();
    await this.loadDisconnectChallenges();
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
    const { error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
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

    // Actualización inmediata para que el usuario lo vea
    this.points += item.default_points;
    this.calcularNivel();

    item.isCompleting = true;
    setTimeout(() => {
      this.replaceCard(item);
    }, 500);

    const alert = await this.alertCtrl.create({
      header: '¡Éxito!',
      message: `Sumaste ${item.default_points} pts. Ahora tienes ${this.points} puntos (Nivel ${this.nivelAfinidad})`,
      buttons: ['OK']
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

    const loading = await this.loadingCtrl.create({ message: 'Guardando...', spinner: 'crescent' });
    await loading.present();

    // Valores base para el catalogo; ajusta segun tu modelo de datos.
    const { error } = await this.supabaseSvc.createCatalogAction(trimmed, 'Detalles', 10);
    loading.dismiss();

    const alert = await this.alertCtrl.create({
      header: error ? 'Error' : '¡Listo!',
      message: error ? 'No se pudo guardar la acción.' : 'Acción agregada al catálogo.',
      buttons: ['OK']
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

  async acceptChallenge(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.acceptDisconnectChallenge(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Reto aceptado',
      message: `"${item.title}" quedó pendiente de aceptación de tu pareja.`,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

  async confirmJointAcceptance(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.confirmJointAcceptance(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Aceptación conjunta lista',
      message: `"${item.title}" ya está aceptado por ambos. Ya pueden completarlo juntos.`,
      buttons: ['Genial'],
      mode: 'ios'
    });
    await alert.present();
  }

  getChallengeImage(index: number): string {
    return this.challengeImages[index % this.challengeImages.length];
  }
}