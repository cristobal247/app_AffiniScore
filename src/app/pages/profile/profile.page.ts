import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton, IonToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  notificationsOutline,
  checkmarkCircleOutline,
  phonePortraitOutline,
} from 'ionicons/icons';
import {
  NotificationSettings,
  PrivacySettings,
  SupabaseService,
} from '../../services/supabase';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
    IonIcon, IonItem, IonLabel, IonList,
    IonButtons, IonBackButton, IonToggle,
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
    addIcons({
      logOutOutline,
      personCircleOutline,
      shieldCheckmarkOutline,
      notificationsOutline,
      checkmarkCircleOutline,
      phonePortraitOutline,
    });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    this.userEmail = user?.email;
    this.privacySettings = await this.supabaseSvc.getPrivacySettings();
    this.notificationSettings = await this.supabaseSvc.getNotificationSettings();
  }

  async onPrivacyChange(): Promise<void> {
    await this.supabaseSvc.savePrivacySettings(this.privacySettings);
  }

  async onNotificationChange(): Promise<void> {
    await this.supabaseSvc.saveNotificationSettings(this.notificationSettings);
  }

  async enablePushNotifications(): Promise<void> {
    const permission = await this.supabaseSvc.requestPushPermission();
    this.notificationSettings.pushEnabled = permission === 'granted';
    await this.supabaseSvc.saveNotificationSettings(this.notificationSettings);
  }

  async sendTestNotification(): Promise<void> {
    await this.supabaseSvc.sendTestPushNotification();
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