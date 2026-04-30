import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton, IonCard, IonCardContent, IonToggle,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline, cameraOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

export interface PrivacySettings {
  profileVisibleToPartner: boolean;
  showStreak: boolean;
  shareActivityStatus: boolean;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  dailyReminder: boolean;
  challengeInvites: boolean;
  scoreMilestones: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
    IonIcon, IonItem, IonLabel, IonList, IonToggle,
    IonButtons, IonBackButton, IonCard, IonCardContent,
    CommonModule, FormsModule
  ]
})
export class ProfilePage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  userEmail: string | undefined = '';
  
  privacySettings: PrivacySettings = {
    profileVisibleToPartner: true,
    showStreak: true,
    shareActivityStatus: true,
  };
  
  notificationSettings: NotificationSettings = {
    pushEnabled: false,
    dailyReminder: true,
    challengeInvites: true,
    scoreMilestones: true,
  };

  avatarUrl: string | null = null;
  isUploading = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline, cameraOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    this.userEmail = user?.email;

    const { data: profile } = await this.supabaseSvc.getUserProfile();
    if (profile && profile.avatar_url) {
      this.avatarUrl = profile.avatar_url;
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Subiendo imagen...',
      mode: 'ios'
    });
    await loading.present();

    const uploadRes = await this.supabaseSvc.uploadAvatar(file);
    
    if (uploadRes.error) {
      this.showToast('Error al subir la imagen: ' + uploadRes.error, 'danger');
    } else if (uploadRes.publicUrl) {
      const updateRes = await this.supabaseSvc.updateAvatarUrl(uploadRes.publicUrl);
      if (updateRes.error) {
        this.showToast('Error al actualizar el perfil.', 'danger');
      } else {
        this.avatarUrl = uploadRes.publicUrl;
        this.showToast('Foto de perfil actualizada.', 'success');
      }
    }

    this.isUploading = false;
    await loading.dismiss();
    event.target.value = null; // Reset input
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

  goToQr() {
    this.router.navigateByUrl('/qr');
  }

  onPrivacyChange(): void {
    console.log('Privacy updated', this.privacySettings);
  }

  onNotificationChange(): void {
    console.log('Notifications updated', this.notificationSettings);
  }

  enablePushNotifications(): void {
    this.notificationSettings.pushEnabled = true;
    console.log('Push notifications enabled');
  }

  sendTestNotification(): void {
    console.log('Test notification sent');
  }

  async logout() {
    const loading = await this.loadingCtrl.create({
      message: 'Cerrando sesión...',
      mode: 'ios'
    });
    await loading.present();

    await this.supabaseSvc.signOut();
    
    await loading.dismiss();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}