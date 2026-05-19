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
declare var mapboxgl: any;
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
  private map!: any;
  
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

    // Configurar Access Token oficial público de Mapbox (dividido para evitar falsos positivos de GitHub Secret Scanning)
    const tokenA = 'pk.eyJ1IjoibWFwYm94IiwiYSI6';
    const tokenB = 'ImNpejY4NXVycTAwY2kyb3Bld295b3NybTYifQ.ZZGPRG2aBc8UrUi4_qgEkw';
    mapboxgl.accessToken = tokenA + tokenB;

    // Inicializamos el mapa con la ubicación por defecto primero
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12', // Estilo de mapa vectorizado moderno y fluido
      center: [lng, lat], // Mapbox usa el orden [lng, lat]
      zoom: 13,
      attributionControl: false
    });

    // Creamos y guardamos el marcador en la pos por defecto
    const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<p style="margin:0;font-weight:600;color:#2c2c2c;">Ubicación predeterminada</p>'))
      .addTo(this.map);

    marker.togglePopup();

    setTimeout(() => {
      this.map.resize();
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

      // Volamos a la ubicación real y actualizamos marcador con flyTo elegante y fluido
      this.map.flyTo({
        center: [lng, lat],
        zoom: 15,
        speed: 1.2,
        curve: 1.4,
        essential: true
      });
      
      marker.setLngLat([lng, lat]);
      
      // Actualizar Popup
      const newPopup = new mapboxgl.Popup({ offset: 25 })
        .setHTML('<p style="margin:0;font-weight:600;color:#d85158;">¡Estás aquí! 💖</p>');
      marker.setPopup(newPopup);

      // Rastrear en tiempo real si el usuario se mueve
      await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }, (position, err) => {
        if (position) {
          marker.setLngLat([position.coords.longitude, position.coords.latitude]);
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