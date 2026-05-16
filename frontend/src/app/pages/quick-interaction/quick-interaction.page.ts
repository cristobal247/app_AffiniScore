import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonProgressBar,
  ToastController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeCircleOutline, checkmarkCircleOutline, playOutline, chevronBackOutline } from 'ionicons/icons';
import { Router, RouterModule } from '@angular/router';
import { QuickInteractionService, QuickGameSession, TriviaQuestion } from '../../services/quick-interaction.service';

@Component({
  selector: 'app-quick-interaction',
  templateUrl: './quick-interaction.page.html',
  styleUrls: ['./quick-interaction.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonProgressBar
  ]
})
export class QuickInteractionPage implements OnInit, OnDestroy {
  gameSession: QuickGameSession | null = null;
  currentQuestion: TriviaQuestion | null = null;
  currentQuestionIndex = 0;
  isGameActive = false;
  isAnswered = false;
  selectedAnswer = '';
  gameStarted = false;
  gameEnded = false;
  player1Score = 0;
  player2Score = 0;
  timeRemaining = 60;
  timerInterval: any = null;

  constructor(
    private quickInteractionSvc: QuickInteractionService,
    private toastCtrl: ToastController,
    private router: Router
  ) {
    addIcons({ closeCircleOutline, checkmarkCircleOutline, playOutline, chevronBackOutline });
  }

  ngOnInit() {
    this.initGame();
  }

  private initGame() {
    this.gameSession = {
      id: `session-${Date.now()}`,
      partnership_id: 'local-demo',
      game_type: 'trivia',
      questions: this.quickInteractionSvc.getRandomQuestions(3),
      current_question_index: 0,
      player1_score: 0,
      player2_score: 0,
      is_active: true,
      started_at: new Date().toISOString()
    };
  }

  async startGame() {
    if (!this.gameSession) {
      await this.showToast('No se pudo preparar la partida', 'danger');
      return;
    }

    this.gameStarted = true;
    this.isGameActive = true;
    this.loadNextQuestion();
    this.startTimer();
    await this.showToast('¡Partida iniciada!', 'success');
  }

  private loadNextQuestion() {
    if (!this.gameSession) {
      return;
    }

    if (this.currentQuestionIndex < this.gameSession.questions.length) {
      this.currentQuestion = this.gameSession.questions[this.currentQuestionIndex];
      this.isAnswered = false;
      this.selectedAnswer = '';
    } else {
      this.endGame();
    }
  }

  async answerQuestion(answer: string) {
    if (this.isAnswered || !this.currentQuestion) {
      return;
    }

    this.selectedAnswer = answer;
    this.isAnswered = true;

    const isCorrect = answer.trim().length > 0;

    if (isCorrect) {
      const points = this.currentQuestion.points;
      if (this.currentQuestionIndex % 2 === 0) {
        this.player1Score += points;
      } else {
        this.player2Score += points;
      }

      await this.showToast(`+${points} puntos 🎯`, 'success');
    } else {
      await this.showToast('Respuesta no válida', 'warning');
    }

    setTimeout(() => {
      this.currentQuestionIndex++;
      this.loadNextQuestion();
    }, 1000);
  }

  skipQuestion() {
    if (!this.isAnswered && this.currentQuestion) {
      this.currentQuestionIndex++;
      this.loadNextQuestion();
    }
  }

  private startTimer() {
    this.timeRemaining = 60;
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.endGame();
      }
    }, 1000);
  }

  private async endGame() {
    this.isGameActive = false;
    this.gameEnded = true;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.player1Score > 0 || this.player2Score > 0) {
      await this.showToast('¡Partida completada! +10 pts 🎉', 'success');
    }
  }

  playAgain() {
    this.gameStarted = false;
    this.gameEnded = false;
    this.player1Score = 0;
    this.player2Score = 0;
    this.currentQuestionIndex = 0;
    this.selectedAnswer = '';
    this.gameSession = null;
    this.currentQuestion = null;
    this.initGame();
  }

  goBack() {
    this.router.navigate(['/tabs/actions']);
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

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get questionProgress(): number {
    if (!this.gameSession) {
      return 0;
    }

    return ((this.currentQuestionIndex + 1) / this.gameSession.questions.length) * 100;
  }

  get timePercentage(): number {
    return (this.timeRemaining / 60) * 100;
  }
}