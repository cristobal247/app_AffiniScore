import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase';

@Injectable({
  providedIn: 'root'
})
export class QuickInteractionService {
  private readonly QUESTION_TEMPLATES = [
    '{user1}, ¿qué le regalaste a {user2} en su cumpleaños pasado?',
    '{user1}, ¿cuál es la comida favorita de {user2}?',
    '{user1}, ¿cuál es el mayor sueño de {user2}?',
    '{user1}, ¿adónde fue el primer viaje que hicieron juntos con {user2}?',
    '{user1}, ¿cuál es el color favorito de {user2}?',
    '{user1}, ¿cuál es la película favorita de {user2}?',
    '{user1}, ¿qué es lo que más le gusta a {user2} hacer en su tiempo libre?',
    '{user1}, ¿cuál es el mayor miedo de {user2}?'
  ];

  constructor(private supabaseSvc: SupabaseService) {}

  generateCustomQuestion(user1Name: string, user2Name: string): string {
    const template = this.QUESTION_TEMPLATES[Math.floor(Math.random() * this.QUESTION_TEMPLATES.length)];
    // Elegimos al azar quién pregunta y a quién se pregunta
    if (Math.random() > 0.5) {
      return template.replace('{user1}', user1Name).replace('{user2}', user2Name);
    } else {
      return template.replace('{user1}', user2Name).replace('{user2}', user1Name);
    }
  }

  async getActiveTriviaSession(partnershipId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await this.supabaseSvc.supabase
      .from('trivia_sessions')
      .select('*')
      .eq('partnership_id', partnershipId)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return { data: null, error };
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  }

  async createTriviaSession(partnershipId: string, question: string, user1Id: string, user2Id: string): Promise<{ data: any; error: any }> {
    const { data, error } = await this.supabaseSvc.supabase
      .from('trivia_sessions')
      .insert({
        partnership_id: partnershipId,
        question,
        user1_id: user1Id,
        user2_id: user2Id,
        user1_status: 'pending',
        user2_status: 'pending',
        status: 'waiting'
      })
      .select()
      .single();

    return { data, error };
  }

  async submitTriviaAnswer(sessionId: string, userNumber: 1 | 2, answer: string): Promise<{ error: any }> {
    const updates: any = {};
    if (userNumber === 1) {
      updates.user1_answer = answer;
      updates.user1_status = 'answered';
    } else {
      updates.user2_answer = answer;
      updates.user2_status = 'answered';
    }
    updates.updated_at = new Date().toISOString();

    const { error } = await this.supabaseSvc.supabase
      .from('trivia_sessions')
      .update(updates)
      .eq('id', sessionId);

    return { error };
  }

  async finishTriviaSession(sessionId: string): Promise<{ error: any }> {
    const { error } = await this.supabaseSvc.supabase
      .from('trivia_sessions')
      .update({ status: 'finished', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    return { error };
  }

  async getOrCreateTriviaActivity(partnershipId: string): Promise<string> {
    // 1. Buscar si ya existe la actividad "Trivia de Pareja"
    const { data: existing } = await this.supabaseSvc.supabase
      .from('activity_catalog')
      .select('id')
      .eq('name', 'Trivia de Pareja')
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // 2. Si no existe, crearla para esta sociedad
    const { data: inserted, error } = await this.supabaseSvc.supabase
      .from('activity_catalog')
      .insert({
        name: 'Trivia de Pareja',
        category: 'Trivia',
        default_points: 10,
        activity_type: 'ROUTINE',
        subcategory: 'Trivia',
        description: 'Juego de trivia rápida con la pareja.',
        partnership_id: partnershipId
      })
      .select('id')
      .single();

    if (error || !inserted) {
      console.error('Error al crear actividad de trivia:', error);
      // Retornar un ID por defecto o intentar obtener cualquier ID del catálogo como fallback
      const { data: fallback } = await this.supabaseSvc.supabase
        .from('activity_catalog')
        .select('id')
        .limit(1);
      return fallback && fallback.length > 0 ? fallback[0].id : '';
    }

    return inserted.id;
  }

  async awardTriviaPoints(partnershipId: string): Promise<{ error: any }> {
    const activityId = await this.getOrCreateTriviaActivity(partnershipId);
    if (!activityId) {
      return { error: 'No se pudo obtener ni crear una actividad de trivia válida en el catálogo' };
    }
    // Registrar la acción de trivia completada y sumar 10 puntos al usuario
    return await this.supabaseSvc.saveActionPoint(activityId, 10);
  }
}
