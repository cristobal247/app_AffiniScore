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
import { BingoCard, BingoCellTask, BingoProgress, SupabaseService } from '../../services/supabase';

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
  // Cartón de bingo con 9 tareas
  bingoCard: BingoCard | null = null;

  // Progreso del usuario (qué celdas ha completado)
  progress: BingoProgress | null = null;

  // Array de índices de celdas completadas para fácil acceso
  completedCellIds: Set<string> = new Set();

  // Control de estados
  isLoading = true;
  isSaving = false;
  hasWon = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBack });
  }

  async ngOnInit() {
    // Cargar el cartón de bingo y el progreso
    await this.loadBingo();
  }

  // Cargar cartón de bingo y progreso actual
  async loadBingo() {
    this.isLoading = true;

    try {
      // Obtener el cartón de bingo
      const { data: card, error: cardError } = await this.supabaseSvc.getBingoCard();
      if (cardError) {
        console.error('Error loading bingo card:', cardError);
        this.showToast('Error al cargar el bingo', 'danger');
        return;
      }

      this.bingoCard = card;

      // Si tenemos un cartón, obtener el progreso
      if (card) {
        const { data: progressData, error: progressError } = await this.supabaseSvc.getBingoProgress(card.id);

        if (progressError) {
          // Si no hay progreso, es la primera vez
          this.progress = {
            id: '',
            partnership_id: '',
            card_id: card.id,
            completed_cells: [],
            points_earned: 0
          };
        } else {
          this.progress = progressData || {
            id: '',
            partnership_id: '',
            card_id: card.id,
            completed_cells: [],
            points_earned: 0
          };
        }

        // Cargar las celdas completadas en un Set para búsqueda rápida
        this.completedCellIds = new Set(this.progress?.completed_cells || []);

        // Verificar si ya ganó
        if (this.progress && this.progress.completed_cells.length >= 3) {
          this.hasWon = this.supabaseSvc.checkBingoWin(this.progress.completed_cells);
        }
      }
    } catch (error) {
      console.error('Error in loadBingo:', error);
      this.showToast('Error inesperado', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // Marcar una celda como completada
  async toggleCell(cell: BingoCellTask) {
    if (!this.bingoCard) return;

    this.isSaving = true;

    try {
      // Cambiar estado localmente primero (optimistic update)
      if (this.completedCellIds.has(cell.id)) {
        this.completedCellIds.delete(cell.id);
      } else {
        this.completedCellIds.add(cell.id);
      }

      // Enviar a Supabase
      const result = await this.supabaseSvc.markBingoCellComplete(this.bingoCard.id, cell.id);

      if (result.error) {
        console.error('Error marking cell:', result.error);
        this.showToast('Error al guardar', 'danger');
        // Deshacer cambio local
        if (this.completedCellIds.has(cell.id)) {
          this.completedCellIds.delete(cell.id);
        } else {
          this.completedCellIds.add(cell.id);
        }
      } else {
        // Convertir Set a Array
        const completedArray = Array.from(this.completedCellIds);

        // Verificar si ganó
        const won = this.supabaseSvc.checkBingoWin(completedArray);
        if (won && !this.hasWon) {
          this.hasWon = true;
          this.showToast('¡¡¡GANARON!!! 🎉 ¡Línea completa!', 'success');
        } else {
          this.showToast('Celda guardada', 'success');
        }
      }
    } catch (error) {
      console.error('Error toggling cell:', error);
      this.showToast('Error inesperado', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  // Verificar si una celda está completada
  isCellCompleted(cell: BingoCellTask): boolean {
    return this.completedCellIds.has(cell.id);
  }

  // Mostrar un toast con un mensaje
  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    toast.present();
  }

  // Obtener puntos totales del usuario
  getTotalPoints(): number {
    return this.progress?.points_earned || (this.completedCellIds.size * 10);
  }
}
