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
  LoadingController,
  AlertController,
  IonModal,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonInput,
  IonTitle,
  IonSegment,
  IonSegmentButton,
  IonCard
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../services/supabase';
import { GeolocationService } from '../../services/geolocation.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { addCircleOutline, cogOutline, warningOutline, square, locationOutline, checkmarkCircleOutline, closeOutline, trashOutline, chevronBackOutline, alertCircleOutline, alertCircle, playOutline, pauseOutline, musicalNotesOutline, ellipsisHorizontalOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';

declare var mapboxgl: any;

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
    IonModal,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonInput,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonCard,
    CommonModule,
    RouterModule,
    FormsModule
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

  // Variables para Modal de Geocodificación Mapbox Autocomplete
  isModalOpen: boolean = false;
  nuevoLugarNombre: string = '';
  searchQuery: string = '';
  suggestions: any[] = [];
  isLoadingSuggestions: boolean = false;
  direccionSeleccionada: string = '';
  selectedCoordinates: [number, number] | null = null; // [lng, lat]

  // Nuevas variables para "Lugares Especiales" (Recuerdos)
  activeSegment: 'registrar' | 'historial' = 'registrar';
  predefinidos: string[] = [
    'Lugar del primer beso 💋',
    'Donde nos conocimos 🤝',
    'Primera cita ☕',
    'Propuesta de noviazgo 💍',
    'Cena especial 🍷',
    'Nuestra cafetería 🥞'
  ];
  registeredGeozones: any[] = [];
  private geozoneMarkers: Map<string, any> = new Map();

  // Variables de SOS
  isSosModalOpen: boolean = false;
  sosAlerts: any[] = [];
  playingAudioUrl: string | null = null;
  audioObj: HTMLAudioElement | null = null;
  userId: string = '';

  constructor(
    private supabaseSvc: SupabaseService,
    private geolocationService: GeolocationService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private notificationSvc: NotificationService
  ) {
    addIcons({ 
      addCircleOutline, 
      cogOutline, 
      warningOutline, 
      square, 
      locationOutline, 
      checkmarkCircleOutline, 
      closeOutline,
      trashOutline,
      alertCircleOutline,
      alertCircle,
      playOutline,
      pauseOutline,
      musicalNotesOutline,
      ellipsisHorizontalOutline,
      'chevron-back-outline': chevronBackOutline
    });
  }

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async ionViewWillEnter() {
    await this.loadUserProfile();
  }

  ionViewDidEnter() {
    if (this.map) {
      this.map.resize();
    }
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
      const [profileRes, partnerData] = await Promise.all([
        this.supabaseSvc.getUserProfile(),
        this.supabaseSvc.getPartnerLocation()
      ]);

      const data = profileRes?.data;
      if (data) {
        this.userAvatarUrl = data.avatar_url || null;
      }

      if (partnerData) {
        this.partnerId = partnerData.id;
        this.partnerAvatarUrl = partnerData.avatarUrl;
        this.partnerName = partnerData.name;
        this.partnerLat = partnerData.latitude;
        this.partnerLng = partnerData.longitude;
        
        if (partnerData.latitude && partnerData.longitude) {
          localStorage.setItem('partner_last_lat', String(partnerData.latitude));
          localStorage.setItem('partner_last_lng', String(partnerData.longitude));
        }
      }

      // Forzar actualización inmediata de las imágenes de los marcadores si ya existen
      if (this.userMarker && this.currentLat && this.currentLng) {
        this.updateUserMarker(this.currentLat, this.currentLng);
      }
      if (this.partnerMarker && this.partnerLat && this.partnerLng) {
        this.updatePartnerMarker(this.partnerLat, this.partnerLng);
      }
    } catch (error) {
      console.error('Error al cargar perfil en mapa:', error);
    }
  }

  // Dibujar o actualizar marcador de Usuario (Borde Rosa)
  private updateUserMarker(lat: number, lng: number) {
    this.currentLat = lat;
    this.currentLng = lng;
    
    localStorage.setItem('user_last_lat', String(lat));
    localStorage.setItem('user_last_lng', String(lng));

    if (!this.map) return;

    if (!this.userMarker) {
      const el = document.createElement('div');
      el.style.backgroundImage = `url(${this.userAvatarUrl || '/assets/images/user.png'})`;
      el.style.width = '46px';
      el.style.height = '46px';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #df5b61';
      el.style.boxShadow = '0 0 10px rgba(223, 91, 97, 0.7), 0 4px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML('<p style="margin:0;font-weight:700;color:#df5b61;font-size:13px;font-family:inherit;text-align:center;">¡Tú estás aquí! 💖</p>');

      this.userMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map);
    } else {
      this.userMarker.setLngLat([lng, lat]);
      
      // Actualizar la foto de perfil en el marcador existente por si cambió
      const el = this.userMarker.getElement();
      if (el) {
        el.style.backgroundImage = `url(${this.userAvatarUrl || '/assets/images/user.png'})`;
      }
    }

    this.recalculateDistance();
  }

  // Dibujar o actualizar marcador de Pareja (Borde Azul)
  private updatePartnerMarker(lat: number, lng: number) {
    this.partnerLat = lat;
    this.partnerLng = lng;

    localStorage.setItem('partner_last_lat', String(lat));
    localStorage.setItem('partner_last_lng', String(lng));

    if (!this.map) return;

    if (!this.partnerMarker) {
      const el = document.createElement('div');
      el.style.backgroundImage = `url(${this.partnerAvatarUrl || '/assets/images/user.png'})`;
      el.style.width = '46px';
      el.style.height = '46px';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #3880ff';
      el.style.boxShadow = '0 0 10px rgba(56, 128, 255, 0.7), 0 4px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`<p style="margin:0;font-weight:700;color:#3880ff;font-size:13px;font-family:inherit;text-align:center;">${this.partnerName} está aquí 📍</p>`);

      this.partnerMarker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(this.map);
    } else {
      this.partnerMarker.setLngLat([lng, lat]);

      // Actualizar la foto de perfil del partner por si cambió
      const el = this.partnerMarker.getElement();
      if (el) {
        el.style.backgroundImage = `url(${this.partnerAvatarUrl || '/assets/images/user.png'})`;
      }
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

  private centerMapOnUser(lat: number, lng: number) {
    if (!this.map) {
      return;
    }
    this.map.panTo([lng, lat], { duration: 500 });
  }

  private async initMap(): Promise<void> {
    // Coordenadas por defecto (Santiago, Chile) o tomadas de la caché para carga instantánea
    const cachedUserLat = localStorage.getItem('user_last_lat');
    const cachedUserLng = localStorage.getItem('user_last_lng');
    const cachedPartnerLat = localStorage.getItem('partner_last_lat');
    const cachedPartnerLng = localStorage.getItem('partner_last_lng');

    let lat = cachedUserLat ? parseFloat(cachedUserLat) : -33.447487;
    let lng = cachedUserLng ? parseFloat(cachedUserLng) : -70.673676;

    if (cachedPartnerLat && cachedPartnerLng) {
      this.partnerLat = parseFloat(cachedPartnerLat);
      this.partnerLng = parseFloat(cachedPartnerLng);
    }

    // Inicializamos el mapa con la ubicación por defecto o en caché usando Mapbox GL JS
    mapboxgl.accessToken = environment.mapboxToken;
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: cachedUserLat ? 15 : 13,
      attributionControl: true
    });

    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 300);

    // Dibujar marcadores iniciales usando la caché (instantáneo)
    this.updateUserMarker(lat, lng);
    if (this.partnerLat && this.partnerLng) {
      this.updatePartnerMarker(this.partnerLat, this.partnerLng);
      this.fitBothMarkers();
    }

    // Cargar información de perfiles y pareja asíncronamente en segundo plano
    this.loadUserProfile().then(() => {
      if (this.partnerLat && this.partnerLng) {
        this.updatePartnerMarker(this.partnerLat, this.partnerLng);
        this.fitBothMarkers();
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
    }).catch(err => console.warn('Error cargando perfiles en background:', err));

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
        if (this.map) {
          this.map.flyTo({ center: [position.longitude, position.latitude], zoom: 17, duration: 1000 });
        }
        this.isFirstLocationLock = true;
      } else {
        this.centerMapOnUser(position.latitude, position.longitude);
      }
      
      await this.supabaseSvc.updateUserLocation(position.latitude, position.longitude);
    });

    // 3. Intentamos obtener la posición inicial del GPS rápidamente
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
        if (this.map) {
          this.map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
        }
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

    // 5. Cargar lugares especiales en el mapa de forma asíncrona
    this.cargarLugaresEspeciales().catch((err) => {
      console.warn('Error al cargar lugares especiales:', err);
    });
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
      
      // Detectar formato de audio soportado por el dispositivo/navegador
      let mimeType = '';
      const types = ['audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav'];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const options = mimeType ? { mimeType } : {};
      this.mediaRecorder = new MediaRecorder(stream, options);
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
    const recordedMimeType = this.mediaRecorder.mimeType || 'audio/webm';
    
    // Configuramos el callback para cuando el MediaRecorder se detenga
    this.mediaRecorder.onstop = async () => {
      const loading = await this.loadingCtrl.create({
        message: 'Enviando alerta SOS...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const audioBlob = new Blob(this.audioChunks, { type: recordedMimeType });
        
        // 1. Obtener coordenadas actuales
        const currentLocation = await this.geolocationService.getCurrentPosition();
        const lat = currentLocation.latitude;
        const lng = currentLocation.longitude;

        // Convertir el audio a Data URI completo (mantiene la cabecera del tipo de audio)
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            resolve(reader.result as string);
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
        this.map.flyTo({ center: [this.currentLng, this.currentLat], zoom: 17, duration: 1200 });
      }
    } else {
      this.showToast('Tu ubicación no está disponible todavía.', 'warning');
    }
  }

  centrarEnPareja() {
    if (this.partnerLat && this.partnerLng) {
      if (this.map) {
        this.map.flyTo({ center: [this.partnerLng, this.partnerLat], zoom: 17, duration: 1200 });
      }
    } else {
      this.showToast('La ubicación de tu pareja no está disponible.', 'warning');
    }
  }

  async abrirRegistrarLugar() {
    this.nuevoLugarNombre = '';
    this.searchQuery = '';
    this.suggestions = [];
    this.direccionSeleccionada = '';
    this.selectedCoordinates = null;
    this.activeSegment = 'registrar';
    this.isModalOpen = true;

    // Cargar los lugares especiales actuales en memoria
    await this.cargarLugaresEspeciales();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onModalDismiss() {
    this.isModalOpen = false;
  }

  // Pre-rellenar el nombre del lugar especial usando las sugerencias de la app
  seleccionarPredefinido(presetName: string) {
    this.nuevoLugarNombre = presetName;
  }

  // Cargar geozonas de Supabase y agregarlas como marcadores interactivos en Mapbox
  async cargarLugaresEspeciales() {
    // 1. Limpiar marcadores viejos para evitar duplicados
    this.geozoneMarkers.forEach((marker: any) => marker.remove());
    this.geozoneMarkers.clear();

    // 2. Cargar de Supabase
    this.registeredGeozones = await this.supabaseSvc.getGeozones();

    // 3. Agregar marcadores Mapbox
    if (!this.map) return;

    this.registeredGeozones.forEach((zone: any) => {
      const el = document.createElement('div');
      el.className = 'special-place-marker';
      el.style.background = '#df5b61';
      el.style.color = 'white';
      el.style.width = '38px';
      el.style.height = '38px';
      el.style.borderRadius = '50%';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.boxShadow = '0 4px 12px rgba(223, 91, 97, 0.5)';
      el.style.border = '2px solid white';
      el.style.fontSize = '16px';
      el.style.cursor = 'pointer';
      el.innerText = '💖';

      const popupHtml = `
        <div style="font-family: inherit; text-align: center; padding: 4px;">
          <h4 style="margin: 0 0 4px; color: #df5b61; font-weight: 700; font-size: 14px;">${zone.name}</h4>
          <span style="font-size: 10px; background: #fbecec; color: #df5b61; padding: 2px 6px; border-radius: 10px; font-weight: 600;">Zona de Geofencing Activa</span>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([zone.longitude, zone.latitude])
        .setPopup(popup)
        .addTo(this.map);

      this.geozoneMarkers.set(zone.id, marker);
    });
  }

  // Genera un mapa estático de Mapbox centrado en la geocerca con un pin en forma de corazón
  getStaticMapUrl(longitude: number, latitude: number): string {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-heart+df5b61(${longitude},${latitude})/${longitude},${latitude},14.5/350x180@2x?access_token=${environment.mapboxToken}`;
  }

  // Centra la cámara principal de la app en la geocerca seleccionada y abre su popup descriptivo
  verGeozonaEnMapa(zone: any) {
    this.isModalOpen = false;
    
    if (this.map) {
      this.map.flyTo({ center: [zone.longitude, zone.latitude], zoom: 16, duration: 1200 });
      
      // Abrir el popup del marcador si existe
      const marker = this.geozoneMarkers.get(zone.id);
      if (marker) {
        setTimeout(() => {
          marker.togglePopup();
        }, 1200);
      }
    }
  }

  // Eliminar la geozona seleccionada tanto de Supabase como de la vista interactiva
  async eliminarGeozona(zone: any) {
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar "${zone.name}" de tus recuerdos especiales?`);
    if (!confirm) return;

    const loading = await this.loadingCtrl.create({
      message: 'Eliminando lugar...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { error } = await this.supabaseSvc.deleteGeozone(zone.id);
      if (error) throw error;

      this.showToast(`Lugar "${zone.name}" eliminado con éxito.`, 'success');
      // Recargar lista y marcadores en mapa
      await this.cargarLugaresEspeciales();
      await this.notificationSvc.reloadGeozones();
    } catch (err) {
      console.error('Error al eliminar geozona:', err);
      this.showToast('No se pudo eliminar el lugar especial.', 'warning');
    } finally {
      await loading.dismiss();
    }
  }

  async buscarDireccion(event: any) {
    const query = event.target.value;
    if (!query || query.trim().length < 3) {
      this.suggestions = [];
      return;
    }

    this.isLoadingSuggestions = true;
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${environment.mapboxToken}&limit=5&language=es`;
      const res = await fetch(url);
      const data = await res.json();
      this.suggestions = (data.features || []).map((f: any) => ({
        text: f.text,
        place_name: f.place_name,
        coordinates: f.geometry.coordinates // [lng, lat]
      }));
    } catch (err) {
      console.error('Error al consultar geocoding de Mapbox:', err);
    } finally {
      this.isLoadingSuggestions = false;
    }
  }

  seleccionarSugerencia(suggestion: any) {
    this.direccionSeleccionada = suggestion.place_name;
    this.selectedCoordinates = suggestion.coordinates; // [lng, lat]
    this.searchQuery = suggestion.text;
    this.suggestions = [];
  }

  async confirmarRegistroLugar() {
    if (!this.nuevoLugarNombre || !this.selectedCoordinates) {
      return;
    }

    const [lng, lat] = this.selectedCoordinates;
    this.isModalOpen = false;

    const loading = await this.loadingCtrl.create({
      message: 'Registrando lugar en base de datos...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Guardar en la base de datos de Supabase
      const { data, error } = await this.supabaseSvc.createGeozone(this.nuevoLugarNombre, lat, lng);
      if (error) throw error;

      this.showToast(`¡Lugar "${this.nuevoLugarNombre}" registrado con éxito!`, 'success');
      
      // Recargar geozonas para redibujar el mapa y actualizar el historial
      await this.cargarLugaresEspeciales();
      await this.notificationSvc.reloadGeozones();

      // Centrar el mapa en la nueva geocerca
      if (this.map) {
        this.map.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 });
        
        // Abrir el popup del nuevo marcador
        setTimeout(() => {
          const marker = this.geozoneMarkers.get(data.id);
          if (marker) marker.togglePopup();
        }, 1200);
      }
    } catch (err) {
      console.error('Error al guardar geozona:', err);
      this.showToast('No se pudo guardar el lugar especial en la base de datos.', 'warning');
    } finally {
      await loading.dismiss();
    }
  }

  async abrirHistorialSos() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando historial SOS...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const user = await this.supabaseSvc.getCurrentUser();
      if (user) {
        this.userId = user.id;
      }
      
      const { data, error } = await this.supabaseSvc.getSosAlerts();
      if (!error && data) {
        // Map raw audio field if needed. The database stores it in alert.audio_url.
        // If audio_url is base64, we can play base64 audio directly in browsers.
        // Let's normalize base64 strings so they are playable:
        this.sosAlerts = data.map((alert: any) => {
          let audio_url = alert.audio_url;
          if (audio_url && !audio_url.startsWith('http') && !audio_url.startsWith('data:')) {
            // It is raw base64 data, convert to data URI:
            audio_url = `data:audio/webm;base64,${audio_url}`;
          }
          return {
            ...alert,
            audio_url
          };
        });
      }
    } catch (err) {
      console.error('Error fetching SOS alerts:', err);
    } finally {
      await loading.dismiss();
    }

    this.isSosModalOpen = true;
  }

  closeSosModal() {
    this.isSosModalOpen = false;
  }

  toggleAudio(url: string) {
    if (this.playingAudioUrl === url) {
      if (this.audioObj) {
        this.audioObj.pause();
      }
      this.playingAudioUrl = null;
      this.audioObj = null;
    } else {
      if (this.audioObj) {
        this.audioObj.pause();
      }
      this.playingAudioUrl = url;
      this.audioObj = new Audio(url);
      this.audioObj.play();
      this.audioObj.onended = () => {
        this.playingAudioUrl = null;
        this.audioObj = null;
      };
    }
  }

  centrarAlertaEnMapa(alert: any) {
    this.isSosModalOpen = false;
    if (this.map) {
      this.map.flyTo({ center: [alert.longitude, alert.latitude], zoom: 17, duration: 1200 });
      new mapboxgl.Popup({ offset: 25 })
        .setLngLat([alert.longitude, alert.latitude])
        .setHTML(`<p style="margin:0;font-weight:700;color:#FA8072;font-size:13px;text-align:center;">🚨 Alerta SOS</p>`)
        .addTo(this.map);
    }
  }

}