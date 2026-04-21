import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonSearchbar, IonList, IonIcon, 
  LoadingController, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, 
  flashOutline, searchOutline, search, lockClosed, chevronForwardOutline 
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonSearchbar, IonIcon, 
    CommonModule, FormsModule
  ]
})
export class CatalogPage implements OnInit {
  allActions: any[] = [];
  filteredActions: any[] = [];

  constructor(
    private supabaseSvc: SupabaseService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    // IMPORTANTE: Registrar iconos de búsqueda
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, 
      flashOutline, searchOutline, search, lockClosed, chevronForwardOutline 
    });
  }

  async ngOnInit() {
    await this.loadCatalog();
  }

  async loadCatalog() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando acciones...',
      mode: 'ios',
      spinner: 'crescent'
    });
    await loading.present();

    const { data } = await this.supabaseSvc.getFullCatalog();
    if (data) {
      this.allActions = data;
      this.filteredActions = [...this.allActions];
    }
    loading.dismiss();
  }

  // Lógica del buscador reactivo
  onSearchChange(event: any) {
    const query = event.detail.value.toLowerCase().trim();
    
    if (!query) {
      this.filteredActions = [...this.allActions];
      return;
    }

    this.filteredActions = this.allActions.filter(action => 
      action.name.toLowerCase().includes(query) || 
      action.category.toLowerCase().includes(query)
    );
  }

  async registerAction(item: any) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Registrando...', 
      mode: 'ios' 
    });
    await loading.present();

    const { error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
    loading.dismiss();

    const alert = await this.alertCtrl.create({
      header: error ? 'Error' : '¡Acción registrada!',
      message: error ? 'No se pudo guardar la acción.' : `Sumaste ${item.default_points} puntos por "${item.name}".`,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

  getEmoji(category: string) {
    const emojis: Record<string, string> = { 
      'Citas': '🥂', 
      'Hogar': '🏡', 
      'Detalles': '🎁', 
      'Bienestar': '💆‍♀️' 
    };
    return emojis[category] || '✨';
  }
}