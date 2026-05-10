import { Injectable } from '@angular/core';

export interface TriviaQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface GameRound {
  questionIndex: number;
  question: TriviaQuestion;
  currentPlayer: 'player1' | 'player2';
  answered: boolean;
  answerText?: string;
  isCorrect?: boolean;
  timeLeft?: number;
}

export interface QuickGameSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  player1: {
    name: string;
    score: number;
    correctAnswers: number;
  };
  player2: {
    name: string;
    score: number;
    correctAnswers: number;
  };
  currentRound: number;
  totalRounds: number;
  questions: TriviaQuestion[];
  rounds?: GameRound[];
  gameState: 'playing' | 'paused' | 'finished';
}

@Injectable({
  providedIn: 'root'
})
export class QuickInteractionService {
  private readonly TRIVIA_POOL: TriviaQuestion[] = [
    // Easy (1 point)
    {
      id: '1',
      question: '¿Cuál es el color favorito de tu pareja?',
      category: 'personal',
      difficulty: 'easy',
      points: 10
    },
    {
      id: '2',
      question: '¿Cuál es el género de música favorito de tu pareja?',
      category: 'personal',
      difficulty: 'easy',
      points: 10
    },
    {
      id: '3',
      question: '¿Cuál es la comida favorita de tu pareja?',
      category: 'personal',
      difficulty: 'easy',
      points: 10
    },
    {
      id: '4',
      question: '¿Cuál es la película favorita de tu pareja?',
      category: 'personal',
      difficulty: 'easy',
      points: 10
    },
    {
      id: '5',
      question: '¿Cuál es el hobby favorito de tu pareja?',
      category: 'personal',
      difficulty: 'easy',
      points: 10
    },
    
    // Medium (2 points)
    {
      id: '6',
      question: '¿Cuál es el lugar más romántico que visitar según tu pareja?',
      category: 'preferences',
      difficulty: 'medium',
      points: 15
    },
    {
      id: '7',
      question: '¿Cuál es la primera cosa que notaste de tu pareja?',
      category: 'relationship',
      difficulty: 'medium',
      points: 15
    },
    {
      id: '8',
      question: '¿Cuál es el mejor momento del día para tu pareja?',
      category: 'personal',
      difficulty: 'medium',
      points: 15
    },
    {
      id: '9',
      question: '¿Cuál es el sueño o meta que tiene tu pareja?',
      category: 'dreams',
      difficulty: 'medium',
      points: 15
    },
    {
      id: '10',
      question: '¿Cuál es el aspecto que más ama tu pareja de ti?',
      category: 'relationship',
      difficulty: 'medium',
      points: 15
    },

    // Hard (3 points)
    {
      id: '11',
      question: '¿Cuál es la mayor inseguridad o preocupación que tu pareja ha compartido?',
      category: 'intimate',
      difficulty: 'hard',
      points: 20
    },
    {
      id: '12',
      question: '¿Cuál es la lección más importante que ha aprendido tu pareja contigo?',
      category: 'relationship',
      difficulty: 'hard',
      points: 20
    },
    {
      id: '13',
      question: '¿Cuál fue el momento más difícil que enfrentaron juntos?',
      category: 'intimate',
      difficulty: 'hard',
      points: 20
    },
    {
      id: '14',
      question: '¿Cuál es el futuro que imaginan juntos en 5 años?',
      category: 'dreams',
      difficulty: 'hard',
      points: 20
    },
    {
      id: '15',
      question: '¿Cuál es la cosa más significativa que tu pareja ha hecho por ti?',
      category: 'relationship',
      difficulty: 'hard',
      points: 20
    }
  ];

  constructor() {}

  /**
   * Get random questions from the pool
   */
  getRandomQuestions(count: number = 3): TriviaQuestion[] {
    const shuffled = [...this.TRIVIA_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Create a new game session
   */
  createGameSession(
    player1Name: string = 'Jugador 1',
    player2Name: string = 'Jugador 2',
    roundCount: number = 3
  ): QuickGameSession {
    const questions = this.getRandomQuestions(roundCount);
    
    return {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      player1: {
        name: player1Name,
        score: 0,
        correctAnswers: 0
      },
      player2: {
        name: player2Name,
        score: 0,
        correctAnswers: 0
      },
      currentRound: 0,
      totalRounds: roundCount,
      questions: questions,
      rounds: [],
      gameState: 'playing'
    };
  }

  /**
   * Record an answer in the game session
   */
  recordAnswer(
    session: QuickGameSession,
    answerText: string,
    isCorrect: boolean = true
  ): QuickGameSession {
    if (session.currentRound < session.questions.length) {
      const qIndex = session.currentRound;
      const currentPlayer = session.currentRound % 2 === 0 ? 'player1' : 'player2';
      const question = session.questions[qIndex];
      const points = question.points;

      // store round info
      const round: GameRound = {
        questionIndex: qIndex,
        question: question,
        currentPlayer: currentPlayer,
        answered: true,
        answerText: answerText,
        isCorrect: isCorrect
      };

      session.rounds = session.rounds || [];
      session.rounds.push(round);

      if (isCorrect) {
        session[currentPlayer].score += points;
        session[currentPlayer].correctAnswers += 1;
      }

      session.currentRound += 1;
    }

    return session;
  }

  /**
   * End the game session
   */
  endGameSession(session: QuickGameSession): QuickGameSession {
    session.endTime = new Date();
    session.gameState = 'finished';
    return session;
  }

  /**
   * Get the winner
   */
  getWinner(session: QuickGameSession): {
    winner: 'player1' | 'player2' | 'tie';
    player1Score: number;
    player2Score: number;
  } {
    const p1Score = session.player1.score;
    const p2Score = session.player2.score;

    return {
      winner: p1Score > p2Score ? 'player1' : p2Score > p1Score ? 'player2' : 'tie',
      player1Score: p1Score,
      player2Score: p2Score
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
