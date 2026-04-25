import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartOutline, qrCodeOutline, scanOutline, cameraOutline } from 'ionicons/icons';
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
    CommonModule, FormsModule, QRCodeComponent
  ]
})
export class QrPage implements OnInit {
  qrData: string = 'affiniscore_link_token_default';
  isScannerOpen: boolean = false;
  private html5QrcodeScanner: any | null = null;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({ heartOutline, qrCodeOutline, scanOutline, cameraOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user?.id) {
      this.qrData = `affiniscore_link_${user.id}`;
    }
  }

  openScanner() {
    this.isScannerOpen = true;
  }

  onModalDidPresent() {
    this.startScanner();
  }

  private startScanner() {
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
    }

    this.html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    this.html5QrcodeScanner.render(
      (decodedText: string) => this.onScanSuccess(decodedText),
      (errorMessage: string) => {
        // Ignoramos los errores de frame por defecto
      }
    );
  }

  async onScanSuccess(decodedText: string) {
    console.log(`Scan result: ${decodedText}`);
    
    // Detenemos el escáner y cerramos el modal
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
      this.html5QrcodeScanner = null;
    }
    this.isScannerOpen = false;

    // Aquí iría la lógica para enviar a Supabase la vinculación
    // Por ahora mostramos éxito:
    const toast = await this.toastCtrl.create({
      message: '¡Código detectado! Vinculación de pareja exitosa.',
      duration: 3000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }

  closeScanner() {
    this.isScannerOpen = false;
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
      this.html5QrcodeScanner = null;
    }
  }
}
