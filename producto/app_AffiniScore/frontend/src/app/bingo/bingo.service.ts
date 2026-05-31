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

export interface BingoBonusAward {
  type: 'line' | 'full_card';
  points: number;
  message: string;
  lineIndex?: number;
}

interface BingoBonusState {
  awardedLineIndices: number[];
  fullCardAwarded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BingoService {
  private readonly bingoLineBonusPoints = 25;
  private readonly bingoFullCardBonusPoints = 50;
  private readonly bingoWinningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

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

    const uniqueLogs = Array.from(
      new Map((logs || []).map(log => [String(log.action_id), log])).values()
    );

    const completedCells = uniqueLogs.map(log => String(log.action_id));
    const pointsEarned = uniqueLogs.reduce((sum, log) => sum + (log.points_earned || 0), 0);
    const { data: profile } = await this.getCurrentProfile();
    const bonusKey = partnership ? partnership.id : user.user.id;

    const progress: BingoProgress = {
      id: partnership ? `progress-${partnership.id}-${cardId}` : `progress-solo-${user.user.id}-${cardId}`,
      partnership_id: partnership ? partnership.id : user.user.id,
      card_id: cardId,
      completed_cells: completedCells,
      points_earned: pointsEarned + this.getPersistedBingoBonusPoints(profile?.preferences, bonusKey)
    };

    return { data: progress, error: null };
  }

