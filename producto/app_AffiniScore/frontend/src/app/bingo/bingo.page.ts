import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonBackButton, IonIcon, IonButton, LoadingController, ToastController,
  IonCard, IonCardContent, IonCardHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { BingoCard, BingoCellTask, BingoProgress, BingoService } from './bingo.service';

@Component({
  selector: 'app-bingo',
  templateUrl: './bingo.page.html',
  styleUrls: ['./bingo.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonBackButton, IonIcon, IonButton, IonCard, IonCardContent, IonCardHeader,
    CommonModule, FormsModule
  ]
})
export class BingoPage implements OnInit {
  bingoCard: BingoCard | null = null;
  progress: BingoProgress | null = null;
  completedCellIds: Set<string> = new Set();
  isLoading = true;
  isSaving = false;
  hasWon = false;

  constructor(
    private bingoService: BingoService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBack });
  }

  async ngOnInit() {
    await this.loadBingo();
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
    if (!this.bingoCard || this.isSaving) {
      return;
    }

    this.isSaving = true;

    try {
      if (this.completedCellIds.has(cell.id)) {
        this.completedCellIds.delete(cell.id);
      } else {
        this.completedCellIds.add(cell.id);
      }

      const result = await this.bingoService.markBingoCellComplete(this.bingoCard.id, cell.id);

      if (result.error) {
        console.error('Error marking cell:', result.error);
        await this.showToast('Error al guardar', 'danger');

        if (this.completedCellIds.has(cell.id)) {
          this.completedCellIds.delete(cell.id);
        } else {
          this.completedCellIds.add(cell.id);
        }
      } else {
        const completedArray = Array.from(this.completedCellIds);
        const won = this.bingoService.checkBingoWin(completedArray);

        if (won && !this.hasWon) {
          this.hasWon = true;
          await this.showToast('¡¡¡GANARON!!! 🎉 ¡Línea completa!', 'success');
        } else {
          await this.showToast('Celda guardada', 'success');
        }
      }
    } catch (error) {
      console.error('Error toggling cell:', error);
      await this.showToast('Error inesperado', 'danger');
    } finally {
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
    return this.progress?.points_earned || (this.completedCellIds.size * 10);
  }
}
