import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonIcon, IonCard, IonCardContent, IonInput, NavController, ToastController
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, volumeMuteOutline, playOutline, pauseOutline, refreshOutline } from 'ionicons/icons';
import { QuickInteractionService, QuickGameSession } from '../../services/quick-interaction.service';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-quick-interaction',
  templateUrl: './quick-interaction.page.html',
  styleUrls: ['./quick-interaction.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
    IonIcon, IonCard, IonCardContent, IonInput
  ]
})
export class QuickInteractionPage implements OnInit, OnDestroy {
  gameSession: QuickGameSession | null = null;
  gameState: 'loading' | 'setup' | 'playing' | 'finished' = 'setup';
  
  // Game state
  currentAnswerText = '';
  timeLeft = 60;
  isTimerRunning = false;
  timerInterval: any = null;
  
  // Player names
  player1Name = 'Tú';
  player2Name = 'Tu Pareja';
  gameStarted = false;

  constructor(
    private quickInteractionSvc: QuickInteractionService,
    private navCtrl: NavController,
    private router: Router,
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      chevronBackOutline, volumeMuteOutline, playOutline, pauseOutline, refreshOutline
    });
  }

  ngOnInit() {
    // Initialize page
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  /**
   * Start a new game
   */
  startGame() {
    this.gameSession = this.quickInteractionSvc.createGameSession(
      this.player1Name,
      this.player2Name,
      3
    );
    this.gameState = 'playing';
    this.gameStarted = true;
    this.timeLeft = 60;
    this.currentAnswerText = '';
    this.startTimer();
  }

  /**
   * Start the countdown timer
   */
  private startTimer() {
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      
      if (this.timeLeft <= 0) {
        this.finishGame();
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
    }
  }

  /**
   * Submit an answer
   */
  async submitAnswer() {
    if (!this.gameSession || !this.currentAnswerText.trim()) {
      return;
    }

    // Ask the users to confirm if the answer is correct
    const alert = await this.alertCtrl.create({
      header: '¿Respuesta correcta?',
      message: `¿La respuesta "${this.currentAnswerText}" es correcta?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            this.recordAndAdvance(false);
          }
        },
        {
          text: 'Sí',
          handler: () => {
            this.recordAndAdvance(true);
          }
        }
      ]
    });

    await alert.present();
  }

  private recordAndAdvance(isCorrect: boolean) {
    if (!this.gameSession) return;

    this.gameSession = this.quickInteractionSvc.recordAnswer(
      this.gameSession,
      this.currentAnswerText,
      isCorrect
    );

    this.currentAnswerText = '';

    if (this.gameSession.currentRound >= this.gameSession.totalRounds) {
      this.finishGame();
    }
  }

  /**
   * Finish the game
   */
  async finishGame() {
    this.stopTimer();
    if (this.gameSession) {
      this.gameSession = this.quickInteractionSvc.endGameSession(this.gameSession);
    }
    this.gameState = 'finished';

    const earnedPoints = this.gameSession?.player1?.score || 0;

    try {
      const result = await this.supabaseSvc.saveActionPoint('quick_interaction', earnedPoints);
      if (result && (result.error)) {
        const t = await this.toastCtrl.create({ message: 'No se pudieron guardar los puntos', duration: 2000, color: 'warning' });
        await t.present();
      } else {
        const t = await this.toastCtrl.create({ message: `Sumaste ${earnedPoints} puntos`, duration: 2000, color: 'success' });
        await t.present();
      }
    } catch (err) {
      const t = await this.toastCtrl.create({ message: 'Error registrando resultado', duration: 2000, color: 'danger' });
      await t.present();
    }

    // Save full game session to historic
    try {
      const gs = await this.supabaseSvc.saveGameSession(this.gameSession);
      if (gs && (gs.error)) {
        const tt = await this.toastCtrl.create({ message: 'No se pudo guardar el histórico de la partida', duration: 2000, color: 'warning' });
        await tt.present();
      }
    } catch (err) {
      const tt = await this.toastCtrl.create({ message: 'Error al guardar histórico', duration: 2000, color: 'warning' });
      await tt.present();
    }

    // Leave the summary screen visible. User can press "Volver" or "Jugar de Nuevo".
  }

  /**
   * Get the winner info
   */
  getWinnerInfo() {
    if (!this.gameSession) return null;
    return this.quickInteractionSvc.getWinner(this.gameSession);
  }

  /**
   * Get the current question
   */
  getCurrentQuestion() {
    if (!this.gameSession || this.gameSession.currentRound >= this.gameSession.questions.length) {
      return null;
    }
    return this.gameSession.questions[this.gameSession.currentRound];
  }

  /**
   * Get the current player
   */
  getCurrentPlayer() {
    if (!this.gameSession) return null;
    const isEvenRound = this.gameSession.currentRound % 2 === 0;
    return isEvenRound ? this.gameSession.player1 : this.gameSession.player2;
  }

  /**
   * Go back to actions
   */
  goBack() {
    this.stopTimer();
    this.navCtrl.navigateForward('/tabs/actions', { animationDirection: 'back' });
  }

  /**
   * Play again
   */
  playAgain() {
    this.gameState = 'setup';
    this.gameSession = null;
    this.gameStarted = false;
    this.currentAnswerText = '';
    this.timeLeft = 60;
  }

  /**
   * Get formatted time
   */
  getFormattedTime(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  /**
   * Get difficulty badge style
   */
  getDifficultyBadgeClass(difficulty: string): string {
    switch (difficulty) {
      case 'easy':
        return 'difficulty-easy';
      case 'medium':
        return 'difficulty-medium';
      case 'hard':
        return 'difficulty-hard';
      default:
        return '';
    }
  }

  /**
   * Get difficulty label
   */
  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Medio';
      case 'hard':
        return 'Difícil';
      default:
        return '';
    }
  }
}
