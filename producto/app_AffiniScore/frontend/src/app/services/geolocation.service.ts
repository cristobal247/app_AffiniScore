import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface AppPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private positionSubject = new BehaviorSubject<AppPosition | null>(null);
  private accuracySubject = new BehaviorSubject<number | null>(null);
  private isTrackingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private watchId: string | null = null;

  get position$(): Observable<AppPosition | null> {
    return this.positionSubject.asObservable();
  }

  get accuracy$(): Observable<number | null> {
    return this.accuracySubject.asObservable();
  }

  get isTracking$(): Observable<boolean> {
    return this.isTrackingSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  private readonly watchOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  private readonly currentOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 5000 // Permite una ubicación en caché reciente para agilizar la carga inicial
  };

  async requestPermission(): Promise<boolean> {
    // En la web, el navegador pide permiso automáticamente al intentar rastrear.
    // Evitamos llamar a checkPermissions para que no lance "not implemented on web".
    if (Capacitor.getPlatform() === 'web') {
      return true;
    }

    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location === 'granted') {
        return true;
      }

      const request = await Geolocation.requestPermissions();
      return request.location === 'granted';
    } catch (e) {
      console.warn('Aviso de permisos (ignorando por plataforma):', e);
      return true;
    }
  }

  async getCurrentPosition(): Promise<AppPosition> {
    const granted = await this.requestPermission();
    if (!granted) {
      throw new Error('Permiso de ubicación no concedido.');
    }

    const position = await Geolocation.getCurrentPosition(this.currentOptions);
    if (!position || !position.coords) {
      throw new Error('Posición no disponible.');
    }

    return this.parsePosition(position);
  }

  async startTracking(): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) {
      throw new Error('Permiso de ubicación no concedido.');
    }

    if (this.watchId) {
      return;
    }

    this.isTrackingSubject.next(true);
    this.errorSubject.next(null);

    this.watchId = await Geolocation.watchPosition(this.watchOptions, (position, err) => {
      if (err) {
        console.error('🚨 Error nativo de watchPosition:', err);
        const message = err.message ? err.message : 'Error al obtener seguimiento de ubicación.';
        this.errorSubject.next(message);
        return;
      }

      if (!position || !position.coords) {
        return;
      }

      const acc = position.coords.accuracy;
      console.log(`📍 [GPS Real-Time] Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude} | Precisión: ${acc}m`);

      const currentPos = this.positionSubject.getValue();
      
      // Si YA tenemos una posición previa, exigimos alta precisión (<=30m). 
      // Si es la PRIMERA ubicación, la aceptamos para no dejar la pantalla "congelada" sin ubicación inicial.
      if (acc > 30 && currentPos != null) {
        console.debug(`⚠️ Posición descartada por baja precisión (>30m): ${acc}m`);
        return;
      }

      this.positionSubject.next(this.parsePosition(position));
      this.accuracySubject.next(position.coords.accuracy);
    });
  }

  async stopTracking(): Promise<void> {
    if (!this.watchId) {
      this.isTrackingSubject.next(false);
      return;
    }

    await Geolocation.clearWatch({ id: this.watchId });
    this.watchId = null;
    this.isTrackingSubject.next(false);
  }

  private parsePosition(position: any): AppPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  }
}
