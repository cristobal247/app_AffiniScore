import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonButtons, IonBackButton, IonModal, IonCard, IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartOutline, qrCodeOutline, scanOutline, cameraOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import { QRCodeComponent } from 'angularx-qrcode';

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

  constructor(private supabaseSvc: SupabaseService) {
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

  closeScanner() {
    this.isScannerOpen = false;
  }
}
