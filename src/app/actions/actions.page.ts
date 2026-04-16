import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
  IonCard, IonIcon, IonLabel, IonBadge, IonButtons, IonButton, 
  IonSpinner, IonAvatar, IonItem, IonInput, IonFooter, IonTabBar, IonTabButton,
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, heart, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline 
} from 'ionicons/icons';
import { SupabaseService } from '../services/supabase';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.page.html',
  styleUrls: ['./actions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
    IonCard, IonIcon, IonLabel, IonBadge, IonButtons, IonButton, 
    IonSpinner, IonAvatar, IonItem, IonInput, IonFooter, IonTabBar, IonTabButton,
    CommonModule, FormsModule
  ]
})
export class ActionsPage implements OnInit {
  actionsCatalog: any[] = [];

  constructor(
    private supabaseSvc: SupabaseService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, heart, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline
    });
  }

  async ngOnInit() {
    await this.loadCatalog();
  }

  async loadCatalog() {
    const { data, error } = await this.supabaseSvc.getCatalog();
    if (!error && data) {
      // LIMITAMOS EXACTAMENTE A 5 PARA DEJAR ESPACIO A LA SEXTA TARJETA
      this.actionsCatalog = data.slice(0, 5);
    }
  }

  goToFullCatalog() {
    console.log('Navegando al catálogo completo...');
    // this.router.navigate(['/full-catalog']);
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
      header: error ? 'Error' : '¡Puntos Sumados!',
      message: error ? 'Hubo un problema' : `Ganaste ${item.default_points} puntos`,
      buttons: ['OK']
    });
    await alert.present();
  }
}