  async markBingoCellComplete(cardId: string, cellId: string): Promise<{ error: any; completed?: string[]; pointsEarned?: number; fullCard?: boolean; newCard?: BingoCard; bonusAwards?: BingoBonusAward[] }> {
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
      // Once a bingo cell is completed by the partnership or user, do NOT allow
      // it to be toggled off to avoid cheating. Return a specific error so the
      // UI can inform the user and keep the cell locked.
      return { error: { code: 'ALREADY_COMPLETED', message: 'La casilla ya fue completada y no puede desactivarse.' } };
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

      // After inserting, compute updated completed cells and detect full-card
      const { data: progressData } = await this.getBingoProgress(cardId);
      const completed = progressData?.completed_cells || [];
      const bonusContext = await this.getBingoBonusContext(partnership ? partnership.id : user.user.id);
      const lineAwards = this.getNewLineAwards(completed, bonusContext.state.awardedLineIndices);
      const shouldAwardFullCard = completed.length >= (this.defaultBingoCard.cells?.length || 9) && !bonusContext.state.fullCardAwarded;
      const bonusAwards: BingoBonusAward[] = [
        ...lineAwards.map((lineIndex) => ({
          type: 'line' as const,
          points: this.bingoLineBonusPoints,
          lineIndex,
          message: `¡Línea completada! +${this.bingoLineBonusPoints} puntos extra.`
        })),
        ...(shouldAwardFullCard ? [{
          type: 'full_card' as const,
          points: this.bingoFullCardBonusPoints,
          message: `¡Cartón completo! +${this.bingoFullCardBonusPoints} puntos extra.`
        }] : [])
      ];

      const bonusPoints = bonusAwards.reduce((sum, bonus) => sum + bonus.points, 0);
      const pointsEarned = (progressData?.points_earned || 0) + bonusPoints;

      const currentPoints = bonusContext.profile?.total_points || 0;
      const newTotal = currentPoints + points + bonusPoints;

      if (bonusAwards.length > 0) {
        await this.recordBingoBonusLedger(
          partnership ? partnership.id : null,
          user.user.id,
          cellId,
          bonusAwards
        );
      }

      await this.supabase
        .from('profiles')
        .update({ total_points: newTotal, updated_at: new Date() })
        .eq('id', user.user.id);

      if (bonusAwards.length > 0) {
        const nextState: BingoBonusState = {
          awardedLineIndices: Array.from(new Set([...bonusContext.state.awardedLineIndices, ...lineAwards])),
          fullCardAwarded: bonusContext.state.fullCardAwarded || shouldAwardFullCard
        };
        await this.saveBingoBonusState(partnership ? partnership.id : user.user.id, nextState);
      }

      this.supabaseSvc.pointsUpdated.next();

      const fullCard = completed.length >= (this.defaultBingoCard.cells?.length || 9);

      if (fullCard) {
        // Reset the bingo state so the next round starts from zero completed cells.
        try {
          if (shouldAwardFullCard) {
            this.supabaseSvc.pointsUpdated.next();
          }
          const newCard = await this.generateNewCard();
          return { error: null, completed, pointsEarned, fullCard: true, newCard, bonusAwards };
        } catch (e) {
          return { error: null, completed, pointsEarned, fullCard: true, bonusAwards };
        }
      }

      return { error: null, completed, pointsEarned, bonusAwards };
    }
  }

  // Reset the bingo state and return the base card again.
  // This clears confirmed bingo logs so the next round does not inherit old progress.
  async generateNewCard(): Promise<BingoCard> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return this.defaultBingoCard;
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

    const bingoIds = this.defaultBingoCard.cells.map(cell => cell.id);

    const { data: completedLogs } = await this.supabase
      .from('user_actions_log')
      .select('id')
      .in('user_id', ownerIds)
      .eq('status', 'CONFIRMED')
      .in('action_id', bingoIds);

    if (completedLogs && completedLogs.length > 0) {
      const logIds = completedLogs.map(log => log.id);
      const { error: resetError } = await this.supabase
        .from('user_actions_log')
        .update({ status: 'REJECTED' })
        .in('id', logIds);

      if (resetError) {
        throw resetError;
      }
    }

    await this.clearBingoBonusState(partnership ? partnership.id : user.user.id);

    const newCard: BingoCard = {
      ...this.defaultBingoCard,
      title: this.defaultBingoCard.title + ' (reiniciado)',
      difficulty: this.defaultBingoCard.difficulty,
      created_at: new Date().toISOString()
    };

    // Re-ensure the catalog rows exist for the base bingo cells.
    try {
      const cellsToInsert = this.defaultBingoCard.cells.map(cell => ({
        id: cell.id,
        name: `Bingo: ${cell.title}`,
        category: 'BINGO',
        default_points: cell.points,
        activity_type: 'CHALLENGE',
        description: cell.description || ''
      }));

      await this.supabase.from('activity_catalog').upsert(cellsToInsert, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not upsert bingo cells to catalog after reset:', e);
    }

    return newCard;
  }

  private getBingoBonusState(preferences: any, bonusKey: string): BingoBonusState {
    const states = preferences?.bingo_bonus_states || {};
    const fallbackState = preferences?.bingo_bonus_state || {};
    const rawState = states[bonusKey] || fallbackState;

    return {
      awardedLineIndices: Array.isArray(rawState?.awardedLineIndices) ? rawState.awardedLineIndices : [],
      fullCardAwarded: !!rawState?.fullCardAwarded
    };
  }

  private getPersistedBingoBonusPoints(preferences: any, bonusKey: string): number {
    const state = this.getBingoBonusState(preferences, bonusKey);
    return (state.awardedLineIndices.length * this.bingoLineBonusPoints) + (state.fullCardAwarded ? this.bingoFullCardBonusPoints : 0);
  }

  private getNewLineAwards(completedCells: string[], alreadyAwardedLineIndices: number[]): number[] {
    const cellIndexes = completedCells
      .map(cellId => this.defaultBingoCard.cells.findIndex(cell => cell.id === cellId))
      .filter(index => index >= 0);

    return this.bingoWinningLines
      .map((line, index) => ({ line, index }))
      .filter(({ line, index }) => !alreadyAwardedLineIndices.includes(index) && line.every(cellIndex => cellIndexes.includes(cellIndex)))
      .map(({ index }) => index);
  }

  private async getBingoBonusContext(bonusKey: string): Promise<{ profile: any; state: BingoBonusState }> {
    const { data: profile } = await this.getCurrentProfile();

    return {
      profile,
      state: this.getBingoBonusState(profile?.preferences, bonusKey)
    };
  }

  private async saveBingoBonusState(bonusKey: string, state: BingoBonusState) {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) return;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.user.id)
      .single();

    const currentPreferences = profile?.preferences || {};
    const currentStates = currentPreferences.bingo_bonus_states || {};

    const updatedPreferences = {
      ...currentPreferences,
      bingo_bonus_states: {
        ...currentStates,
        [bonusKey]: state
      }
    };

    await this.supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.user.id);
  }

  private async clearBingoBonusState(bonusKey: string) {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) return;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.user.id)
      .single();

    const currentPreferences = profile?.preferences || {};
    const currentStates = currentPreferences.bingo_bonus_states || {};

    if (!currentStates[bonusKey] && !currentPreferences.bingo_bonus_state) {
      return;
    }

    const updatedStates = { ...currentStates };
    delete updatedStates[bonusKey];

    const updatedPreferences = {
      ...currentPreferences,
      bingo_bonus_states: updatedStates
    };

    delete updatedPreferences.bingo_bonus_state;

    await this.supabase
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.user.id);
  }

  private async recordBingoBonusLedger(partnershipId: string | null, userId: string, cellId: string, bonusAwards: BingoBonusAward[]) {
    const rows = bonusAwards.map((bonus) => ({
      partnership_id: partnershipId,
      user_id: userId,
      points: bonus.points,
      ai_validated: false,
      act_id: cellId,
      created_at: new Date().toISOString()
    }));

    if (rows.length === 0) {
      return;
    }

    const { error } = await this.supabase
      .from('points_ledger')
      .insert(rows);

    if (error) {
      console.warn('No se pudo registrar el bono del bingo en points_ledger:', error);
    }
  }

  private async getCurrentProfile(): Promise<{ data: any; error: any }> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user?.user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    return await this.supabase
      .from('profiles')
      .select('id, total_points, preferences')
      .eq('id', user.user.id)
      .single();
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
