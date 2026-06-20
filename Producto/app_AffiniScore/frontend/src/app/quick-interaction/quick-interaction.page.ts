import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonCard, IonCardContent, IonCardHeader, IonProgressBar, ToastController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeCircleOutline, checkmarkCircleOutline, playOutline, chevronBackOutline, alertCircleOutline, hourglassOutline } from 'ionicons/icons';
import { Router, RouterModule } from '@angular/router';
import { QuickInteractionService } from './quick-interaction.service';
import { SupabaseService } from '../services/supabase';

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
  activeSession: any = null;
  myUserNumber: 1 | 2 = 1;
  currentQuestionText = '';
  answerSubmitted = false;
  waitingForPartner = false;
  revealResults = false;
  isCorrectResult = false;
  
  myAnswer = '';
  partnerAnswer = '';
  selectedAnswer = '';
  
  myName = 'Usuario 1';
  partnerName = 'Usuario 2';
  myUserId = '';
  partnerUserId = '';
  partnershipId = '';

  isGameActive = false;
  gameStarted = false;
  gameEnded = false;
  pointsAwarded = false;

  timeRemaining = 60;
  timerInterval: any = null;
  private channel: any = null;
  private globalChannel: any = null;

  constructor(
    private quickInteractionSvc: QuickInteractionService,
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ closeCircleOutline, checkmarkCircleOutline, playOutline, chevronBackOutline, alertCircleOutline, hourglassOutline });
  }

  async ngOnInit() {
    await this.initGame();
  }

  async initGame() {
    try {
      const user = await this.supabaseSvc.getCurrentUser();
      if (!user) return;
      this.myUserId = user.id;

      const partnership = await this.supabaseSvc.getActivePartnership();
      if (!partnership) {
        await this.showToast('Debes estar vinculado con tu pareja para jugar la trivia.', 'warning');
        this.goBack();
        return;
      }

      this.partnershipId = partnership.id;

      // Cargar nombres de perfiles
      const { data: profile } = await this.supabaseSvc.getUserProfile(true);
      if (profile) {
        this.myName = profile.full_name || 'Tú';
      }

      const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
      this.partnerUserId = partnerId;

      const { data: partnerProfile } = await this.supabaseSvc.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', partnerId)
        .single();
      
      if (partnerProfile) {
        this.partnerName = partnerProfile.full_name || 'Pareja';
      }

      // Buscar si ya hay una sesión activa para esta pareja
      const { data: session } = await this.quickInteractionSvc.getActiveTriviaSession(this.partnershipId);
      if (session) {
        this.activeSession = session;
        this.myUserNumber = session.user1_id === this.myUserId ? 1 : 2;
        this.currentQuestionText = session.question;
        this.gameStarted = true;

        // Si la sesión está en 'waiting' y soy el usuario 2, la activo
        if (session.status === 'waiting' && this.myUserNumber === 2) {
          await this.supabaseSvc.supabase
            .from('trivia_sessions')
            .update({ status: 'active' })
            .eq('id', session.id);
          this.activeSession.status = 'active';
        }

        this.isGameActive = this.activeSession.status === 'active';

        const myStatus = this.myUserNumber === 1 ? session.user1_status : session.user2_status;
        const partnerStatus = this.myUserNumber === 1 ? session.user2_status : session.user1_status;

        if (myStatus === 'answered' || myStatus === 'revealed') {
          this.answerSubmitted = true;
          this.waitingForPartner = partnerStatus === 'pending';
        }

        const bothAnswered = session.user1_status !== 'pending' && session.user2_status !== 'pending';
        if (bothAnswered) {
          this.revealAnswers();
        } else if (this.isGameActive) {
          this.startTimer();
          this.subscribeToSession(session.id);
        } else {
          // Esperar en estado waiting a que el otro se una
          this.subscribeToSession(session.id);
        }
      }

      // Suscribirse a la creación de nuevas sesiones por si la pareja inicia el juego mientras estoy en el menú/intro
      this.subscribeToGlobalSessionEvents();
    } catch (e) {
      console.error('Error initializing trivia game:', e);
    }
  }

  async subscribeToGlobalSessionEvents() {
    if (!this.partnershipId || this.globalChannel) return;
    
    this.globalChannel = this.supabaseSvc.supabase
      .channel('trivia-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trivia_sessions' },
        async (payload: any) => {
          const newSession = payload.new;
          if (newSession && newSession.partnership_id === this.partnershipId && newSession.status === 'waiting') {
            console.log('Detected new trivia session created by partner, joining...');
            await this.initGame();
          }
        }
      )
      .subscribe();
  }

  async startGame() {
    if (!this.partnershipId) {
      await this.showToast('Cargando datos de pareja, por favor espera...', 'warning');
      return;
    }

    // Antes de crear una nueva sesión, verificar si la pareja ya creó una activa
    const { data: existingSession } = await this.quickInteractionSvc.getActiveTriviaSession(this.partnershipId);
    if (existingSession) {
      this.activeSession = existingSession;
      this.myUserNumber = existingSession.user1_id === this.myUserId ? 1 : 2;
      this.currentQuestionText = existingSession.question;
      this.gameStarted = true;
      
      // Activar la sesión ya que ahora estamos ambos
      await this.supabaseSvc.supabase
        .from('trivia_sessions')
        .update({ status: 'active' })
        .eq('id', existingSession.id);
      this.activeSession.status = 'active';
      this.isGameActive = true;
      
      this.startTimer();
      this.subscribeToSession(existingSession.id);
      await this.showToast('¡Unido a la trivia de tu pareja!', 'success');
      return;
    }

    // Generar pregunta dirigida con nombres
    const question = this.quickInteractionSvc.generateCustomQuestion(this.myName, this.partnerName);

    // Crear sesión en base de datos en estado 'waiting'
    const { data: session, error } = await this.quickInteractionSvc.createTriviaSession(
      this.partnershipId,
      question,
      this.myUserId,
      this.partnerUserId
    );

    if (error || !session) {
      await this.showToast('No se pudo iniciar la sesión de trivia en la base de datos.', 'danger');
      return;
    }

    this.activeSession = session;
    this.myUserNumber = 1;
    this.currentQuestionText = question;
    this.gameStarted = true;
    this.isGameActive = false; // No activo hasta que se una el otro
    
    this.subscribeToSession(session.id);
    await this.showToast('Esperando a que tu pareja ingrese a la trivia...', 'success');
  }

  subscribeToSession(sessionId: string) {
    this.unsubscribeSession();
    this.channel = this.supabaseSvc.supabase
      .channel(`trivia-session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trivia_sessions' },
        async (payload: any) => {
          if (payload.new && payload.new.id === sessionId) {
            console.log('Trivia session update event received. Fetching latest state from DB...');
            const { data: latestSession } = await this.supabaseSvc.supabase
              .from('trivia_sessions')
              .select('*')
              .eq('id', sessionId)
              .single();

            if (latestSession) {
              console.log('Fresh trivia session state:', latestSession);
              
              // Si el estado pasó a active y antes no lo estaba, arrancar temporizador
              if (this.activeSession && this.activeSession.status === 'waiting' && latestSession.status === 'active') {
                this.isGameActive = true;
                this.startTimer();
                await this.showToast('¡Tu pareja se ha unido! Comienza el tiempo.', 'success');
              }

              this.activeSession = latestSession;
              
              const myStatus = this.myUserNumber === 1 ? latestSession.user1_status : latestSession.user2_status;
              const partnerStatus = this.myUserNumber === 1 ? latestSession.user2_status : latestSession.user1_status;

              if (myStatus === 'answered' || myStatus === 'revealed') {
                this.answerSubmitted = true;
                this.waitingForPartner = partnerStatus === 'pending';
              }

              const bothAnswered = latestSession.user1_status !== 'pending' && latestSession.user2_status !== 'pending';
              if (bothAnswered) {
                this.revealAnswers();
              }
              this.cdr.detectChanges();
            }
          }
        }
      )
      .subscribe();
  }

  unsubscribeSession() {
    if (this.channel) {
      this.supabaseSvc.supabase.removeChannel(this.channel)
        .then(() => {
          this.channel = null;
        })
        .catch((err: any) => console.warn('Error removing trivia channel:', err));
    }
    if (this.globalChannel) {
      this.supabaseSvc.supabase.removeChannel(this.globalChannel)
        .then(() => {
          this.globalChannel = null;
        })
        .catch((err: any) => console.warn('Error removing global trivia channel:', err));
    }
  }

  async abandonTrivia() {
    if (this.activeSession) {
      await this.quickInteractionSvc.finishTriviaSession(this.activeSession.id);
    }
    this.unsubscribeSession();
    this.goBack();
  }

  async answerQuestion(answer: string) {
    if (this.answerSubmitted || !this.activeSession) return;

    this.answerSubmitted = true;
    this.myAnswer = answer;

    const { error } = await this.quickInteractionSvc.submitTriviaAnswer(this.activeSession.id, this.myUserNumber, answer);
    if (error) {
      this.answerSubmitted = false;
      await this.showToast('No se pudo enviar tu respuesta. Inténtalo de nuevo.', 'danger');
      return;
    }

    await this.showToast('Respuesta confirmada, esperando a tu pareja...', 'success');
    this.waitingForPartner = true;

    // Al confirmar, forzar refresco local inmediato consultando la BD
    const { data: latestSession } = await this.supabaseSvc.supabase
      .from('trivia_sessions')
      .select('*')
      .eq('id', this.activeSession.id)
      .single();

    if (latestSession) {
      this.activeSession = latestSession;
      const bothAnswered = latestSession.user1_status !== 'pending' && latestSession.user2_status !== 'pending';
      if (bothAnswered) {
        this.revealAnswers();
      }
    }
  }

  async revealAnswers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.revealResults = true;
    this.gameEnded = true;
    this.isGameActive = false;

    this.myAnswer = this.myUserNumber === 1 ? this.activeSession.user1_answer : this.activeSession.user2_answer;
    this.partnerAnswer = this.myUserNumber === 1 ? this.activeSession.user2_answer : this.activeSession.user1_answer;

    // Comparar respuestas ignorando mayúsculas, espacios extremos y acentos
    this.isCorrectResult = this.checkAnswersMatch(this.activeSession.user1_answer || '', this.activeSession.user2_answer || '');

    const myStatus = this.myUserNumber === 1 ? this.activeSession.user1_status : this.activeSession.user2_status;

    // Solo otorgar puntos si mi estado en la base de datos es 'answered' (aún no revelado)
    if (myStatus === 'answered') {
      const updates: any = {};
      if (this.myUserNumber === 1) {
        updates.user1_status = 'revealed';
      } else {
        updates.user2_status = 'revealed';
      }

      this.activeSession.user1_status = this.myUserNumber === 1 ? 'revealed' : this.activeSession.user1_status;
      this.activeSession.user2_status = this.myUserNumber === 2 ? 'revealed' : this.activeSession.user2_status;

      // Si ambos están en 'revealed', terminar la sesión
      if (this.activeSession.user1_status === 'revealed' && this.activeSession.user2_status === 'revealed') {
        updates.status = 'finished';
      }

      await this.supabaseSvc.supabase
        .from('trivia_sessions')
        .update(updates)
        .eq('id', this.activeSession.id);

      // Otorgar puntos si la respuesta es correcta
      if (this.isCorrectResult) {
        if (!this.pointsAwarded) {
          this.pointsAwarded = true;
          const res = await this.quickInteractionSvc.awardTriviaPoints(this.partnershipId);
          if (!res.error) {
            this.showToast('¡Respuestas coincidentes! +10 puntos obtenidos 🎯', 'success');
          }
        }
      } else {
        this.showToast('Las respuestas no coincidieron. ¡Buen intento!', 'warning');
      }
    }

    this.cdr.detectChanges();
  }

  checkAnswersMatch(ans1: string, ans2: string): boolean {
    const clean = (s: string) => s.toLowerCase().trim().replace(/[áéíóúü]/g, (match) => {
      const map: any = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u' };
      return map[match] || match;
    }).replace(/[^a-z0-9]/g, '');

    return clean(ans1) === clean(ans2);
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timeRemaining = 60;
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        if (!this.answerSubmitted) {
          this.answerQuestion('(sin tiempo)');
        } else {
          // Si yo ya respondí pero mi pareja no y se acabó el tiempo total, forzar revelación
          this.revealAnswers();
        }
      }
    }, 1000);
  }

  async playAgain() {
    // Terminar sesión actual en base de datos para crear una nueva
    if (this.activeSession) {
      await this.quickInteractionSvc.finishTriviaSession(this.activeSession.id);
    }
    
    this.unsubscribeSession();
    this.gameStarted = false;
    this.gameEnded = false;
    this.answerSubmitted = false;
    this.waitingForPartner = false;
    this.revealResults = false;
    this.isCorrectResult = false;
    this.pointsAwarded = false;
    this.selectedAnswer = '';
    this.myAnswer = '';
    this.partnerAnswer = '';
    this.activeSession = null;
    await this.initGame();
  }

  goBack() {
    this.router.navigate(['/tabs/actions']);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.unsubscribeSession();
  }

  get timePercentage(): number {
    return (this.timeRemaining / 60) * 100;
  }
}
