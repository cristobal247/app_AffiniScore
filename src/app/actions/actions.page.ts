import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
  IonIcon, IonButtons, IonButton, 
  IonAvatar, IonInput, IonCard, IonCardContent,
  LoadingController, AlertController, ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline, lockClosed, personOutline, checkmarkCircleOutline, chatbubblesOutline,
  cartOutline, playCircleOutline, closeCircleOutline
} from 'ionicons/icons';
import { SupabaseService, Activity, BingoCard, BingoCellTask, BingoProgress } from '../services/supabase';
import { EmojiPipe } from '../pipes/emoji.pipe';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.page.html',
  styleUrls: ['./actions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
    IonIcon, IonButtons, IonButton, 
    IonAvatar, IonInput, RouterModule, IonCard, IonCardContent,
    CommonModule, FormsModule, EmojiPipe
  ]
})
export class ActionsPage implements OnInit {
  actionsCatalog: Activity[] = [];
  newActionName = '';
  bingoCard: BingoCard | null = null;
  bingoProgress: BingoProgress | null = null;
  completedBingoCellIds: Set<string> = new Set();
  isBingoLoading = true;
  isBingoSaving = false;
  bingoHasWon = false;
  
  get rutinas(): Activity[] {
    return this.actionsCatalog.filter(a => a.activity_type === 'ROUTINE').slice(0, 5);
  }

  get retosDesconexion(): Activity[] {
    return this.actionsCatalog
      .filter(a => a.activity_type === 'CHALLENGE' && a.category === 'RETO_DESCONEXION')
      .slice(0, 5);
  }

  get retos(): Activity[] {
    return this.actionsCatalog
      .filter(a => a.activity_type === 'CHALLENGE' && a.category !== 'RETO_DESCONEXION')
      .slice(0, 5);
  }
  
  points: number = 0;
  nivelAfinidad: number = 1;

  constructor(
    private supabaseSvc: SupabaseService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline, lockClosed, personOutline, checkmarkCircleOutline, chatbubblesOutline,
      cartOutline, playCircleOutline, closeCircleOutline
    });
  }

  async ngOnInit() {
    await this.refreshCatalog();
    await this.cargarDatosAfinidad();
    await this.loadBingo();
  }

  async ionViewWillEnter() {
    await this.cargarDatosAfinidad();
    await this.loadBingo();
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

  goToQuickInteraction() {
    this.navCtrl.navigateForward('/tabs/quick-interaction', { animationDirection: 'forward' });
  }

  async loadBingo() {
    this.isBingoLoading = true;

    try {
      const { data: card, error: cardError } = await this.supabaseSvc.getBingoCard();
      if (cardError) {
        console.error('Error loading bingo card:', cardError);
        this.showBingoToast('No se pudo cargar el bingo', 'danger');
        return;
      }

      this.bingoCard = card;

      if (card) {
        const { data: progressData, error: progressError } = await this.supabaseSvc.getBingoProgress(card.id);

        if (progressError) {
          this.bingoProgress = {
            id: '',
            partnership_id: '',
            card_id: card.id,
            completed_cells: [],
            points_earned: 0
          };
        } else {
          this.bingoProgress = progressData || {
            id: '',
            partnership_id: '',
            card_id: card.id,
            completed_cells: [],
            points_earned: 0
          };
        }

        this.completedBingoCellIds = new Set(this.bingoProgress?.completed_cells || []);

        if (this.bingoProgress && this.bingoProgress.completed_cells.length >= 3) {
          this.bingoHasWon = this.supabaseSvc.checkBingoWin(this.bingoProgress.completed_cells);
        } else {
          this.bingoHasWon = false;
        }
      }
    } catch (error) {
      console.error('Error in loadBingo:', error);
      this.showBingoToast('Error inesperado al cargar el bingo', 'danger');
    } finally {
      this.isBingoLoading = false;
    }
  }

  async toggleBingoCell(cell: BingoCellTask) {
    if (!this.bingoCard || this.isBingoSaving) {
      return;
    }

    this.isBingoSaving = true;
    const wasCompleted = this.completedBingoCellIds.has(cell.id);

    try {
      if (wasCompleted) {
        this.completedBingoCellIds.delete(cell.id);
      } else {
        this.completedBingoCellIds.add(cell.id);
      }

      const result = await this.supabaseSvc.markBingoCellComplete(this.bingoCard.id, cell.id);

      if (result.error) {
        console.error('Error marking bingo cell:', result.error);
        this.showBingoToast('No se pudo guardar el bingo', 'danger');

        if (wasCompleted) {
          this.completedBingoCellIds.add(cell.id);
        } else {
          this.completedBingoCellIds.delete(cell.id);
        }
        return;
      }

      const completedArray = Array.from(this.completedBingoCellIds);
      const won = this.supabaseSvc.checkBingoWin(completedArray);

      if (won && !this.bingoHasWon) {
        this.bingoHasWon = true;
        this.showBingoToast('¡¡¡GANARON!!! Línea completa', 'success');
      } else {
        this.showBingoToast('Celda guardada', 'success');
      }
    } catch (error) {
      console.error('Error toggling bingo cell:', error);
      this.showBingoToast('Error inesperado', 'danger');
    } finally {
      this.isBingoSaving = false;
    }
  }

  isBingoCellCompleted(cell: BingoCellTask): boolean {
    return this.completedBingoCellIds.has(cell.id);
  }

  getTotalBingoPoints(): number {
    return this.bingoProgress?.points_earned || (this.completedBingoCellIds.size * 10);
  }

  async showBingoToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });

    await toast.present();
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