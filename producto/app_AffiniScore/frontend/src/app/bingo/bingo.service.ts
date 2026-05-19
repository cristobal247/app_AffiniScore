import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase';

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

@Injectable({
  providedIn: 'root'
})
export class BingoService {
  private readonly defaultBingoCard: BingoCard = {
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
      { id: 'c9', title: 'Masaje relajante', points: 15, description: 'Mínimo 5 minutos' }
    ]
  };

  constructor(private supabaseSvc: SupabaseService) {}

  private get supabase() {
    return this.supabaseSvc.supabase;
  }

  async getBingoCard(): Promise<{ data: BingoCard | null; error: any }> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    return { data: this.defaultBingoCard, error: null };
  }

  async getBingoProgress(cardId: string): Promise<{ data: BingoProgress | null; error: any }> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.user.id},user2_id.eq.${user.user.id}`)
      .eq('status', 'active')
      .single();

    if (!partnership) {
      return { data: null, error: 'No partnership found' };
    }

    return await this.supabase
      .from('bingo_progress')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('card_id', cardId)
      .single();
  }

  async markBingoCellComplete(cardId: string, cellId: string): Promise<{ error: any }> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return { error: 'Usuario no autenticado' };
    }

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('id')
      .or(`user1_id.eq.${user.user.id},user2_id.eq.${user.user.id}`)
      .eq('status', 'active')
      .single();

    if (!partnership) {
      return { error: 'No partnership found' };
    }

    const { data: progress } = await this.supabase
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

    return await this.supabase
      .from('bingo_progress')
      .upsert(
        {
          partnership_id: partnership.id,
          card_id: cardId,
          completed_cells: completedCells,
          points_earned: pointsEarned,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'partnership_id,card_id' }
      );
  }

  checkBingoWin(completedCells: string[]): boolean {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const cellIndexes = completedCells.map(cellId => parseInt(cellId.replace('c', ''), 10) - 1);
    return winningLines.some(line => line.every(index => cellIndexes.includes(index)));
  }

  calculateBingoPoints(completedCells: string[]): number {
    return completedCells.length * 10;
  }
}
