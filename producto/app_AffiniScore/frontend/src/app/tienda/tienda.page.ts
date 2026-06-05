import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonCard, IonIcon, IonButton, ToastController, AlertController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../services/supabase';
import { addIcons } from 'ionicons';
import { star, filmOutline, footballOutline, wineOutline, restaurantOutline, airplaneOutline, bedOutline, gameControllerOutline, arrowForwardOutline, checkmarkCircleOutline, checkmarkOutline, sparklesOutline, addOutline, chevronBackOutline } from 'ionicons/icons';

interface Reward {
  id: string;
  title: string;
  points: number;
  icon: string;
  status: 'idle' | 'pending' | 'success';
  class: string;
  image: string;
}

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
    IonBackButton, IonCard, IonIcon, IonButton, CommonModule, FormsModule
  ]
})
export class TiendaPage implements OnInit {
  points: number = 0;
  currentStorageKey: string = '';
  
  // Custom reward creation states
  showCustomForm: boolean = false;
  customTitle: string = '';
  aiEvaluating: boolean = false;
  aiProposedPoints: number = 0;
  showAiProposal: boolean = false;

  rewards: Reward[] = [];

  pressTimer: any;

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ star, filmOutline, footballOutline, wineOutline, restaurantOutline, airplaneOutline, bedOutline, gameControllerOutline, arrowForwardOutline, checkmarkCircleOutline, checkmarkOutline, sparklesOutline, addOutline, chevronBackOutline });
  }

  ngOnInit() {
    this.loadPointsAndRewards();
  }

  async loadPointsAndRewards() {
    await this.loadPoints();
    await this.loadRewards();
  }

  async loadPoints() {
    const { data, error } = await this.supabaseSvc.getUserProfile();
    if (!error && data) {
      this.points = data.total_points || 0;
    }
  }

  async loadRewards() {
    const profileRes = await this.supabaseSvc.getUserProfile();
    const user = await this.supabaseSvc.getCurrentUser();
    
    if (profileRes && profileRes.data) {
      const profile = profileRes.data;
      if (profile.partnership_id) {
        this.currentStorageKey = `custom_rewards_${profile.partnership_id}`;
      } else if (user) {
        this.currentStorageKey = `custom_rewards_user_${user.id}`;
      }
    }

    const defaultRewards: Reward[] = [
      { id: '1', title: 'Partido de Fútbol con Amigos', points: 500, icon: 'football-outline', status: 'idle', class: 'card-football', image: 'assets/images/tienda/football.png' },
      { id: '2', title: 'Salida de viernes con amigas/os', points: 600, icon: 'wine-outline', status: 'idle', class: 'card-wine', image: 'assets/images/tienda/wine.png' },
      { id: '3', title: 'Domingo de Maratón de Películas', points: 300, icon: 'film-outline', status: 'idle', class: 'card-film', image: 'assets/images/tienda/popcorn.png' },
      { id: '4', title: 'Cena en Restaurante Favorito', points: 800, icon: 'restaurant-outline', status: 'idle', class: 'card-restaurant', image: 'assets/images/tienda/restaurant.png' },
      { id: '5', title: 'Viaje de Fin de Semana', points: 2000, icon: 'airplane-outline', status: 'idle', class: 'card-airplane', image: 'assets/images/tienda/airplane.png' },
      { id: '6', title: 'Día de Spa y Relajación', points: 1000, icon: 'bed-outline', status: 'idle', class: 'card-spa', image: 'assets/images/tienda/spa.png' },
      { id: '7', title: 'Tarde de Videojuegos', points: 400, icon: 'game-controller-outline', status: 'idle', class: 'card-game', image: 'assets/images/tienda/game.png' },
    ];

    if (this.currentStorageKey) {
      const stored = localStorage.getItem(this.currentStorageKey);
      if (stored) {
        try {
          const customRewards: Reward[] = JSON.parse(stored);
          this.rewards = [...customRewards, ...defaultRewards];
          return;
        } catch (e) {
          console.error('Error parsing stored custom rewards:', e);
        }
      }
    }
    this.rewards = defaultRewards;
  }

  // Métodos para Recompensa Personalizada
  openCustomForm() {
    this.showCustomForm = true;
  }

  calculateAiPoints() {
    if (!this.customTitle.trim()) {
      this.showToast('Por favor, describe qué quieres de recompensa.', 'warning');
      return;
    }

    this.aiEvaluating = true;
    this.showAiProposal = false;

    // Simular evaluación de IA
    setTimeout(() => {
      this.aiEvaluating = false;
      this.showAiProposal = true;
      const length = this.customTitle.trim().length;
      
      // Proponer puntos basado en la longitud y un factor aleatorio
      let proposed = Math.min(2000, Math.max(150, length * 12 + Math.floor(Math.random() * 150)));
      // Redondear a la centena más cercana
      this.aiProposedPoints = Math.round(proposed / 100) * 100;
    }, 2000);
  }

  saveCustomReward() {
    if (!this.customTitle.trim() || this.aiProposedPoints <= 0) return;

    // Lógica inteligente de detección de palabras clave para asignar el mejor fondo 3D
    const text = this.customTitle.toLowerCase();
    let themeClass = 'card-game'; // Default rosa pastel
    let themeImage = 'assets/images/tienda/game.png';
    let themeIcon = 'sparkles-outline';

    if (text.includes('fútbol') || text.includes('futbol') || text.includes('pelota') || text.includes('deporte') || text.includes('partido') || text.includes('jugar') || text.includes('entrenar') || text.includes('gimnasio') || text.includes('gym')) {
      themeClass = 'card-football';
      themeImage = 'assets/images/tienda/football.png';
      themeIcon = 'football-outline';
    } else if (text.includes('vino') || text.includes('copa') || text.includes('cerveza') || text.includes('trago') || text.includes('fiesta') || text.includes('alcohol') || text.includes('amigas') || text.includes('amigos') || text.includes('salida') || text.includes('salir')) {
      themeClass = 'card-wine';
      themeImage = 'assets/images/tienda/wine.png';
      themeIcon = 'wine-outline';
    } else if (text.includes('película') || text.includes('pelicula') || text.includes('cine') || text.includes('maratón') || text.includes('maraton') || text.includes('netflix') || text.includes('popcorn') || text.includes('palomitas') || text.includes('serie')) {
      themeClass = 'card-film';
      themeImage = 'assets/images/tienda/popcorn.png';
      themeIcon = 'film-outline';
    } else if (text.includes('cena') || text.includes('comida') || text.includes('restaurante') || text.includes('comer') || text.includes('almuerzo') || text.includes('cocina') || text.includes('cocinar') || text.includes('plato')) {
      themeClass = 'card-restaurant';
      themeImage = 'assets/images/tienda/restaurant.png';
      themeIcon = 'restaurant-outline';
    } else if (text.includes('viaje') || text.includes('volar') || text.includes('escapada') || text.includes('playa') || text.includes('avión') || text.includes('avion') || text.includes('hotel') || text.includes('vacaciones')) {
      themeClass = 'card-airplane';
      themeImage = 'assets/images/tienda/airplane.png';
      themeIcon = 'airplane-outline';
    } else if (text.includes('spa') || text.includes('relajación') || text.includes('relajacion') || text.includes('cuidado') || text.includes('relajar') || text.includes('jacuzzi') || text.includes('baño')) {
      themeClass = 'card-spa';
      themeImage = 'assets/images/tienda/spa.png';
      themeIcon = 'bed-outline';
    } else if (text.includes('juego') || text.includes('videojuego') || text.includes('playstation') || text.includes('xbox') || text.includes('consola') || text.includes('gamer') || text.includes('partida')) {
      themeClass = 'card-game';
      themeImage = 'assets/images/tienda/game.png';
      themeIcon = 'game-controller-outline';
    } else if (text.includes('amor') || text.includes('romántico') || text.includes('romantico') || text.includes('pareja') || text.includes('novio') || text.includes('novia') || text.includes('beso') || text.includes('abrazo') || text.includes('cariño')) {
      themeClass = 'card-wine'; // Fondo lavanda
      themeImage = 'assets/images/tienda/love.png';
      themeIcon = 'star';
    } else if (text.includes('masaje') || text.includes('espalda') || text.includes('relax') || text.includes('aceite') || text.includes('descontracturante')) {
      themeClass = 'card-spa'; // Fondo menta
      themeImage = 'assets/images/tienda/massage.png';
      themeIcon = 'bed-outline';
    } else if (text.includes('regalo') || text.includes('sorpresa') || text.includes('detalle') || text.includes('caja')) {
      themeClass = 'card-restaurant'; // Fondo amarillo pastel
      themeImage = 'assets/images/tienda/gift.png';
      themeIcon = 'star';
    } else if (text.includes('compras') || text.includes('shopping') || text.includes('ropa') || text.includes('mall') || text.includes('tienda') || text.includes('adquirir') || text.includes('comprar')) {
      themeClass = 'card-game'; // Fondo rosa pastel
      themeImage = 'assets/images/tienda/shopping.png';
      themeIcon = 'star';
    }

    // Crear la nueva recompensa personalizada
    const newReward: Reward = {
      id: Date.now().toString(),
      title: this.customTitle.trim(),
      points: this.aiProposedPoints,
      icon: themeIcon,
      status: 'idle',
      class: themeClass,
      image: themeImage
    };

    // Añadir al catálogo en la primera posición (después de la de creación)
    this.rewards.unshift(newReward);
    this.saveCustomRewardsToStorage();
    this.showToast(`Se añadió "${newReward.title}" por ${newReward.points} pts.`, 'success');
    this.resetCustomReward();
  }

  cancelCustomReward() {
    this.resetCustomReward();
  }

  private resetCustomReward() {
    this.showCustomForm = false;
    this.customTitle = '';
    this.aiEvaluating = false;
    this.aiProposedPoints = 0;
    this.showAiProposal = false;
  }

  initiateRedeem(reward: Reward) {
    if (this.points < reward.points) {
      this.showToast(`No tienes suficientes AffiniPoints para canjear esto.`, 'warning');
      return;
    }
    // Mostrar estado de validación
    reward.status = 'pending';
  }

  cancelRedeem(reward: Reward) {
    reward.status = 'idle';
  }

  async confirmRedeem(reward: Reward) {
    const { error } = await this.supabaseSvc.redeemPoints(reward.points);
    
    if (error) {
      this.showToast('Error al canjear la recompensa.', 'danger');
      reward.status = 'idle';
    } else {
      this.points -= reward.points;
      reward.status = 'success';
      this.showToast(`¡Felicidades! Has canjeado: ${reward.title}`, 'success');
      
      // Regresar al estado idle después de un rato
      setTimeout(() => {
        reward.status = 'idle';
      }, 3000);
    }
  }

  // Gestores de Pulsación Larga (Long Press) para eliminar
  startPressTimer(reward: Reward) {
    if (reward.status !== 'idle') return;
    this.pressTimer = setTimeout(() => {
      this.confirmDelete(reward);
    }, 850);
  }

  clearPressTimer() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
    }
  }

  async confirmDelete(reward: Reward) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Recompensa',
      message: `¿Estás seguro de que deseas eliminar la recompensa "${reward.title}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.deleteReward(reward);
          }
        }
      ]
    });
    await alert.present();
  }

  deleteReward(reward: Reward) {
    this.rewards = this.rewards.filter(r => r.id !== reward.id);
    this.saveCustomRewardsToStorage();
    this.showToast(`Se eliminó la recompensa "${reward.title}".`, 'success');
  }

  private saveCustomRewardsToStorage() {
    if (!this.currentStorageKey) return;
    // Filtrar solo las recompensas personalizadas (cuyas IDs no son estáticas del '1' al '7')
    const customList = this.rewards.filter(r => !['1', '2', '3', '4', '5', '6', '7'].includes(r.id));
    localStorage.setItem(this.currentStorageKey, JSON.stringify(customList));
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
}
