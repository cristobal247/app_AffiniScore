import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton // <--- 1. Importar aquí
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
    IonIcon, IonItem, IonLabel, IonList, 
    IonButtons, IonBackButton, // <--- 2. Agregar aquí para que el HTML lo reconozca
    CommonModule, FormsModule
  ]
})
export class ProfilePage implements OnInit {
  userEmail: string | undefined = '';

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController
  ) {
    addIcons({ logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    this.userEmail = user?.email;
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