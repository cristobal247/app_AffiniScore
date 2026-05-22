import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonImg,
  IonModal,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, expandOutline, heartOutline, timeOutline, closeOutline, sparklesOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import {
  HistoricMemoryImage,
  HistoricMemoryRound,
  SupabaseService,
} from '../../services/supabase';

addIcons({ arrowBackOutline, expandOutline, heartOutline, timeOutline, closeOutline, sparklesOutline });

@Component({
  selector: 'app-memory-history',
  templateUrl: './memory-history.page.html',
  styleUrls: ['./memory-history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonImg,
    IonModal,
    IonProgressBar,
    IonSpinner,
  ],
})
export class MemoryHistoryPage implements OnInit, OnDestroy {
  isLoading = true;
  isCompleting = false;
  isPreviewOpen = false;
  completed = false;
  errorMessage = '';

  currentUserId: string | null = null;
  partnershipId: string | null = null;
  roundKey = '';
  activeMemory: HistoricMemoryImage | null = null;
  sessionStartedAt = new Date();
  sessionEndsAt = new Date(Date.now() + 5 * 60 * 1000);
  remainingSeconds = 300;

  private timerId?: ReturnType<typeof setInterval>;
  private channel: any;
  private pointsSub?: Subscription;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
  ) {
    addIcons({ arrowBackOutline, expandOutline, heartOutline, timeOutline, closeOutline, sparklesOutline });
  }

  async ngOnInit() {
    this.pointsSub = this.supabaseSvc.pointsUpdated.subscribe(() => {
      if (this.completed) {
        this.presentCelebrationToast('La recompensa ya quedó registrada para la pareja.');
      }
    });

    await this.initializeGame();
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    if (this.channel) {
      this.supabaseSvc.supabase.removeChannel(this.channel);
    }

    if (this.pointsSub) {
      this.pointsSub.unsubscribe();
    }
  }

  private async initializeGame() {
    this.isLoading = true;
    this.errorMessage = '';

    const user = await this.supabaseSvc.getCurrentUser();
    const partnership = await this.supabaseSvc.getActivePartnership();

    if (!user || !partnership) {
      this.errorMessage = 'Necesitas una pareja activa para jugar esta dinámica.';
      this.isLoading = false;
      return;
    }

    this.currentUserId = user.id;
    this.partnershipId = partnership.id;
    this.roundKey = this.buildRoundKey();

    this.channel = this.supabaseSvc.createHistoricMemoryChannel(this.partnershipId)
      .on('broadcast', { event: 'memory-selected' }, ({ payload }: { payload: HistoricMemoryRound }) => {
        if (payload?.memory) {
          this.syncRound(payload, false);
        }
      })
      .on('broadcast', { event: 'memory-completed' }, ({ payload }: { payload: { user_id?: string; memory_id?: string } }) => {
        if (payload?.user_id && payload.user_id !== this.currentUserId) {
          this.completed = true;
        }
      })
      .subscribe();

    const roundRes = await this.supabaseSvc.getHistoricMemoryRound(this.partnershipId, this.roundKey);
    if (roundRes.data) {
      this.syncRound(roundRes.data, true);
    } else {
      this.errorMessage = roundRes.error || 'No se pudo cargar un recuerdo para este momento.';
    }

    this.isLoading = false;

    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = setInterval(() => this.tickTimer(), 1000);
    this.tickTimer();
  }

  private buildRoundKey() {
    const now = new Date();
    const roundedBucket = Math.floor(now.getMinutes() / 5);
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${roundedBucket}`;
  }

  private syncRound(round: HistoricMemoryRound, announce: boolean) {
    this.roundKey = round.round_key;
    this.activeMemory = round.memory;
    this.sessionStartedAt = new Date(round.started_at);
    this.sessionEndsAt = new Date(this.sessionStartedAt.getTime() + 5 * 60 * 1000);
    this.completed = false;
    this.tickTimer();

    if (announce && this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'memory-selected',
        payload: round,
      });
    }
  }

  private tickTimer() {
    const remaining = Math.max(0, Math.floor((this.sessionEndsAt.getTime() - Date.now()) / 1000));
    this.remainingSeconds = remaining;

    if (remaining === 0 && !this.completed) {
      this.completed = true;
    }
  }

  get timerProgress() {
    return Math.max(0, Math.min(1, this.remainingSeconds / 300));
  }

  get timerLabel() {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  formatDate(dateValue?: string) {
    if (!dateValue) return 'Fecha no registrada';
    const date = new Date(dateValue);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  async openPreview() {
    if (!this.activeMemory) return;
    this.isPreviewOpen = true;
  }

  closePreview() {
    this.isPreviewOpen = false;
  }

  async completeMemory() {
    if (!this.partnershipId || !this.currentUserId || !this.activeMemory || this.completed) return;

    this.isCompleting = true;
    const res = await this.supabaseSvc.completeHistoricMemoryRound(this.partnershipId, this.activeMemory.id);

    if (res.success) {
      this.completed = true;
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'memory-completed',
          payload: {
            user_id: this.currentUserId,
            memory_id: this.activeMemory.id,
          },
        });
      }

      await this.presentCelebrationToast('Recuerdo completado. +20 Affini Points para la pareja.');
    } else {
      await this.presentCelebrationToast(res.error || 'No se pudo registrar el recuerdo completado.', 'danger');
    }

    this.isCompleting = false;
  }

  private async presentCelebrationToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}