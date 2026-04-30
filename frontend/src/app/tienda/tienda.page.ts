import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonCard, IonIcon, IonButton, ToastController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../services/supabase';
import { addIcons } from 'ionicons';
import { star, filmOutline, footballOutline, wineOutline } from 'ionicons/icons';

interface Reward {
  id: string;
  title: string;
  points: number;
  icon: string;
  status: 'idle' | 'pending' | 'success';
}

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
    IonBackButton, IonCard, IonIcon, IonButton, CommonModule
  ]
})
export class TiendaPage implements OnInit {
  points: number = 0;
  
  rewards: Reward[] = [
    { id: '1', title: 'Partido de Fútbol con Amigos', points: 500, icon: 'football-outline', status: 'idle' },
    { id: '2', title: 'Salida de viernes con amigas/os', points: 600, icon: 'wine-outline', status: 'idle' },
    { id: '3', title: 'Domingo de Maratón de Películas', points: 300, icon: 'film-outline', status: 'idle' },
  ];

  constructor(
    private supabaseSvc: SupabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({ star, filmOutline, footballOutline, wineOutline });
  }

  ngOnInit() {
    this.loadPoints();
  }

  async loadPoints() {
    const { data, error } = await this.supabaseSvc.getUserProfile();
    if (!error && data) {
      this.points = data.total_points || 0;
    }
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
