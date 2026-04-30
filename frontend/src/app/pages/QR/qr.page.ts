import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent,
  IonLabel, IonInput,
  ToastController, LoadingController, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartOutline, qrCodeOutline, scanOutline, cameraOutline, copyOutline, informationCircle } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { QRCodeComponent } from 'angularx-qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

@Component({
  selector: 'app-qr',
  templateUrl: './qr.page.html',
  styleUrls: ['./qr.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
    IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent,
    IonLabel, IonInput,
    CommonModule, FormsModule, QRCodeComponent
  ]
})
export class QrPage implements OnInit, OnDestroy {
  activeTab: 'qr' | 'scan' = 'qr';
  isManualMode: boolean = false;
  
  // Usamos signals o propiedades reactivas
  qrData = signal<string>('cargando...');
  shortCode = signal<string>('...');
  
  manualCode: string = '';
  private html5QrcodeScanner: any | null = null;
  private currentUserId: string | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController
  ) {
    addIcons({ heartOutline, qrCodeOutline, scanOutline, cameraOutline, copyOutline, informationCircle });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user?.id) {
      this.currentUserId = user.id;
      await this.loadInviteCode(user.id);
    }
  }

  async loadInviteCode(userId: string) {
    const response = await this.supabaseSvc.invitePartner(userId);
    if (response.token) {
      const token = response.token;
      this.qrData.set(`affiniscore_link_${token}`);
      // Formatear el token corto (ej. A F 4 5 B 2)
      this.shortCode.set(token.split('').join(' '));
    } else {
      // Fallback
      this.qrData.set(`affiniscore_link_${userId}`);
      const short = userId.substring(0, 6).toUpperCase();
      this.shortCode.set(short.split('').join(' '));
      
      const toast = await this.toastCtrl.create({
        message: response.error || 'Error obteniendo código real. Usando código local.',
        duration: 3000,
        color: 'warning'
      });
      toast.present();
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  switchTab(tab: 'qr' | 'scan') {
    this.activeTab = tab;
    this.isManualMode = false;
    if (tab === 'scan') {
      setTimeout(() => this.startScanner(), 300);
    } else {
      this.stopScanner();
    }
  }

  toggleManualMode() {
    this.isManualMode = !this.isManualMode;
    if (this.isManualMode) {
      this.stopScanner();
    } else {
      setTimeout(() => this.startScanner(), 300);
    }
  }

  async linkManualCode() {
    if (!this.manualCode || this.manualCode.length < 6) return;
    await this.processJoin(this.manualCode);
  }

  async processJoin(token: string) {
    if (!this.currentUserId) return;

    const loading = await this.loadingCtrl.create({
      message: 'Vinculando cuentas...',
      spinner: 'circles'
    });
    await loading.present();

    const response = await this.supabaseSvc.joinPartnership(token, this.currentUserId);
    await loading.dismiss();

    if (response.success) {
      const toast = await this.toastCtrl.create({
        message: '¡Vinculación de pareja exitosa!',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      toast.present();
      
      // Detener escáner si está activo y volver al perfil
      this.stopScanner();
      this.navCtrl.navigateRoot('/tabs/profile', { animationDirection: 'back' });
    } else {
      const toast = await this.toastCtrl.create({
        message: response.error || 'Código inválido o caducado.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }

  async copyCode() {
    const rawCode = this.shortCode().replace(/\s/g, '');
    navigator.clipboard.writeText(rawCode);
    const toast = await this.toastCtrl.create({
      message: 'Código copiado al portapapeles',
      duration: 2000,
      position: 'top',
      color: 'dark'
    });
    toast.present();
  }

  private startScanner() {
    if (this.html5QrcodeScanner) return;
    this.html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    
    this.html5QrcodeScanner.render(async (decodedText: string) => {
      // Si escanea algo tipo "affiniscore_link_TOKEN" extraemos el token
      let tokenToJoin = decodedText;
      if (decodedText.startsWith('affiniscore_link_')) {
        tokenToJoin = decodedText.replace('affiniscore_link_', '');
      }
      
      this.stopScanner();
      await this.processJoin(tokenToJoin);
    }, undefined);
  }

  private stopScanner() {
    if (this.html5QrcodeScanner) {
      try {
        this.html5QrcodeScanner.clear();
      } catch (e) {
        console.error('Error al limpiar el escáner', e);
      }
      this.html5QrcodeScanner = null;
    }
  }
}
