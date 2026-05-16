import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
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
import { Geolocation } from '@capacitor/geolocation';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase';
import { LocationService } from '../../services/location.service';

type MapMode = 'mapbox' | 'leaflet';

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
  private map: mapboxgl.Map | null = null;
  private geolocationWatchId: string | null = null;

  isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  userAvatarUrl: string | null = null;

  mapMode: MapMode = 'mapbox';
  distanceToDestination = 0;
  estimatedTravelMinutes = 0;
  destinationName = 'Café del Corazón';
  destinationLatitude = -33.4451;
  destinationLongitude = -70.6674;
  currentLatitude = -33.447487;
  currentLongitude = -70.673676;

  constructor(
    private supabaseSvc: SupabaseService,
    private locationService: LocationService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async ionViewWillEnter() {
    await this.loadUserProfile();
  }

  async ngAfterViewInit() {
    await this.initMap();
  }

  ngOnDestroy() {
    if (this.geolocationWatchId) {
      Geolocation.clearWatch({ id: this.geolocationWatchId });
    }

    this.map?.remove();
    this.map = null;
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
    if (environment.mapboxToken) {
      await this.initMapboxMap();
      return;
    }

    this.mapMode = 'leaflet';
    await this.initLeafletFallback();
  }

  private async initMapboxMap(): Promise<void> {
    this.mapMode = 'mapbox';
    mapboxgl.accessToken = environment.mapboxToken;

    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [this.currentLongitude, this.currentLatitude],
      zoom: 13,
      attributionControl: false
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    this.map.on('load', async () => {
      await this.refreshCoordinates();
      this.renderMapboxMarkers();
      this.beginGeolocationWatch();
      this.map?.resize();
    });

    setTimeout(() => this.map?.resize(), 500);
  }

  private async initLeafletFallback(): Promise<void> {
    const leaflet = await import('leaflet');
    const L = leaflet as any;

    await this.refreshCoordinates();

    const map = L.map('map', {
      center: [this.currentLatitude, this.currentLongitude],
      zoom: 13,
      zoomControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-user-marker',
      html: this.buildUserMarkerHtml(),
      iconSize: [44, 50],
      iconAnchor: [22, 50],
      popupAnchor: [0, -50]
    });

    L.marker([this.currentLatitude, this.currentLongitude], { icon: customIcon })
      .addTo(map)
      .bindPopup('<b>Tu ubicación</b>')
      .openPopup();

    L.marker([this.destinationLatitude, this.destinationLongitude], {
      icon: L.divIcon({
        className: 'custom-destination-marker',
        html: '<div class="leaflet-destination-dot">♡</div>',
        iconSize: [44, 44],
        iconAnchor: [22, 44]
      })
    }).addTo(map).bindPopup(`<b>${this.destinationName}</b>`);

    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    this.beginGeolocationWatch();
  }

  private renderMapboxMarkers(): void {
    if (!this.map) {
      return;
    }

    const userMarkerElement = document.createElement('div');
    userMarkerElement.className = 'mapbox-user-marker';
    userMarkerElement.innerHTML = this.buildUserMarkerHtml();

    new mapboxgl.Marker({ element: userMarkerElement, anchor: 'bottom' })
      .setLngLat([this.currentLongitude, this.currentLatitude])
      .addTo(this.map);

    const destinationMarkerElement = document.createElement('div');
    destinationMarkerElement.className = 'mapbox-destination-marker';
    destinationMarkerElement.innerHTML = '<span>♡</span>';

    new mapboxgl.Marker({ element: destinationMarkerElement, anchor: 'bottom' })
      .setLngLat([this.destinationLongitude, this.destinationLatitude])
      .addTo(this.map);

    this.map.flyTo({
      center: [this.currentLongitude, this.currentLatitude],
      zoom: 15,
      essential: true
    });

    this.updateDistanceStats();
  }

  private buildUserMarkerHtml(): string {
    return this.userAvatarUrl
      ? `<img src="${this.userAvatarUrl}" alt="Tu" />`
      : '<span>Tú</span>';
  }

  private beginGeolocationWatch(): void {
    if (this.geolocationWatchId) {
      return;
    }

    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      position => {
        if (!position) {
          return;
        }

        this.currentLatitude = position.coords.latitude;
        this.currentLongitude = position.coords.longitude;
        this.updateDistanceStats();
      }
    ).then(id => {
      this.geolocationWatchId = id;
    }).catch(error => {
      console.warn('No se pudo iniciar el seguimiento GPS:', error);
    });
  }

  private async refreshCoordinates(): Promise<void> {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      this.currentLatitude = coordinates.coords.latitude;
      this.currentLongitude = coordinates.coords.longitude;
    } catch (error) {
      console.warn('No se pudo obtener la ubicación exacta, se usará la última conocida:', error);
    }

    this.updateDistanceStats();
  }

  private updateDistanceStats(): void {
    this.distanceToDestination = Math.round(
      this.locationService.calculateHaversineDistance(
        this.currentLatitude,
        this.currentLongitude,
        this.destinationLatitude,
        this.destinationLongitude
      )
    );

    this.estimatedTravelMinutes = Math.max(1, Math.round(this.distanceToDestination / 200));
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

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.showToast('Grabando audio SOS... Vuelve a tocar para enviar', 'danger');
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      this.showToast('No se pudo acceder al micrófono', 'warning');
    }
  }

  private async stopRecordingAndSend() {
    if (!this.mediaRecorder) {
      return;
    }

    this.isRecording = false;

    this.mediaRecorder.onstop = async () => {
      const loading = await this.loadingCtrl.create({
        message: 'Enviando alerta SOS...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        let lat = this.currentLatitude;
        let lng = this.currentLongitude;
        try {
          const coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
          lat = coordinates.coords.latitude;
          lng = coordinates.coords.longitude;
        } catch (geoErr) {
          console.warn('GPS falló durante SOS, usando coordenadas actuales:', geoErr);
        }

        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = () => reject(new Error('Error al leer el archivo de audio'));
        });

        const { error: dbError } = await this.supabaseSvc.sendSosAlert(lat, lng, base64Audio);

        if (dbError) {
          throw new Error('Supabase: ' + dbError);
        }

        await loading.dismiss();
        this.showToast('¡Alerta SOS enviada con éxito!', 'success');
      } catch (error: unknown) {
        console.error('Error en el flujo SOS:', error);
        await loading.dismiss();

        const errStr = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
        this.showToast('Error: ' + errStr, 'danger');
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
}
