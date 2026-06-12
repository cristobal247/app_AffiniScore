import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Geolocation, PositionOptions } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';

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
  private activeWatchers = 0;

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

    this.activeWatchers++;

    if (this.watchId) {
      return;
    }

    this.isTrackingSubject.next(true);
    this.errorSubject.next(null);

    if (Capacitor.getPlatform() !== 'web') {
      try {
        await BackgroundGeolocation.start(
          {
            backgroundMessage: "AffiniScore monitorea tu ubicación para el Geofencing.",
            backgroundTitle: "Servicio de ubicación activo",
            requestPermissions: true,
            stale: false,
            distanceFilter: 15 // metros
          },
          (location, error) => {
            if (error) {
              console.error('🚨 Error en segundo plano:', error);
              const message = error.message ? error.message : 'Error al obtener seguimiento de ubicación.';
              this.errorSubject.next(message);
              return;
            }
            if (location) {
              const appPos: AppPosition = {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                timestamp: location.time ? location.time : Date.now()
              };
              console.log(`📍 [GPS Real-Time Background] Lat: ${appPos.latitude}, Lng: ${appPos.longitude} | Precisión: ${appPos.accuracy}m`);

              const currentPos = this.positionSubject.getValue();
              if (appPos.accuracy > 30 && currentPos != null) {
                console.debug(`⚠️ Posición en segundo plano descartada por baja precisión: ${appPos.accuracy}m`);
                return;
              }

              this.positionSubject.next(appPos);
              this.accuracySubject.next(appPos.accuracy);
            }
          }
        );
        this.watchId = 'background-active';
      } catch (e: any) {
        console.error('Error al iniciar el watcher de segundo plano:', e);
        this.errorSubject.next(e.message || 'Error al iniciar geolocalización en background');
      }
    } else {
      const id = await Geolocation.watchPosition(this.watchOptions, (position, err) => {
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
      this.watchId = id;
    }
  }

  async stopTracking(force: boolean = false): Promise<void> {
    this.activeWatchers = Math.max(0, this.activeWatchers - 1);
    
    if (this.activeWatchers > 0 && !force) {
      console.log(`📍 Manteniendo seguimiento GPS activo (Quedan ${this.activeWatchers} observadores activos).`);
      return;
    }

    if (!this.watchId) {
      this.isTrackingSubject.next(false);
      return;
    }

    if (Capacitor.getPlatform() !== 'web') {
      try {
        await BackgroundGeolocation.stop();
      } catch (e) {
        console.warn('Error al detener watcher en background:', e);
      }
    } else {
      await Geolocation.clearWatch({ id: this.watchId });
    }

    this.watchId = null;
    this.isTrackingSubject.next(false);
    console.log('📍 Seguimiento GPS detenido por completo.');
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
