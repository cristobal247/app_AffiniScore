import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonAvatar,
  IonButton,
  IonIcon,
  ToastController,
  LoadingController,
  AlertController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../services/supabase';
import { GeolocationService } from '../../services/geolocation.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addCircleOutline, cogOutline, warningOutline, sparklesOutline } from 'ionicons/icons';

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
export class MapaPage implements AfterViewInit, OnInit, OnDestroy {
  private map!: any;
  
  // Estado para el SOS
  isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  // Datos de usuario y pareja
  userAvatarUrl: string | null = null;
  partnerAvatarUrl: string | null = null;
  partnerName: string = 'Tu pareja';
  
  // Distancia y tiempo dinámicos
  distance: string = '--';
  duration: string = '--';

  // Marcadores y sub
  private userMarker: any = null;
  private partnerMarker: any = null;
  private partnerId: string | null = null;
  private partnerSubscription: any = null;
  
  // Coordenadas locales en memoria
  private currentLat: number | null = null;
  private currentLng: number | null = null;
  private partnerLat: number | null = null;
  private partnerLng: number | null = null;
  // Variable para controlar el centro automático sin pelear con el usuario
  private isFirstLocationLock: boolean = false;
  private geoPositionSubscription: Subscription | null = null;
  private geoErrorSubscription: Subscription | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private geolocationService: GeolocationService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    addIcons({ addCircleOutline, cogOutline, warningOutline, sparklesOutline });
  }

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async ionViewWillEnter() {
    await this.loadUserProfile();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.partnerSubscription) {
      this.partnerSubscription.unsubscribe();
      console.log('Suscripción de ubicación de pareja cerrada.');
    }
    if (this.geoPositionSubscription) {
      this.geoPositionSubscription.unsubscribe();
    }
    if (this.geoErrorSubscription) {
      this.geoErrorSubscription.unsubscribe();
    }
    this.geolocationService.stopTracking().catch((err) => console.warn('Error al detener el seguimiento de ubicación:', err));
  }

  async loadUserProfile() {
    try {
      const { data } = await this.supabaseSvc.getUserProfile();
      if (data) {
        this.userAvatarUrl = data.avatar_url || null;
      }

      // Cargar información y ubicación inicial del partner
      const partnerData = await this.supabaseSvc.getPartnerLocation();
      if (partnerData) {
        this.partnerId = partnerData.id;
        this.partnerAvatarUrl = partnerData.avatarUrl;
        this.partnerName = partnerData.name;
        this.partnerLat = partnerData.latitude;
        this.partnerLng = partnerData.longitude;
      }
    } catch (error) {
      console.error('Error al cargar perfil en mapa:', error);
    }
  }

  // Dibujar o actualizar marcador de Usuario (Borde Rosa)
  private updateUserMarker(lat: number, lng: number) {
    this.currentLat = lat;
    this.currentLng = lng;

    if (!this.map) return;

    const html = `
      <div style="background-image: url(${this.userAvatarUrl || '/assets/images/user.png'}); width:46px; height:46px; background-size:cover; background-position:center; border-radius:50%; border:3px solid #ff4e7e; box-shadow: 0 0 10px rgba(255, 78, 126, 0.7), 0 4px 8px rgba(0,0,0,0.3);"></div>
    `;

    if (!this.userMarker) {
      this.userMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          html,
          className: '',
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        })
      }).addTo(this.map).bindPopup('<p style="margin:0;font-weight:700;color:#ff4e7e;font-size:13px;font-family:inherit;">¡Tú estás aquí! 💖</p>');
    } else {
      this.userMarker.setLatLng([lat, lng]);
    }

    this.recalculateDistance();
  }

  // Dibujar o actualizar marcador de Pareja (Borde Azul)
  private updatePartnerMarker(lat: number, lng: number) {
    this.partnerLat = lat;
    this.partnerLng = lng;

    if (!this.map) return;

    const html = `
      <div style="background-image: url(${this.partnerAvatarUrl || '/assets/images/user.png'}); width:46px; height:46px; background-size:cover; background-position:center; border-radius:50%; border:3px solid #3880ff; box-shadow: 0 0 10px rgba(56, 128, 255, 0.7), 0 4px 8px rgba(0,0,0,0.3);"></div>
    `;

    if (!this.partnerMarker) {
      this.partnerMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          html,
          className: '',
          iconSize: [46, 46],
          iconAnchor: [23, 23]
        })
      }).addTo(this.map).bindPopup(`<p style="margin:0;font-weight:700;color:#3880ff;font-size:13px;font-family:inherit;">${this.partnerName} está aquí 📍</p>`);
    } else {
      this.partnerMarker.setLatLng([lat, lng]);
    }

    this.recalculateDistance();
  }

  // Fórmula matemática de Haversine para calcular distancia en kilómetros
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Recalcular distancia y tiempo
  private recalculateDistance() {
    if (this.currentLat && this.currentLng && this.partnerLat && this.partnerLng) {
      const dist = this.calculateDistance(
        this.currentLat,
        this.currentLng,
        this.partnerLat,
        this.partnerLng
      );
      
      this.distance = dist.toFixed(1);
      
      // Tiempo estimado: caminando a 5 km/h (12 mins por km)
      const walkTime = Math.round(dist * 12);
      this.duration = walkTime.toString();
    }
  }

  // Ajustar la cámara del mapa para encuadrar perfectamente a ambos marcadores
  private fitBothMarkers() {
    if (this.map && this.currentLat && this.currentLng && this.partnerLat && this.partnerLng) {
      const bounds = L.latLngBounds([
        [this.currentLat, this.currentLng],
        [this.partnerLat, this.partnerLng]
      ]);
      this.map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true, duration: 1.5 });
    }
  }

  private centerMapOnUser(lat: number, lng: number) {
    if (!this.map) {
      return;
    }
      // panTo es mucho más estable y natural para el tracking continuo que flyTo
      this.map.panTo(new L.LatLng(lat, lng), { animate: true, duration: 0.5 });
  }

  private async initMap(): Promise<void> {
    // Coordenadas por defecto (Santiago, Chile)
    let lat = -33.447487;
    let lng = -70.673676;

    // Inicializamos el mapa con la ubicación por defecto primero usando Leaflet y OpenStreetMap tiles
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      tileSize: 256
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);

    // Cargar información inicial
    await this.loadUserProfile();

    // Dibujar marcadores iniciales de fallback
    this.updateUserMarker(lat, lng);
    if (this.partnerLat && this.partnerLng) {
      this.updatePartnerMarker(this.partnerLat, this.partnerLng);
      this.fitBothMarkers();
    }

    // 1. Configuramos las suscripciones de tracking y eventos ANTES de pedir la ubicación
    this.geoErrorSubscription = this.geolocationService.error$.subscribe((message) => {
      if (message) {
        this.showToast(message, 'warning');
      }
    });

    this.geoPositionSubscription = this.geolocationService.position$.subscribe(async (position) => {
      if (!position) {
        return;
      }

      this.updateUserMarker(position.latitude, position.longitude);
      
      // Centramos automáticamente de forma fluida
      if (!this.isFirstLocationLock) {
        this.map.flyTo([position.latitude, position.longitude], 17, { duration: 1.0 });
        this.isFirstLocationLock = true;
      } else {
        this.centerMapOnUser(position.latitude, position.longitude);
      }
      
      await this.supabaseSvc.updateUserLocation(position.latitude, position.longitude);
    });

    // 2. Suscribirse a la ubicación de la pareja en tiempo real
    if (this.partnerId) {
      console.log('Suscripción activa a la pareja:', this.partnerId);
      this.partnerSubscription = this.supabaseSvc.subscribeToPartnerLocation(this.partnerId, (newLoc) => {
        console.log('Nueva ubicación de pareja recibida:', newLoc);
        if (newLoc.latitude && newLoc.longitude) {
          this.updatePartnerMarker(newLoc.latitude, newLoc.longitude);
          this.fitBothMarkers();
        }
      });
    }

    // 3. Intentamos obtener la posición inicial rápidamente
    try {
      const currentPosition = await this.geolocationService.getCurrentPosition();
      lat = currentPosition.latitude;
      lng = currentPosition.longitude;

      // Actualizar marcador local y guardar en base de datos
      this.updateUserMarker(lat, lng);
      await this.supabaseSvc.updateUserLocation(lat, lng);

      // Centrar mapa elegantemente
      if (this.partnerLat && this.partnerLng) {
        this.fitBothMarkers();
      } else {
        this.map.flyTo([lat, lng], 15, { duration: 1.2 });
      }

    } catch (error: any) {
      console.warn('Error de ubicación detectado en el inicio:', error);
      
      let helpfulMsg = 'No se pudo obtener la ubicación';
      let toastColor = 'warning';
      
      if (error && (error.code === 1 || (error.message && error.message.toLowerCase().includes('denied')) || (error.message && error.message.toLowerCase().includes('permiso')))) {
        helpfulMsg = 'Permiso de ubicación denegado. Actívalo en la configuración de tu dispositivo 🔒';
      } else if (error && (error.code === 2 || (error.message && error.message.toLowerCase().includes('unavailable')))) {
        helpfulMsg = 'Servicios de GPS desactivados. Activa la ubicación en tu dispositivo 📍';
      } else if (error && error.code === 3) {
        helpfulMsg = 'La señal GPS tardó demasiado en responder 📌';
        toastColor = 'primary';
      } else if (error && error.message) {
        helpfulMsg = `Aviso: ${error.message}`;
      }

      this.showToast(helpfulMsg, toastColor);
    }

    // 4. Iniciar seguimiento continuo SIEMPRE (incluso si la petición inicial falló)
    try {
      await this.geolocationService.startTracking();
    } catch (err) {
      console.warn('No se pudo iniciar el tracking constante:', err);
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
    } catch (err: any) {
      console.error('Error al acceder al micrófono:', err);
      const errMsg = err?.name ? `${err.name}: ${err.message}` : err;
      this.showToast(`No se pudo acceder al micrófono: ${errMsg}`, 'warning');
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
        const currentLocation = await this.geolocationService.getCurrentPosition();
        const lat = currentLocation.latitude;
        const lng = currentLocation.longitude;

        // Convertir el audio a Base64 para mandarlo al backend
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
        });

        // 2. Enviar el registro completo (URL/Base64 + coordenadas) directamente al backend
        const { error: dbError } = await this.supabaseSvc.sendSosAlert(lat, lng, base64Audio);
        
        if (dbError) {
          throw new Error('Error al procesar el SOS en el backend');
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

  centrarEnUsuario() {
    if (this.currentLat && this.currentLng) {
      if (this.map) {
        this.map.flyTo([this.currentLat, this.currentLng], 17, { duration: 1.2 });
      }
    } else {
      this.showToast('Tu ubicación no está disponible todavía.', 'warning');
    }
  }

  centrarEnPareja() {
    if (this.partnerLat && this.partnerLng) {
      if (this.map) {
        this.map.flyTo([this.partnerLat, this.partnerLng], 17, { duration: 1.2 });
      }
    } else {
      this.showToast('La ubicación de tu pareja no está disponible.', 'warning');
    }
  }

  async abrirRegistrarLugar() {
    const alert = await this.alertCtrl.create({
      header: 'Lugar Especial 💖',
      subHeader: 'Registra un lugar visitado para geofencing',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre (ej: Primera cita, Cafetería)'
        },
        {
          name: 'direccion',
          type: 'text',
          placeholder: 'Dirección (ej: Av. Providencia 123)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Registrar',
          handler: async (data) => {
            if (!data.nombre || !data.direccion) {
              this.showToast('Por favor, completa todos los campos.', 'warning');
              return false; // Evita cerrar el alert
            }
            await this.registrarLugarSimulado(data.nombre, data.direccion);
            return true;
          }
        }
      ],
      mode: 'ios'
    });

    await alert.present();
  }

  private async registrarLugarSimulado(nombre: string, direccion: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Geolocalizando dirección...',
      spinner: 'crescent'
    });
    await loading.present();

    // Simular retraso de red / geocodificación de 1.5s
    await new Promise(resolve => setTimeout(resolve, 1500));

    await loading.dismiss();

    // Generar una ubicación cercana a la del usuario (o de fallback si no hay ubicación)
    const baseLat = this.currentLat || -33.447487;
    const baseLng = this.currentLng || -70.673676;
    
    // Desplazamiento aleatorio para simular que está en una dirección real cercana
    const randomOffsetLat = (Math.random() - 0.5) * 0.006;
    const randomOffsetLng = (Math.random() - 0.5) * 0.006;
    
    const placeLat = baseLat + randomOffsetLat;
    const placeLng = baseLng + randomOffsetLng;

    // Crear marcador Leaflet para el lugar especial
    const placeMarkerHtml = `
      <div class="special-place-marker" style="
        background: #ff4e7e;
        color: white;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(255, 78, 126, 0.5);
        border: 2px solid white;
        font-size: 16px;
      ">
        💖
      </div>
    `;

    const marker = L.marker([placeLat, placeLng], {
      icon: L.divIcon({
        html: placeMarkerHtml,
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      })
    }).addTo(this.map);

    marker.bindPopup(`
      <div style="font-family: inherit; text-align: center; padding: 4px;">
        <h4 style="margin: 0 0 4px; color: #ff4e7e; font-weight: 700; font-size: 14px;">${nombre}</h4>
        <p style="margin: 0 0 6px; font-size: 12px; color: #666;">${direccion}</p>
        <span style="font-size: 10px; background: #ffebee; color: #ff4e7e; padding: 2px 6px; border-radius: 10px; font-weight: 600;">Zona de Geofencing Activa</span>
      </div>
    `).openPopup();

    // Centrar mapa en el nuevo lugar
    this.map.flyTo([placeLat, placeLng], 16, { duration: 1.2 });

    this.showToast(`¡Lugar "${nombre}" registrado con éxito para Geofencing!`, 'success');
  }

}