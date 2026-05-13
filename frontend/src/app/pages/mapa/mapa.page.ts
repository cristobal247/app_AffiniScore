import { Component, AfterViewInit, OnInit } from '@angular/core';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonAvatar,
  IonButton,
  IonIcon,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService } from '../../services/supabase';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonAvatar,
    IonButton,
    IonIcon,
    CommonModule,
    RouterModule
  ]
})
export class MapaPage implements AfterViewInit {
  private map!: L.Map;
  
  // Estado para el SOS
  isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  userAvatarUrl: string | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async ionViewWillEnter() {
    await this.loadUserProfile();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  async loadUserProfile() {
    try {
      const { data } = await this.supabaseSvc.getUserProfile();
      if (data) {
        this.userAvatarUrl = data.avatar_url || null;
      }
    } catch (error) {
      console.error('Error al cargar perfil en mapa:', error);
    }
  }

  private async initMap(): Promise<void> {
    // Coordenadas por defecto (Santiago, Chile)
    let lat = -33.447487;
    let lng = -70.673676;

    // Inicializamos el mapa con la ubicación por defecto primero
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Crear un icono personalizado hermoso (con o sin avatar)
    const customIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          width: 44px; height: 44px; background: white; border-radius: 50%;
          border: 3px solid #bd343a; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center; overflow: hidden;
          position: relative;">
          ${this.userAvatarUrl 
            ? `<img src="${this.userAvatarUrl}" style="width: 100%; height: 100%; object-fit: cover;"/>` 
            : `<div style="background: #bd343a; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: bold; font-size: 16px;">Tú</span></div>`
          }
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
            width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #bd343a;"></div>
        </div>
      `,
      iconSize: [44, 50],
      iconAnchor: [22, 50],
      popupAnchor: [0, -50]
    });

    // Creamos y guardamos un marcador
    const userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map)
      .bindPopup('<b>Buscando tu ubicación...</b>')
      .openPopup();

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    try {
      // 1. Solicitar permisos primero (Crucial para móvil, en web a veces falla checkPermissions)
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const requestStatus = await Geolocation.requestPermissions();
          if (requestStatus.location !== 'granted') {
            console.warn('Permisos denegados explícitamente.');
          }
        }
      } catch (permErr) {
        console.warn('checkPermissions no soportado en este navegador, continuando...', permErr);
      }

      // 2. Pedimos ubicación real
      let coordinates: any;
      try {
        coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000, 
          maximumAge: 0   
        });
      } catch (highAccErr) {
        console.warn('Fallo alta precisión, intentando baja precisión...', highAccErr);
        try {
          coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 3000
          });
        } catch (lowAccErr) {
          console.warn('GPS bloqueado por administrador. Simulando ubicación para pruebas...');
          // Simulamos una ubicación en Santiago para que puedas ver cómo funciona
          coordinates = {
            coords: { latitude: -33.4489, longitude: -70.6693 }
          };
          this.showToast('GPS bloqueado por Windows. Usando ubicación simulada.', 'tertiary');
        }
      }
      
      lat = coordinates.coords.latitude;
      lng = coordinates.coords.longitude;

      // Volamos a la ubicación real y actualizamos marcador
      this.map.flyTo([lat, lng], 17, { animate: true, duration: 2 });
      userMarker.setLatLng([lat, lng]);
      userMarker.bindPopup('<b>¡Estás aquí!</b>').openPopup();

      // 3. Rastrear en tiempo real si el usuario se mueve
      await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }, (position, err) => {
        if (position) {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;
          
          userMarker.setLatLng([newLat, newLng]);
          
          // Suave paneo hacia la nueva ubicación si el usuario se mueve
          this.map.panTo(new L.LatLng(newLat, newLng), { animate: true });
        }
      });

    } catch (error) {
      console.warn('Error obteniendo ubicación, se usará la predeterminada:', error);
      userMarker.bindPopup('Ubicación predeterminada (GPS Desactivado)').openPopup();
      this.showToast('No se pudo obtener la ubicación precisa. Verifica tu GPS.', 'warning');
    }
  }

  async handleSOS() {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      await this.stopRecordingAndSend();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      this.showToast('Grabando audio SOS... Vuelve a tocar para enviar', 'danger');
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      this.showToast('No se pudo acceder al micrófono', 'warning');
    }
  }

  private async stopRecordingAndSend() {
    if (!this.mediaRecorder) return;

    this.isRecording = false;
    
    // Configuramos el callback para cuando el MediaRecorder se detenga
    this.mediaRecorder.onstop = async () => {
      const loading = await this.loadingCtrl.create({
        message: 'Enviando alerta SOS...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // 1. Obtener coordenadas actuales (con fallback)
        let lat = 0;
        let lng = 0;
        try {
          const coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000, // Timeout más corto para SOS
            maximumAge: 0
          });
          lat = coordinates.coords.latitude;
          lng = coordinates.coords.longitude;
        } catch (geoErr) {
          console.warn('GPS falló durante SOS, usando coordenadas por defecto:', geoErr);
          // Opcional: intentar usar última ubicación conocida del marcador si existe
        }

        // Convertir el audio a Base64 para mandarlo al backend
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = () => reject(new Error('Error al leer el archivo de audio'));
        });

        // 2. Enviar el registro completo (URL/Base64 + coordenadas) directamente al backend
        const { error: dbError } = await this.supabaseSvc.sendSosAlert(lat, lng, base64Audio);
        
        if (dbError) {
          throw new Error('Supabase: ' + dbError);
        }

        await loading.dismiss();
        this.showToast('¡Alerta SOS enviada con éxito!', 'success');
        
      } catch (error: any) {
        console.error('Error en el flujo SOS:', error);
        await loading.dismiss();
        
        // Log extra detail
        let errStr = 'Desconocido';
        if (error instanceof Error) errStr = error.message;
        else if (typeof error === 'string') errStr = error;
        else errStr = JSON.stringify(error);
        
        this.showToast('Error: ' + errStr, 'danger');
      }
    };

    // Al llamar a stop(), se disparará el evento onstop configurado arriba
    this.mediaRecorder.stop();
    // Detener todas las pistas de audio para liberar el micrófono
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

}