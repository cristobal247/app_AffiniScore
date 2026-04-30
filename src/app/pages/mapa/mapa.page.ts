import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle,
  IonButtons, 
  IonAvatar,
  IonButton,
  IonIcon,
  ToastController,
  LoadingController,
  IonCard,
  IonCardContent,
  IonCardHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { navigate, pin, checkmarkCircleOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService } from '../../services/supabase';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonToolbar,
    IonTitle,
    IonButtons, 
    IonAvatar,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    CommonModule
  ]
})
export class MapaPage implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  
  // Estado para el SOS
  isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Estado para geofencing
  isMonitoringProximity: boolean = false;
  qualityTimeActive: boolean = false;
  distanceToPartner: number = -1;
  proximityCheckInterval: any = null;

  // Marcadores del mapa
  userMarker: L.Marker | null = null;
  partnerMarker: L.Marker | null = null;
  geofenceCircle: L.Circle | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ navigate, pin, checkmarkCircleOutline });
  }

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

    // Creamos el marcador del usuario
    this.userMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'assets/icon/marker-user.png',
        shadowUrl: 'assets/icon/marker-shadow.png',
        iconSize: [25, 41],
        shadowSize: [41, 41],
        iconAnchor: [12, 41],
        shadowAnchor: [12, 41],
        popupAnchor: [1, -34]
      })
    }).addTo(this.map)
      .bindPopup('📍 Tu ubicación')
      .openPopup();

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    try {
      // Pedimos ubicación real usando Capacitor
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      lat = coordinates.coords.latitude;
      lng = coordinates.coords.longitude;

      // Volamos a la ubicación real y actualizamos marcador
      this.map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
      this.userMarker!.setLatLng([lat, lng]);
      this.userMarker!.bindPopup('¡Estás aquí!').openPopup();

      // Guardar ubicación en la BD para historial
      await this.supabaseSvc.saveUserLocation(lat, lng, coordinates.coords.accuracy);

    } catch (error) {
      console.warn('Error obteniendo ubicación, se usará la predeterminada:', error);
    }
  }

  // Iniciar monitoreo de proximidad (geofencing)
  // Verifica cada 5 segundos si la pareja está cerca
  async startProximityMonitoring() {
    if (this.isMonitoringProximity) {
      this.showToast('Ya estoy monitoreando proximidad', 'info');
      return;
    }

    this.isMonitoringProximity = true;
    this.showToast('Monitoreando proximidad...', 'primary');

    // Monitorear cada 5 segundos
    this.proximityCheckInterval = setInterval(async () => {
      await this.checkAndDisplayProximity();
    }, 5000);

    // Hacer la primera comprobación inmediatamente
    await this.checkAndDisplayProximity();
  }

  // Detener monitoreo de proximidad
  stopProximityMonitoring() {
    if (this.proximityCheckInterval) {
      clearInterval(this.proximityCheckInterval);
      this.proximityCheckInterval = null;
    }
    this.isMonitoringProximity = false;
    this.showToast('Monitoreo detenido', 'secondary');
  }

  // Verificar proximidad actual y mostrar en el mapa
  private async checkAndDisplayProximity() {
    try {
      // Obtener ubicación actual del usuario
      const userCoordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000
      });

      const userLat = userCoordinates.coords.latitude;
      const userLng = userCoordinates.coords.longitude;

      // Para MVP: usar ubicación simulada de pareja
      // En producción: obtener de la BD (pareja real)
      const partnerLat = -33.445;
      const partnerLng = -70.675;

      // Actualizar marcador del usuario
      if (this.userMarker) {
        this.userMarker.setLatLng([userLat, userLng]);
      }

      // Actualizar o crear marcador de la pareja
      if (!this.partnerMarker) {
        this.partnerMarker = L.marker([partnerLat, partnerLng], {
          icon: L.icon({
            iconUrl: 'assets/icon/marker-partner.png',
            shadowUrl: 'assets/icon/marker-shadow.png',
            iconSize: [25, 41],
            shadowSize: [41, 41],
            iconAnchor: [12, 41],
            shadowAnchor: [12, 41],
            popupAnchor: [1, -34]
          })
        }).addTo(this.map)
          .bindPopup('💕 Ubicación de tu pareja');
      } else {
        this.partnerMarker.setLatLng([partnerLat, partnerLng]);
      }

      // Verificar proximidad usando Haversine
      const { isNear, distance } = await this.supabaseSvc.checkProximity(
        userLat, userLng,
        partnerLat, partnerLng
      );

      this.distanceToPartner = Math.round(distance);

      // Si están cerca, activar Tiempo de Calidad
      if (isNear && !this.qualityTimeActive) {
        await this.activateQualityTime(userLat, userLng);
      } else if (!isNear && this.qualityTimeActive) {
        await this.deactivateQualityTime();
      }

      // Mostrar/actualizar círculo de geofencing (50 metros)
      if (!this.geofenceCircle) {
        this.geofenceCircle = L.circle(
          [userLat, userLng],
          {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.1,
            radius: 50, // 50 metros
            weight: 2,
            dashArray: '5, 5'
          }
        ).addTo(this.map);
      } else {
        this.geofenceCircle.setLatLng([userLat, userLng]);
      }

      // Centrar el mapa en el punto medio entre ambos
      const midLat = (userLat + partnerLat) / 2;
      const midLng = (userLng + partnerLng) / 2;
      this.map.setView([midLat, midLng], 15);

    } catch (error) {
      console.error('Error checking proximity:', error);
    }
  }

  // Activar modo Tiempo de Calidad
  private async activateQualityTime(lat: number, lng: number) {
    this.qualityTimeActive = true;

    const { data, error } = await this.supabaseSvc.createQualityTimeSession(
      'partnership-id', // TODO: obtener partnership_id real
      lat,
      lng,
      50 // Puntos bonus
    );

    if (!error) {
      this.showToast(
        `🎯 ¡¡¡MODO TIEMPO DE CALIDAD ACTIVADO!!! +50 pts`,
        'success'
      );
    } else {
      console.error('Error creating quality time session:', error);
    }
  }

  // Desactivar modo Tiempo de Calidad
  private async deactivateQualityTime() {
    this.qualityTimeActive = false;
    this.showToast('Modo Tiempo de Calidad desactivado', 'warning');
  }

  // Mostrar distancia actual a la pareja
  displayDistance() {
    if (this.distanceToPartner >= 0) {
      this.showToast(
        `Distancia a tu pareja: ${this.distanceToPartner}m`,
        'info'
      );
    } else {
      this.showToast('Aún no se ha calculado la distancia', 'warning');
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
    
    this.mediaRecorder.onstop = async () => {
      const loading = await this.loadingCtrl.create({
        message: 'Enviando alerta SOS...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Obtener coordenadas actuales
        const coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        const lat = coordinates.coords.latitude;
        const lng = coordinates.coords.longitude;

        // Subir audio a Supabase Storage
        const { url, error: uploadError } = await this.supabaseSvc.uploadSosAudio(audioBlob);
        
        if (uploadError) {
          throw new Error('Error al subir el audio');
        }

        // Guardar el registro completo en la BD
        const { error: dbError } = await this.supabaseSvc.sendSosAlert(lat, lng, url);
        
        if (dbError) {
          throw new Error('Error al guardar el SOS');
        }

        await loading.dismiss();
        this.showToast('¡Alerta SOS enviada con éxito!', 'success');
        
      } catch (error) {
        console.error('Error en el flujo SOS:', error);
        await loading.dismiss();
        this.showToast('Hubo un error al enviar la alerta', 'warning');
      }
    };

    this.mediaRecorder.stop();
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

  ngOnDestroy() {
    // Limpiar el intervalo al destruir el componente
    if (this.proximityCheckInterval) {
      clearInterval(this.proximityCheckInterval);
    }
  }
}