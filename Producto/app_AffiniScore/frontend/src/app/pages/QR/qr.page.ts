import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent,
  IonLabel, IonInput, IonSpinner,
  ToastController, LoadingController, NavController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heartOutline, qrCodeOutline, scanOutline, cameraOutline,
  copyOutline, informationCircle, cameraReverseOutline, videocamOffOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { QRCodeComponent } from 'angularx-qrcode';

// Importación flexible para evitar errores de tipos
import * as Html5QrcodeLib from 'html5-qrcode';
const Html5Qrcode = (Html5QrcodeLib as any).Html5Qrcode;

@Component({
  selector: 'app-qr',
  templateUrl: './qr.page.html',
  styleUrls: ['./qr.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
    IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent,
    IonLabel, IonInput, IonSpinner,
    CommonModule, FormsModule, QRCodeComponent
  ]
})
export class QrPage implements OnInit, OnDestroy {
  activeTab: 'qr' | 'scan' = 'qr';
  isManualMode: boolean = false;

  qrData = signal<string>('');
  shortCode = signal<string>('');

  manualCode: string = '';
  // CORRECCIÓN TS2709: Se usa any para evitar conflictos de namespace
  private html5Qrcode: any = null;
  private currentUserId: string | null = null;
  private partnershipSubscription: any = null;

