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
  allowLocationSharing: boolean;
  allowRealtimeTracking: boolean;
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
    allowLocationSharing: true,
    allowRealtimeTracking: false,
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

    // Cargar el avatar del perfil
    const { data: profile } = await this.supabaseSvc.getUserProfile();
    if (profile && profile.avatar_url) {
      this.avatarUrl = profile.avatar_url;
    }

    // Cargar las configuraciones de privacidad desde Supabase
    const { data: privacyData } = await this.supabaseSvc.getPrivacySettings();
    if (privacyData) {
      this.privacySettings = {
        profileVisibleToPartner: privacyData.profile_visible_to_partner,
        showStreak: privacyData.show_streak,
        shareActivityStatus: privacyData.share_activity_status,
        allowLocationSharing: privacyData.allow_location_sharing ?? true,
        allowRealtimeTracking: privacyData.allow_realtime_tracking ?? false,
      };
    }

    // Cargar las configuraciones de notificaciones desde Supabase
    const { data: notifData } = await this.supabaseSvc.getNotificationSettings();
    if (notifData) {
      this.notificationSettings = {
        pushEnabled: notifData.push_enabled,
        dailyReminder: notifData.daily_reminder,
        challengeInvites: notifData.challenge_invites,
        scoreMilestones: notifData.score_milestones,
      };
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

  // Se dispara cuando el usuario cambia cualquier toggle de privacidad
  // Actualiza los valores en tiempo real en Supabase
  async onPrivacyChange(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Guardando configuración...',
      mode: 'ios'
    });
    await loading.present();

    const result = await this.supabaseSvc.updatePrivacySettings({
      profile_visible_to_partner: this.privacySettings.profileVisibleToPartner,
      show_streak: this.privacySettings.showStreak,
      share_activity_status: this.privacySettings.shareActivityStatus,
      allow_location_sharing: this.privacySettings.allowLocationSharing,
      allow_realtime_tracking: this.privacySettings.allowRealtimeTracking,
    });

    await loading.dismiss();

    if (result.error) {
      this.showToast('Error al guardar la configuración de privacidad.', 'danger');
      console.error('Privacy settings error:', result.error);
    } else {
      this.showToast('Configuración de privacidad actualizada.', 'success');
    }
  }

  // Se dispara cuando el usuario cambia cualquier toggle de notificaciones
  // Actualiza los valores en tiempo real en Supabase
  async onNotificationChange(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Guardando configuración...',
      mode: 'ios'
    });
    await loading.present();

    const result = await this.supabaseSvc.updateNotificationSettings({
      push_enabled: this.notificationSettings.pushEnabled,
      daily_reminder: this.notificationSettings.dailyReminder,
      challenge_invites: this.notificationSettings.challengeInvites,
      score_milestones: this.notificationSettings.scoreMilestones,
    });

    await loading.dismiss();

    if (result.error) {
      this.showToast('Error al guardar la configuración de notificaciones.', 'danger');
      console.error('Notification settings error:', result.error);
    } else {
      this.showToast('Configuración de notificaciones actualizada.', 'success');
    }
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