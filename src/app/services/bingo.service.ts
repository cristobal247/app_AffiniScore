import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Tipos para Bingo
 */
export interface BingoCellTask {
  id: string;
  title: string;
  description?: string;
  points: number;
}

export interface BingoCard {
  id: string;
  title: string;
  cells: BingoCellTask[];
  difficulty: 'Bajo' | 'Medio' | 'Alto';
  created_at?: string;
}

export interface BingoProgress {
  id: string;
  partnership_id: string;
  card_id: string;
  completed_cells: string[];
  points_earned: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * BingoService
 * 
 * Gestiona toda la lógica del minijuego "Bingo de Conexión".
 * 
 * Funcionalidades:
 * - Obtener cartón de bingo
 * - Marcar celdas completadas
 * - Verificar si hay línea ganadora (3 en raya)
 * - Persistir progreso en Supabase
 */
@Injectable({
  providedIn: 'root'
})
export class BingoService {
  // Cartón de bingo por defecto (MVP)
  private readonly DEFAULT_BINGO_CARD: BingoCard = {
    id: 'default-bingo-1',
    title: 'Bingo de Conexión',
    difficulty: 'Medio',
    cells: [
      { id: 'c1', title: 'Besarse', points: 10, description: 'Un beso apasionado' },
      { id: 'c2', title: 'Bailar juntos', points: 15, description: 'Al menos 3 minutos' },
      { id: 'c3', title: 'Reír juntos', points: 10, description: 'Carcajadas genuinas' },
      { id: 'c4', title: 'Abrazo largo', points: 10, description: 'Mínimo 20 segundos' },
      { id: 'c5', title: 'Mirada profunda', points: 15, description: 'Verse a los ojos 1 minuto' },
      { id: 'c6', title: 'Hacer ejercicio', points: 20, description: 'Juntos, 15 minutos' },
      { id: 'c7', title: 'Cocinar juntos', points: 25, description: 'Una comida especial' },
      { id: 'c8', title: 'Salida sorpresa', points: 30, description: 'Planear algo inesperado' },
      { id: 'c9', title: 'Masaje relajante', points: 15, description: 'Mínimo 5 minutos' },
    ]
  };

  constructor(private supabaseClient: SupabaseClientService) {}

  /**
   * Obtiene un cartón de bingo disponible para la pareja.
   * En MVP retorna un cartón hardcodeado.
   * En producción, se obtendría de la BD.
   */
  async getBingoCard(): Promise<{ data: BingoCard | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    return { data: this.DEFAULT_BINGO_CARD, error: null };
  }

  /**
   * Obtiene el progreso actual del usuario en un cartón de bingo.
   * Retorna qué celdas ha completado.
   */
  async getBingoProgress(cardId: string): Promise<{ data: BingoProgress | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const { data: partnership } = await supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { data: null, error: 'No partnership found' };
    }

    return await supabase
      .from('bingo_progress')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('card_id', cardId)
      .single();
  }

  /**
   * Marca una celda del bingo como completada.
   * Guarda el progreso en Supabase.
   */
  async markBingoCellComplete(cardId: string, cellId: string): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const { data: partnership } = await supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (!partnership) {
      return { error: 'No partnership found' };
    }

    // Obtener progreso actual
    const { data: progress } = await supabase
      .from('bingo_progress')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('card_id', cardId)
      .single();

    const completedCells = progress?.completed_cells || [];
    if (!completedCells.includes(cellId)) {
      completedCells.push(cellId);
    }

    const pointsEarned = completedCells.length * 10;

    return await supabase
      .from('bingo_progress')
      .upsert({
        partnership_id: partnership.id,
        card_id: cardId,
        completed_cells: completedCells,
        points_earned: pointsEarned,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'partnership_id,card_id' });
  }

  /**
   * Detecta si hay una línea completa (3 en raya).
   * Retorna true si hay ganador.
   * 
   * Líneas ganadoras:
   * - Horizontales: [0,1,2], [3,4,5], [6,7,8]
   * - Verticales: [0,3,6], [1,4,7], [2,5,8]
   * - Diagonales: [0,4,8], [2,4,6]
   */
  checkBingoWin(completedCells: string[]): boolean {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const cellIndexes: number[] = completedCells.map(cellId => {
      return parseInt(cellId.replace('c', '')) - 1;
    });

    return winningLines.some(line =>
      line.every(index => cellIndexes.includes(index))
    );
  }

  /**
   * Obtiene los puntos totales del bingo completado.
   */
  calculateBingoPoints(completedCells: string[]): number {
    return completedCells.length * 10;
  }
}
