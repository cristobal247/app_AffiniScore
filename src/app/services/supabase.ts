import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService { // <--- Verifica este nombre
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient('https://fojvwsegibjssttbzghe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvanZ3c2VnaWJqc3N0dGJ6Z2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDEyNzAsImV4cCI6MjA5MTUxNzI3MH0.U5zTiaKAIfmMfpeEGOHsE-ZGI4_3EJmpdPVVozRq48o');
  }

  /**
   * AUTENTICACIÓN: Inicio de Sesión
   */
  async signIn(email: string, pass: string) {
    return await this.supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
  }

  /**
   * AUTENTICACIÓN: Registro de Usuario Nuevo
   */
  async signUp(email: string, pass: string) {
    return await this.supabase.auth.signUp({
      email: email,
      password: pass,
    });
  }

  /**
   * CATÁLOGO: Trae la lista de actos de servicio
   * Tabla: acts_of_service_catalog
   */
  // Dentro de supabase.ts
  async getCatalog() {
    return await this.supabase
      .from('acts_of_service_catalog')
      .select('id, name, default_points, category'); // Nombres exactos de tu captura
  }

  /**
   * PUNTOS: Registra una acción realizada en el historial
   * Tabla: points_ledger
   */
  async saveActionPoint(actionId: string, points: number) {
    // 1. Obtenemos el usuario que está logueado actualmente
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) return { error: { message: 'Usuario no identificado' } };

    // 2. Insertamos el registro en el libro contable de puntos
    return await this.supabase
      .from('points_ledger')
      .insert([
        { 
          user_id: user.id, 
          action_id: actionId, 
          points_earned: points 
        }
      ]);
  }

  /**
   * SESIÓN: Obtener el usuario actual (útil para perfiles)
   */
  async getCurrentUser() {
    return await this.supabase.auth.getUser();
  }

  /**
   * SESIÓN: Cerrar sesión
   */
  async signOut() {
    return await this.supabase.auth.signOut();
  }
}