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
import { SupabaseService, Activity } from '../services/supabase';
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
        message: 'No se pudo registrar',
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
}