  isCameraReady = false;
  cameraError: string | null = null;
  hasMultipleCameras = false;
  private cameras: any[] = [];
  private currentCameraIndex = 0;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      heartOutline, qrCodeOutline, scanOutline, cameraOutline,
      copyOutline, informationCircle, cameraReverseOutline, videocamOffOutline
    });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user?.id) {
      this.currentUserId = user.id;
      this.setupPartnershipSubscription();
    }
  }

  async setupPartnershipSubscription() {
    if (!this.currentUserId) return;

    this.partnershipSubscription = this.supabaseSvc.supabase
      .channel('qr-partnership-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partnerships',
        },
        async (payload: any) => {
          const updated = payload.new;
          if (updated.user1_id === this.currentUserId && updated.status === 'active') {
            console.log('Detectada vinculación en tiempo real desde QR');
            let partnerName = 'tu pareja';
            if (updated.user2_id) {
              const { data: partnerProfile } = await this.supabaseSvc.supabase
                .from('profiles')
                .select('full_name')
                .eq('id', updated.user2_id)
                .single();
              if (partnerProfile?.full_name) {
                partnerName = partnerProfile.full_name;
              }
            }

            const successToast = await this.toastCtrl.create({
              message: `¡Vinculación exitosa con ${partnerName}!`,
              duration: 3000,
              color: 'success',
              position: 'top'
            });
            await successToast.present();

            this.navCtrl.navigateRoot('/profile', { animationDirection: 'forward' });
          }
        }
      )
      .subscribe();
  }

  async loadInviteCode() {
    if (!this.currentUserId) {
      alert('Error: No se pudo obtener la información de tu cuenta. Intenta cerrar sesión y volver a entrar.');
      return;
    }
    const response = await this.supabaseSvc.invitePartner(this.currentUserId);
    if (response.token) {
      const token = response.token;
      this.qrData.set(`affiniscore_link_${token}`);
      this.shortCode.set(token.split('').join(' '));
    } else {
      this.qrData.set('');
      this.shortCode.set('');
    }
  }
  // Nuevo método para limpiar el código QR
  clearInviteCode() {
    this.qrData.set('');
    this.shortCode.set('');
  }

  ngOnDestroy() {
    this.stopScanner();
    if (this.partnershipSubscription) {
      this.supabaseSvc.supabase.removeChannel(this.partnershipSubscription);
    }
  }

  async switchTab(tab: 'qr' | 'scan') {
    this.activeTab = tab;
    this.isManualMode = false;
    if (tab === 'scan') {
      setTimeout(() => this.startScanner(), 300);
    } else {
      await this.stopScanner();
    }
  }

  async toggleManualMode() {
    this.isManualMode = !this.isManualMode;
    if (this.isManualMode) {
      await this.stopScanner();
    } else {
      setTimeout(() => this.startScanner(), 300);
    }
  }

  async linkManualCode() {
    if (!this.manualCode || this.manualCode.length < 6) return;
    await this.processJoin(this.manualCode.toUpperCase().trim());
  }

  async processJoin(token: string) {
    if (!this.currentUserId) return;
    const cleanToken = token.replace(/\s/g, '').toUpperCase();

    const loading = await this.loadingCtrl.create({
      message: 'Buscando pareja...',
      spinner: 'crescent'
    });
    await loading.present();

    const partnerInfo = await this.supabaseSvc.getPartnerNameByToken(cleanToken);
    await loading.dismiss();

    if (partnerInfo.error) {
      const toast = await this.toastCtrl.create({
        message: partnerInfo.error,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar Vinculación',
      mode: 'ios',
      cssClass: 'custom-alert-light',
      message: `¿Deseas vincular tu cuenta con ${partnerInfo.name}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Vinculación cancelada');
          }
        },
        {
          text: 'Sí, vincular',
          handler: async () => {
            const joinLoading = await this.loadingCtrl.create({
              message: 'Vinculando...',
              spinner: 'crescent'
            });
            await joinLoading.present();
            
            const response = await this.supabaseSvc.joinPartnership(cleanToken, this.currentUserId!);
            await joinLoading.dismiss();

            if (response.success) {
              await this.stopScanner();
              const successToast = await this.toastCtrl.create({
                message: 'Vinculación exitosa',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              await successToast.present();
              
              // Pequeño retardo para asegurar que el toast se vea y luego forzar la navegación
              setTimeout(() => {
                this.navCtrl.navigateRoot('/profile', { animationDirection: 'forward' });
              }, 1200);
            } else {
              const toast = await this.toastCtrl.create({
                message: response.error || 'Ocurrió un error.',
                duration: 3000,
                color: 'danger',
                position: 'top'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async copyCode() {
    const rawCode = this.shortCode().replace(/\s/g, '');
    await navigator.clipboard.writeText(rawCode);
  }

  private async startScanner() {
    if (this.html5Qrcode) return;
    this.isCameraReady = false;
    this.cameraError = null;

    try {
      // Solicitar permisos de cámara formalmente a través de getUserMedia para forzar el prompt nativo
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop()); // Detener stream para no bloquear
        } catch (e) {
          console.warn('getUserMedia error requesting camera permission:', e);
        }
      }

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        this.cameras = devices;
        this.hasMultipleCameras = devices.length > 1;
        this.currentCameraIndex = devices.length > 1 ? 1 : 0;
        await this.initCamera(this.cameras[this.currentCameraIndex].id);
      } else {
        this.cameraError = "No se encontraron cámaras.";
      }
    } catch (err) {
      this.cameraError = "Permiso de cámara denegado.";
    }
  }

  private async initCamera(cameraId: string) {
    try {
      this.html5Qrcode = new Html5Qrcode("qr-reader");
      const config: any = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await this.html5Qrcode.start(
        cameraId,
        config,
        async (decodedText: string) => {
          const token = decodedText.includes('affiniscore_link_')
            ? decodedText.replace('affiniscore_link_', '')
            : decodedText;
          await this.stopScanner();
          await this.processJoin(token);
        },
        () => { }
      );
      this.isCameraReady = true;
    } catch (err) {
      this.cameraError = "Error al iniciar el lente.";
    }
  }

  async flipCamera() {
    if (!this.hasMultipleCameras) return;
    await this.stopScanner();
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
    setTimeout(() => this.initCamera(this.cameras[this.currentCameraIndex].id), 400);
  }

  retryCamera() {
    this.startScanner();
  }

  private async stopScanner() {
    this.isCameraReady = false;
    if (this.html5Qrcode) {
      try {
        await this.html5Qrcode.stop();
        this.html5Qrcode.clear();
      } catch (e) {
        console.warn('Escáner ya detenido.');
      }
      this.html5Qrcode = null;
    }
  }
}