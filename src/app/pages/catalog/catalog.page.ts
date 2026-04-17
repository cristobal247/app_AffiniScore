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
import { DisconnectChallenge, SupabaseService } from '../../services/supabase';

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
  disconnectChallenges: DisconnectChallenge[] = [];

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
    await this.loadDisconnectChallenges();
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

  async loadDisconnectChallenges() {
    this.disconnectChallenges = await this.supabaseSvc.getDisconnectChallenges();
  }

  async acceptChallenge(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.acceptDisconnectChallenge(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Reto aceptado',
      message: `"${item.title}" quedo pendiente de aceptacion de tu pareja.`,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

  async confirmJointAcceptance(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.confirmJointAcceptance(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Aceptacion conjunta lista',
      message: `"${item.title}" ya esta aceptado por ambos. Ya pueden completarlo juntos.`,
      buttons: ['Genial'],
      mode: 'ios'
    });
    await alert.present();
  }

  getChallengeDifficultyClass(difficulty: DisconnectChallenge['difficulty']): string {
    if (difficulty === 'Alto') return 'diff-high';
    if (difficulty === 'Medio') return 'diff-medium';
    return 'diff-low';
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
}