import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // IMPORTANTE
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
  IonCard, IonIcon, IonLabel, IonBadge, IonButtons, IonButton, 
  IonAvatar, IonItem, IonInput, IonFooter, IonTabBar, IonTabButton,
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline, lockClosed
} from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.page.html',
  styleUrls: ['./actions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
    IonIcon, IonLabel, IonButtons, IonButton, 
    IonAvatar, IonInput, IonFooter, IonTabBar, IonTabButton,
    CommonModule, FormsModule
  ]
})
export class ActionsPage implements OnInit {
  actionsCatalog: any[] = [];

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router, // Inyectamos el Router
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline, lockClosed
    });
  }

  async ngOnInit() {
    const { data } = await this.supabaseSvc.getCatalog();
    if (data) this.actionsCatalog = data.slice(0, 5);
  }

  // ESTA FUNCIÓN AHORA SÍ NAVEGA
  goToFullCatalog() {
    this.router.navigate(['/catalog']);
  }

  getIcon(category: string) {
    const icons: any = { 'Citas': 'restaurant-outline', 'Hogar': 'home-outline', 'Detalles': 'gift-outline', 'Bienestar': 'heart-outline' };
    return icons[category] || 'flash-outline';
  }

  async registerAction(item: any) {
    const loading = await this.loadingCtrl.create({ message: 'Registrando...', spinner: 'crescent' });
    await loading.present();
    const { error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
    loading.dismiss();
    const alert = await this.alertCtrl.create({
      header: error ? 'Error' : '¡Éxito!',
      message: error ? 'Error al guardar' : `Sumaste ${item.default_points} pts por ${item.name}`,
      buttons: ['OK']
    });
    await alert.present();
  }
}