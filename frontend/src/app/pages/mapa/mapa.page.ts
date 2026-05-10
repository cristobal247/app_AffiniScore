import { Component, AfterViewInit } from '@angular/core';
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

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngAfterViewInit() {
    this.initMap();
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

    // Creamos y guardamos un marcador, primero en la pos por defecto
    const userMarker = L.marker([lat, lng]).addTo(this.map)
      .bindPopup('Ubicación predeterminada')
      .openPopup();

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    try {
      // 1. Solicitar permisos primero (Crucial para web y móvil)
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const requestStatus = await Geolocation.requestPermissions();
        if (requestStatus.location !== 'granted') {
          throw new Error('Permisos de ubicación denegados por el usuario.');
        }
      }

      // 2. Pedimos ubicación real forzando alta precisión
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000, // Aumentamos el timeout a 20s para que no falle antes de encontrar el GPS
        maximumAge: 0   // Forzamos a no usar caché antigua
      });
      
      lat = coordinates.coords.latitude;
      lng = coordinates.coords.longitude;

      // Volamos a la ubicación real y actualizamos marcador
      this.map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
      userMarker.setLatLng([lat, lng]);
      userMarker.bindPopup('¡Estás aquí!').openPopup();

      // Opcional: Rastrear en tiempo real si el usuario se mueve
      await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }, (position, err) => {
        if (position) {
          userMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
        }
      });

    } catch (error) {
      console.warn('Error obteniendo ubicación, se usará la predeterminada:', error);
      // Ya estamos en la ubicación por defecto, no hay que hacer nada más
      this.showToast('No se pudo obtener la ubicación precisa', 'warning');
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
        
        // 1. Obtener coordenadas actuales
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });
        const lat = coordinates.coords.latitude;
        const lng = coordinates.coords.longitude;

        // 2. Subir audio a Supabase Storage
        const { url, error: uploadError } = await this.supabaseSvc.uploadSosAudio(audioBlob);
        
        if (uploadError) {
          throw new Error('Error al subir el audio');
        }

        // 3. Guardar el registro completo (URL + coordenadas) en la base de datos
        const { error: dbError } = await this.supabaseSvc.sendSosAlert(lat, lng, url);
        
        if (dbError) {
          throw new Error('Error al guardar el SOS en la base de datos');
        }

        await loading.dismiss();
        this.showToast('¡Alerta SOS enviada con éxito!', 'success');
        
      } catch (error) {
        console.error('Error en el flujo SOS:', error);
        await loading.dismiss();
        this.showToast('Hubo un error al enviar la alerta', 'warning');
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