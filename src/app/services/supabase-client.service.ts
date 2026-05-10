import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

/**
 * SupabaseClientService
 * 
 * Servicio base que proporciona la instancia del cliente Supabase.
 * Otros servicios inyectan este servicio para acceder a Supabase.
 * 
 * Beneficios:
 * - Centraliza la configuración del cliente
 * - Evita múltiples instancias del cliente
 * - Facilita testing (se puede mockear fácilmente)
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseClientService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Obtiene la instancia del cliente Supabase
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Obtiene el usuario actualmente autenticado
   */
  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Escucha cambios en el estado de autenticación
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
