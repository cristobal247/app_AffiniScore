import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // --- AUTENTICACIÓN (Lo que te pide el error) ---

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
    });
  }

  // --- FUNCIONES DEL CATÁLOGO ---

  async getCatalog() {
    return await this.supabase
      .from('catalog_actions')
      .select('*')
      .limit(6)
      .order('default_points', { ascending: false });
  }

  async getFullCatalog() {
    return await this.supabase
      .from('catalog_actions')
      .select('*')
      .order('name', { ascending: true });
  }

  async saveActionPoint(actionId: string, points: number) {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { error: 'Usuario no autenticado' };

    return await this.supabase.from('user_actions_log').insert({
      user_id: user.id,
      action_id: actionId,
      points_earned: points
    });
  }
}