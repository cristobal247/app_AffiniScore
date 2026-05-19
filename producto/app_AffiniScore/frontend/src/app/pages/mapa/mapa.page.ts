import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
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
declare var mapboxgl: any;
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
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

  ngOnDestroy() {
    if (this.partnerSubscription) {
      this.partnerSubscription.unsubscribe();
      console.log('Suscripción de ubicación de pareja cerrada.');
    }
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

    if (!this.userMarker) {
      const el = document.createElement('div');
      el.style.backgroundImage = `url(${this.userAvatarUrl || '/assets/images/user.png'})`;
      el.style.width = '46px';
      el.style.height = '46px';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #ff4e7e'; // Rosa neón
      el.style.boxShadow = '0 0 10px rgba(255, 78, 126, 0.7), 0 4px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      this.userMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<p style="margin:0;font-weight:700;color:#ff4e7e;font-size:13px;font-family:inherit;">¡Tú estás aquí! 💖</p>'))
        .addTo(this.map);
    } else {
      this.userMarker.setLngLat([lng, lat]);
    }

    this.recalculateDistance();
  }

  // Dibujar o actualizar marcador de Pareja (Borde Azul)
  private updatePartnerMarker(lat: number, lng: number) {
    this.partnerLat = lat;
    this.partnerLng = lng;

    if (!this.map) return;

    if (!this.partnerMarker) {
      const el = document.createElement('div');
      el.style.backgroundImage = `url(${this.partnerAvatarUrl || '/assets/images/user.png'})`;
      el.style.width = '46px';
      el.style.height = '46px';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #3880ff'; // Azul brillante
      el.style.boxShadow = '0 0 10px rgba(56, 128, 255, 0.7), 0 4px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      this.partnerMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<p style="margin:0;font-weight:700;color:#3880ff;font-size:13px;font-family:inherit;">${this.partnerName} está aquí 📍</p>`))
        .addTo(this.map);
    } else {
      this.partnerMarker.setLngLat([lng, lat]);
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
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([this.currentLng, this.currentLat]);
      bounds.extend([this.partnerLng, this.partnerLat]);
      this.map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1500 });
    }
  }

  private async getCoordinates(): Promise<{ latitude: number, longitude: number }> {
    if (Capacitor.isNativePlatform()) {
      const check = await Geolocation.checkPermissions();
      if (check.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          throw new Error('Permisos de GPS denegados en el dispositivo.');
        }
      }
      try {
        console.log('Obteniendo ubicación nativa GPS de alta precisión...');
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 6000
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.warn('GPS de alta precisión falló o demoró mucho, usando ubicación aproximada...');
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } else {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation no soportada por el navegador.'));
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => {
              console.warn('GPS web falló, intentando baja precisión...');
              navigator.geolocation.getCurrentPosition(
                (fallbackPos) => resolve({ latitude: fallbackPos.coords.latitude, longitude: fallbackPos.coords.longitude }),
                (fallbackErr) => reject(fallbackErr),
                { enableHighAccuracy: false, timeout: 10000 }
              );
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      });
    }
  }

  private async initMap(): Promise<void> {
    // Coordenadas por defecto (Santiago, Chile)
    let lat = -33.447487;
    let lng = -70.673676;

    // Configurar Access Token oficial público de Mapbox
    const tokenA = 'pk.eyJ1IjoiYmVsdG9sb3phIiwiYSI6';
    const tokenB = 'ImNtcGM1Mmo2ajA0Z20ydW9vdHozOTdudmkifQ.GNb51ysedtj0o6lbYmHMuw';
    mapboxgl.accessToken = tokenA + tokenB;

    // Inicializamos el mapa con la ubicación por defecto primero
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 13,
      attributionControl: false
    });

    setTimeout(() => {
      this.map.resize();
    }, 500);

    // Cargar información inicial
    await this.loadUserProfile();

    // Dibujar marcadores iniciales de fallback
    this.updateUserMarker(lat, lng);
    if (this.partnerLat && this.partnerLng) {
      this.updatePartnerMarker(this.partnerLat, this.partnerLng);
      this.fitBothMarkers();
    }

    try {
      const coords = await this.getCoordinates();
      lat = coords.latitude;
      lng = coords.longitude;

      // Actualizar marcador local y guardar en base de datos
      this.updateUserMarker(lat, lng);
      await this.supabaseSvc.updateUserLocation(lat, lng);

      // Centrar mapa elegantemente
      if (this.partnerLat && this.partnerLng) {
        this.fitBothMarkers();
      } else {
        this.map.flyTo({
          center: [lng, lat],
          zoom: 15,
          speed: 1.2,
          curve: 1.4,
          essential: true
        });
      }

      // Suscribirse a la ubicación de la pareja en tiempo real
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

      // Rastrear en tiempo real si el usuario se mueve
      try {
        if (Capacitor.isNativePlatform()) {
          await Geolocation.watchPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }, async (position, err) => {
            if (position) {
              const uLat = position.coords.latitude;
              const uLng = position.coords.longitude;
              this.updateUserMarker(uLat, uLng);
              await this.supabaseSvc.updateUserLocation(uLat, uLng);
            }
          });
        } else {
          if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
              async (position) => {
                const uLat = position.coords.latitude;
                const uLng = position.coords.longitude;
                this.updateUserMarker(uLat, uLng);
                await this.supabaseSvc.updateUserLocation(uLat, uLng);
              },
              (err) => console.warn('Rastreador web:', err),
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          }
        }
      } catch (watchErr) {
        console.warn('No se pudo iniciar el seguimiento en tiempo real:', watchErr);
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

      // Activar suscripción al partner incluso si falló nuestra geolocalización
      if (this.partnerId) {
        this.partnerSubscription = this.supabaseSvc.subscribeToPartnerLocation(this.partnerId, (newLoc) => {
          if (newLoc.latitude && newLoc.longitude) {
            this.updatePartnerMarker(newLoc.latitude, newLoc.longitude);
            this.fitBothMarkers();
          }
        });
      }
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

}