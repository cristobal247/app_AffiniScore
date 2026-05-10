import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

/**
 * Tipos para Location y Quality Time Sessions
 */
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface QualityTimeSession {
  id: string;
  partnership_id: string;
  latitude: number;
  longitude: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  bonus_points: number;
  is_active: boolean;
  created_at?: string;
}

/**
 * LocationService
 * 
 * Gestiona geofencing, proximidad y sesiones de "Tiempo de Calidad".
 * 
 * Funcionalidades:
 * - Calcular distancia con fórmula Haversine
 * - Detectar proximidad (<50m)
 * - Crear y finalizar sesiones de Quality Time
 * - Guardar y obtener ubicaciones del usuario
 */
@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Radio de proximidad en metros
  private readonly PROXIMITY_RADIUS_METERS = 50;

  constructor(private supabaseClient: SupabaseClientService) {}

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine.
   * 
   * @param lat1 Latitud del primer punto
   * @param lon1 Longitud del primer punto
   * @param lat2 Latitud del segundo punto
   * @param lon2 Longitud del segundo punto
   * @returns Distancia en metros
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
  }

  /**
   * Verifica si dos puntos están dentro del radio de proximidad (<50m).
   * Si están cerca, activa una sesión de "Tiempo de Calidad".
   * 
   * @param lat1 Latitud del usuario 1
   * @param lon1 Longitud del usuario 1
   * @param lat2 Latitud del usuario 2
   * @param lon2 Longitud del usuario 2
   * @returns Objeto con flag isNear y distancia
   */
  async checkProximity(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<{ isNear: boolean; distance: number; error: any }> {
    try {
      const distance = this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
      const isNear = distance < this.PROXIMITY_RADIUS_METERS;

      if (isNear) {
        console.log('🎯 Modo Tiempo de Calidad activado - Pareja está cerca');
      }

      return { isNear, distance, error: null };
    } catch (error) {
      console.error('Error checking proximity:', error);
      return { isNear: false, distance: -1, error };
    }
  }

  /**
   * Crea una nueva sesión de "Tiempo de Calidad".
   * Se activa cuando la pareja está cerca (<50m).
   */
  async createQualityTimeSession(
    partnershipId: string,
    latitude: number,
    longitude: number,
    bonusPoints: number = 50
  ): Promise<{ data: any; error: any }> {
    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('quality_time_sessions')
      .insert({
        partnership_id: partnershipId,
        latitude,
        longitude,
        start_time: new Date().toISOString(),
        bonus_points: bonusPoints,
        is_active: true
      })
      .select()
      .single();
  }

  /**
   * Finaliza una sesión de "Tiempo de Calidad".
   * Calcula bonificación basada en duración.
   */
  async endQualityTimeSession(
    sessionId: string,
    durationMinutes: number
  ): Promise<{ error: any }> {
    const supabase = this.supabaseClient.getClient();
    const bonusPoints = Math.floor(durationMinutes / 5) * 10;

    return await supabase
      .from('quality_time_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_minutes: durationMinutes,
        bonus_points: bonusPoints,
        is_active: false
      })
      .eq('id', sessionId);
  }

  /**
   * Obtiene la sesión de "Tiempo de Calidad" activa del usuario.
   */
  async getActiveQualityTimeSession(): Promise<{ data: QualityTimeSession | null; error: any }> {
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
      .from('quality_time_sessions')
      .select('*')
      .eq('partnership_id', partnership.id)
      .eq('is_active', true)
      .single();
  }

  /**
   * Guarda la ubicación actual del usuario.
   * Se usa para historial de geofencing.
   */
  async saveUserLocation(
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<{ error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    return await supabase
      .from('user_locations')
      .insert({
        user_id: user.id,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
      });
  }

  /**
   * Obtiene la última ubicación registrada del usuario.
   */
  async getLastUserLocation(): Promise<{ data: LocationCoordinates | null; error: any }> {
    const user = await this.supabaseClient.getCurrentUser();
    if (!user) {
      return { data: null, error: 'Usuario no autenticado' };
    }

    const supabase = this.supabaseClient.getClient();
    const { data, error } = await supabase
      .from('user_locations')
      .select('latitude, longitude, accuracy, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  }
}
