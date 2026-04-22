import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton, IonCard, IonCardContent, IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline } from 'ionicons/icons';
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

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    this.userEmail = user?.email;
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