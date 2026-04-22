import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Asegúrate de que esté importado
import { 
  IonContent, IonHeader, IonToolbar, IonGrid, IonRow, IonCol, 
  IonIcon, IonLabel, IonButtons, IonButton, 
  IonAvatar, IonInput, IonFooter, IonTabBar, IonTabButton,
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
  settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
  chevronForwardOutline, lockClosed, personOutline
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
    public router: Router, // <--- CAMBIADO A PUBLIC PARA EL HTML
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, flashOutline, 
      settingsSharp, addCircle, starSharp, headsetOutline, mapOutline, flash,
      chevronForwardOutline, lockClosed, personOutline
    });
  }

  async ngOnInit() {
    const { data } = await this.supabaseSvc.getCatalog();
    if (data) {
      // Usamos slice(0, 5) para tomar solo las primeras 5 acciones
      this.actionsCatalog = data.slice(0, 5);
    }
  }

  goToFullCatalog() {
    this.router.navigate(['/catalog']);
  }

  getIcon(category: string) {
    const icons: any = { 
      'Citas': 'restaurant-outline', 
      'Hogar': 'home-outline', 
      'Detalles': 'gift-outline', 
      'Bienestar': 'heart-outline' 
    };
    return icons[category] || 'flash-outline';
  }

  async registerAction(item: any) {
    const loading = await this.loadingCtrl.create({ message: 'Registrando...', spinner: 'crescent' });
    await loading.present();
    const { error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
    loading.dismiss();
    
    const alert = await this.alertCtrl.create({
      header: error ? 'Error' : '¡Éxito!',
      message: error ? 'No se pudo registrar' : `Sumaste ${item.default_points} pts`,
      buttons: ['OK']
    });
    await alert.present();
  }
}