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
    id: '2f2d2d7e-6c9a-4cc4-bdc8-2f0fb13b9d01',
    title: 'Bingo de Conexión',
    difficulty: 'Medio',
    cells: [
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a01', title: 'Besarse', points: 10, description: 'Un beso apasionado' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a02', title: 'Bailar juntos', points: 15, description: 'Al menos 3 minutos' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a03', title: 'Reír juntos', points: 10, description: 'Carcajadas genuinas' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a04', title: 'Abrazo largo', points: 10, description: 'Mínimo 20 segundos' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a05', title: 'Mirada profunda', points: 15, description: 'Verse a los ojos 1 minuto' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a06', title: 'Hacer ejercicio', points: 20, description: 'Juntos, 15 minutos' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a07', title: 'Cocinar juntos', points: 25, description: 'Una comida especial' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a08', title: 'Salida sorpresa', points: 30, description: 'Planear algo inesperado' },
      { id: '0f6f4e24-6d2d-4f2d-8f23-3b1a9d5e1a09', title: 'Masaje relajante', points: 15, description: 'Mínimo 5 minutos' }
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

    try {
      // Ensure the 9 cells exist in the activity_catalog table
      const cellsToInsert = this.defaultBingoCard.cells.map(cell => ({
        id: cell.id,
        name: `Bingo: ${cell.title}`,
        category: 'BINGO',
        default_points: cell.points,
        activity_type: 'CHALLENGE',
        description: cell.description || ''
      }));

      await this.supabase
        .from('activity_catalog')
        .upsert(cellsToInsert, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not upsert bingo cells to catalog:', e);
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
      .select('*')
      .or(`user1_id.eq.${user.user.id},user2_id.eq.${user.user.id}`)
      .eq('status', 'active')
      .single();

    const ownerIds = partnership
      ? [partnership.user1_id, partnership.user2_id]
      : [user.user.id];

    // Query all logs in user_actions_log for this card
    const { data: logs, error: logsError } = await this.supabase
      .from('user_actions_log')
      .select('action_id, points_earned')
      .in('user_id', ownerIds)
      .eq('status', 'CONFIRMED')
      .in('action_id', this.defaultBingoCard.cells.map(cell => cell.id));

    if (logsError) {
      return { data: null, error: logsError };
    }

    const completedCells = (logs || []).map(log => String(log.action_id));
    const pointsEarned = (logs || []).reduce((sum, log) => sum + (log.points_earned || 0), 0);

    const progress: BingoProgress = {
      id: partnership ? `progress-${partnership.id}-${cardId}` : `progress-solo-${user.user.id}-${cardId}`,
      partnership_id: partnership ? partnership.id : user.user.id,
      card_id: cardId,
      completed_cells: completedCells,
      points_earned: pointsEarned
    };

    return { data: progress, error: null };
  }

  async markBingoCellComplete(cardId: string, cellId: string): Promise<{ error: any }> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return { error: 'Usuario no autenticado' };
    }

    const { data: partnership } = await this.supabase
      .from('partnerships')
      .select('*')
      .or(`user1_id.eq.${user.user.id},user2_id.eq.${user.user.id}`)
      .eq('status', 'active')
      .single();

    const partnerIds = partnership
      ? [partnership.user1_id, partnership.user2_id]
      : [user.user.id];
    const actionId = cellId;

    // Check if cell is already completed
    const { data: existingLogs } = await this.supabase
      .from('user_actions_log')
      .select('*')
      .in('user_id', partnerIds)
      .eq('action_id', actionId)
      .eq('status', 'CONFIRMED');

    const cellTask = this.defaultBingoCard.cells.find(c => c.id === cellId);
    const points = cellTask ? cellTask.points : 10;

    if (existingLogs && existingLogs.length > 0) {
      // Toggle off: Delete existing log
      const logToDelete = existingLogs[0];
      const { error: deleteError } = await this.supabase
        .from('user_actions_log')
        .delete()
        .eq('id', logToDelete.id);

      if (deleteError) return { error: deleteError };

      // Subtract points from the profile of the user who registered it
      const { data: ownerProfile } = await this.supabase
        .from('profiles')
        .select('total_points')
        .eq('id', logToDelete.user_id)
        .single();

      const currentPoints = ownerProfile?.total_points || 0;
      const newTotal = Math.max(0, currentPoints - points);

      await this.supabase
        .from('profiles')
        .update({ total_points: newTotal, updated_at: new Date() })
        .eq('id', logToDelete.user_id);

      this.supabaseSvc.pointsUpdated.next();
      return { error: null };
    } else {
      // Toggle on: Create new log
      // Build payload conditionally to avoid sending partnership_id when the
      // column is not present in the DB schema cache.
      const payload: any = {
        user_id: user.user.id,
        action_id: actionId,
        points_earned: points,
        status: 'CONFIRMED'
      };
      if (partnership) {
        payload.partnership_id = partnership.id;
      }

      const { data: insertedLog, error: insertError } = await this.supabase
        .from('user_actions_log')
        .insert(payload)
        .select()
        .single();

      if (insertError) return { error: insertError };

      // Add points to the current user's profile
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('total_points')
        .eq('id', user.user.id)
        .single();

      const currentPoints = profile?.total_points || 0;
      const newTotal = currentPoints + points;

      await this.supabase
        .from('profiles')
        .update({ total_points: newTotal, updated_at: new Date() })
        .eq('id', user.user.id);

      this.supabaseSvc.pointsUpdated.next();
      return { error: null };
    }
  }

  checkBingoWin(completedCells: string[]): boolean {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const cellIndexes = completedCells
      .map(cellId => this.defaultBingoCard.cells.findIndex(cell => cell.id === cellId))
      .filter(index => index >= 0);

    return winningLines.some(line => line.every(index => cellIndexes.includes(index)));
  }

  calculateBingoPoints(completedCells: string[]): number {
    return completedCells.length * 10;
  }
}
