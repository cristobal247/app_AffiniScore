import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonSearchbar, IonList, IonIcon, 
  LoadingController, AlertController, IonButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, homeOutline, giftOutline, heartOutline, 
  flashOutline, searchOutline, search, lockClosed, chevronForwardOutline,
  chevronBackOutline
} from 'ionicons/icons';
import { SupabaseService, Activity } from '../../services/supabase';
import { EmojiPipe } from '../../pipes/emoji.pipe';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.page.html',
  styleUrls: ['./catalog.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonSearchbar, IonIcon, IonButton,
    CommonModule, FormsModule, EmojiPipe, RouterModule
  ]
})
export class CatalogPage implements OnInit {
  allActions: Activity[] = [];
  filteredActions: Activity[] = [];

  constructor(
    private supabaseSvc: SupabaseService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    // Carga los iconos del buscador
    addIcons({ 
      restaurantOutline, homeOutline, giftOutline, heartOutline, 
      flashOutline, searchOutline, search, lockClosed, chevronForwardOutline,
      chevronBackOutline
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

  // Filtra las acciones según el texto ingresado
  onSearchChange(event: any) {
    const query = event.detail.value.toLowerCase().trim();
    
    if (!query) {
      this.filteredActions = [...this.allActions];
      return;
    }

    this.filteredActions = this.allActions.filter(action => 
      action.name.toLowerCase().includes(query) || 
      action.category.toLowerCase().includes(query) ||
      (action.subcategory && action.subcategory.toLowerCase().includes(query))
    );
  }

  async registerAction(item: any) {
    const loading = await this.loadingCtrl.create({ 
      message: 'Registrando...', 
      mode: 'ios' 
    });
    await loading.present();

    const { data: log, error } = await this.supabaseSvc.saveActionPoint(item.id, item.default_points);
    loading.dismiss();

    const isPending = log?.status === 'PENDING';

    const alert = await this.alertCtrl.create({
      header: error ? 'Error' : (isPending ? 'Acción pendiente' : '¡Acción registrada!'),
      message: error 
        ? 'No se pudo guardar la acción.' 
        : (isPending 
            ? `Tu pareja debe confirmar este "Acto de servicio" para que se te sumen los ${item.default_points} puntos.`
            : `Sumaste ${item.default_points} puntos por "${item.name}".`),
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }


}