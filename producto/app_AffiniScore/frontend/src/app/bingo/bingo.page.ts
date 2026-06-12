import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonIcon, IonButton, LoadingController, ToastController,
  IonSpinner, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, checkmarkCircle, alertCircleOutline } from 'ionicons/icons';
import { BingoBonusAward, BingoCard, BingoCellTask, BingoProgress, BingoService } from './bingo.service';

@Component({
  selector: 'app-bingo',
  templateUrl: './bingo.page.html',
  styleUrls: ['./bingo.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonIcon, IonButton, IonSpinner, CommonModule, FormsModule
  ]
})
export class BingoPage implements OnInit {
  bingoCard: BingoCard | null = null;
  progress: BingoProgress | null = null;
  completedCellIds: Set<string> = new Set();
  savingCellId: string | null = null;
  isLoading = true;
  isSaving = false;
  hasWon = false;
  isCelebratingFullCard = false;
  fullCardCelebrationMessage = '';

  constructor(
    private bingoService: BingoService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
    private navCtrl: NavController
  ) {
    addIcons({ chevronBackOutline, checkmarkCircle, alertCircleOutline });
  }

  async resetCard() {
    if (this.isSaving) return;
    
    const confirmed = window.confirm('¿Estás seguro de que quieres reiniciar el cartón de Bingo? Esto restablecerá el progreso para ambos miembros de la pareja.');
    if (!confirmed) return;

    this.isSaving = true;
    try {
      const newCard = await this.bingoService.generateNewCard();
      if (newCard) {
        this.bingoCard = newCard;
        this.progress = {
          id: '',
          partnership_id: '',
          card_id: this.bingoCard.id,
          completed_cells: [],
          points_earned: 0
        } as any;
        this.completedCellIds = new Set();
        this.hasWon = false;
        this.isCelebratingFullCard = false;
        this.fullCardCelebrationMessage = '';
        await this.showToast('Cartón reiniciado', 'success');
      }
    } catch (e) {
      console.error('Error resetting card:', e);
      await this.showToast('Error al reiniciar el cartón', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async ngOnInit() {
    await this.loadBingo();
  }

  goBack() {
    this.navCtrl.navigateBack('/tabs/dashboard');
  }

  async loadBingo() {
    this.isLoading = true;

    try {
      const { data: card, error: cardError } = await this.bingoService.getBingoCard();
      if (cardError) {
        console.error('Error loading bingo card:', cardError);
        await this.showToast('Error al cargar el bingo', 'danger');
        return;
      }

      this.bingoCard = card;

      if (card) {
        const { data: progressData, error: progressError } = await this.bingoService.getBingoProgress(card.id);

        this.progress = progressError
          ? {
              id: '',
              partnership_id: '',
              card_id: card.id,
              completed_cells: [],
              points_earned: 0
            }
          : progressData || {
              id: '',
              partnership_id: '',
              card_id: card.id,
              completed_cells: [],
              points_earned: 0
            };

        this.completedCellIds = new Set(this.progress?.completed_cells || []);
        this.hasWon = !!this.progress && this.progress.completed_cells.length >= 3
          ? this.bingoService.checkBingoWin(this.progress.completed_cells)
          : false;
      }
    } catch (error) {
      console.error('Error in loadBingo:', error);
      await this.showToast('Error inesperado', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async toggleCell(cell: BingoCellTask) {
    if (!this.bingoCard || this.isSaving || this.savingCellId) {
      return;
    }

    if (this.isCellCompleted(cell)) {
      await this.showToast('Esta casilla ya está completada y no puede desactivarse.', 'warning');
      return;
    }

    this.isSaving = true;
    this.savingCellId = cell.id;
    this.completedCellIds.add(cell.id);

    try {
      if (this.completedCellIds.has(cell.id)) {
        // Keep the optimistic state visible while the server validates it.
      }

      const result: any = await this.bingoService.markBingoCellComplete(this.bingoCard.id, cell.id);

      if (result?.error) {
        console.error('Error marking cell:', result.error);
        const msg = (result.error as any)?.message || JSON.stringify(result.error);
        await this.showToast('Error al guardar: ' + msg, 'danger');
        // rollback optimistic change
        this.completedCellIds.delete(cell.id);
      } else {
        // Use server-provided completed list and points if available
        const completedArray: string[] = result?.completed || Array.from(this.completedCellIds);
        this.completedCellIds = new Set(completedArray);
        const bonusAwards: BingoBonusAward[] = result?.bonusAwards || [];
        this.progress = {
          id: this.progress?.id || '',
          partnership_id: this.progress?.partnership_id || '',
          card_id: this.bingoCard.id,
          completed_cells: completedArray,
          points_earned: result?.pointsEarned ?? this.progress?.points_earned ?? 0,
          created_at: this.progress?.created_at,
          updated_at: this.progress?.updated_at
        };

        const won = this.bingoService.checkBingoWin(completedArray);
        if (won && !this.hasWon) {
          this.hasWon = true;
        }

        if (bonusAwards.length > 0) {
          for (const bonus of bonusAwards) {
            await this.showToast(bonus.message, 'success');
          }
        } else {
          await this.showToast('Celda guardada', 'success');
        }

        if (result?.fullCard) {
          this.isCelebratingFullCard = true;
          this.fullCardCelebrationMessage = '¡Cartón completado! Reiniciando el tablero...';
          this.cdr.detectChanges();
          await this.delay(100);
          await this.showToast('¡Cartón completado! + bono especial', 'success');

          await this.delay(1400);

          if (result.newCard) {
            this.bingoCard = result.newCard as BingoCard;
            this.progress = {
              id: '',
              partnership_id: '',
              card_id: this.bingoCard.id,
              completed_cells: [],
              points_earned: 0
            } as any;
            this.completedCellIds = new Set();
            this.hasWon = false;
          }

          this.isCelebratingFullCard = false;
          this.fullCardCelebrationMessage = '';
        }
      }
    } catch (error) {
      console.error('Error toggling cell:', error);
      await this.showToast('Error inesperado: ' + (((error as any)?.message) || JSON.stringify(error)), 'danger');
    } finally {
      this.savingCellId = null;
      this.isSaving = false;
    }
  }

  isCellCompleted(cell: BingoCellTask): boolean {
    return this.completedCellIds.has(cell.id);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }

  getTotalPoints(): number {
    return this.progress?.points_earned ?? 0;
  }

  isCellSaving(cell: BingoCellTask): boolean {
    return this.savingCellId === cell.id;
  }

  private delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
}
