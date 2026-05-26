import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase';

export interface TriviaQuestion {
  id: string;
  question: string;
  category: 'preference' | 'memory' | 'personality' | 'relationship';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface QuickGameSession {
  id: string;
  partnership_id: string;
  game_type: 'trivia';
  questions: TriviaQuestion[];
  current_question_index: number;
  player1_score: number;
  player2_score: number;
  is_active: boolean;
  started_at: string;
  ended_at?: string;
  created_at?: string;
}

export interface GameRound {
  question: TriviaQuestion;
  player1_answer?: string;
  player2_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  points_awarded?: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuickInteractionService {
  private readonly TRIVIA_POOL: TriviaQuestion[] = [
    { id: 'q1', question: '¿Cuál es mi color favorito?', category: 'preference', difficulty: 'easy', points: 10 },
    { id: 'q2', question: '¿Cuál es mi película favorita?', category: 'preference', difficulty: 'easy', points: 10 },
    { id: 'q3', question: '¿Cuál es mi comida favorita?', category: 'preference', difficulty: 'easy', points: 10 },
    { id: 'q4', question: '¿Cuál es mi música favorita?', category: 'preference', difficulty: 'easy', points: 10 },
    { id: 'q5', question: '¿Cuál es mi deporte favorito?', category: 'preference', difficulty: 'easy', points: 10 },
    { id: 'q6', question: '¿Dónde nos conocimos?', category: 'memory', difficulty: 'easy', points: 10 },
    { id: 'q7', question: '¿Cuál fue nuestro primer viaje juntos?', category: 'memory', difficulty: 'medium', points: 15 },
    { id: 'q8', question: '¿Cuál es la fecha de nuestro aniversario?', category: 'memory', difficulty: 'medium', points: 15 },
    { id: 'q9', question: '¿Qué regalo me diste en mi último cumpleaños?', category: 'memory', difficulty: 'hard', points: 20 },
    { id: 'q10', question: '¿Cuál es mi mayor sueño?', category: 'personality', difficulty: 'hard', points: 20 },
    { id: 'q11', question: '¿Cuál es mi mayor miedo?', category: 'personality', difficulty: 'hard', points: 20 },
    { id: 'q12', question: '¿Cuál es mi cualidad que más te gusta?', category: 'personality', difficulty: 'medium', points: 15 },
    { id: 'q13', question: '¿Qué es lo que más amas de nuestra relación?', category: 'relationship', difficulty: 'hard', points: 20 },
    { id: 'q14', question: '¿Cuál fue el momento más romántico que hemos compartido?', category: 'relationship', difficulty: 'hard', points: 20 },
    { id: 'q15', question: '¿Qué te gustaría mejorar de nuestra relación?', category: 'relationship', difficulty: 'hard', points: 20 }
  ];

  constructor(private supabaseSvc: SupabaseService) {}

  private async ensureCatalogEntry() {
    try {
      await this.supabaseSvc.supabase.from('activity_catalog').upsert([
        {
          id: 'quick-interaction-trivia',
          name: 'Quick Interaction: ¿Dónde estábamos?',
          category: 'RETO_INTERACCION',
          default_points: 10,
          activity_type: 'CHALLENGE',
          description: 'Juego rápido de memoria y conversación para la pareja.'
        }
      ], { onConflict: 'id' });
    } catch (error) {
      console.warn('No se pudo registrar el catálogo del juego rápido:', error);
    }
  }

  getRandomQuestions(count: number = 3): TriviaQuestion[] {
    const shuffled = [...this.TRIVIA_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  getQuestion(questionId: string): TriviaQuestion | undefined {
    return this.TRIVIA_POOL.find(question => question.id === questionId);
  }

  getQuestionsByCategory(category: string): TriviaQuestion[] {
    return this.TRIVIA_POOL.filter(question => question.category === category);
  }

  async createGameSession(partnershipId: string, gameType: 'trivia' = 'trivia'): Promise<{ data: QuickGameSession | null; error: any }> {
    await this.ensureCatalogEntry();

    const questions = this.getRandomQuestions(3);

    const session: QuickGameSession = {
      id: `session-${Date.now()}`,
      partnership_id: partnershipId,
      game_type: gameType,
      questions,
      current_question_index: 0,
      player1_score: 0,
      player2_score: 0,
      is_active: true,
      started_at: new Date().toISOString()
    };

    return { data: session, error: null };
  }

  async recordAnswer(
    sessionId: string,
    playerNumber: 1 | 2,
    questionIndex: number,
    answer: string,
    isCorrect: boolean,
    pointsAwarded: number = 10
  ): Promise<{ error: any }> {
    return { error: null };
  }

  async endGameSession(sessionId: string): Promise<{ error: any }> {
    await this.ensureCatalogEntry();
    const { error } = await this.supabaseSvc.saveActionPoint('quick-interaction-trivia', 10);
    return { error };
  }
}
