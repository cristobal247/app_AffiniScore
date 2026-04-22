import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonIcon, AlertController, IonAvatar
} from '@ionic/angular/standalone';
import { DisconnectChallenge, SupabaseService } from '../../services/supabase';
import { addIcons } from 'ionicons';
import { menuOutline, flash } from 'ionicons/icons';

@Component({
  selector: 'app-retos',
  templateUrl: './retos.page.html',
  styleUrls: ['./retos.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonIcon, IonAvatar, CommonModule, FormsModule
  ]
})
export class RetosPage implements OnInit {
  disconnectChallenges: DisconnectChallenge[] = [];

  challengeImages = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDO0BI4plo40cKmuzfXv3ch3sfjl88YKWMqTo-17cgk7kwaBYBb1YhsR0544HY0oppAlTSfKh0k5D2zoLGQZPXYFzpyXBcuocRJVhlFFQGw8L17dCQxb2f9cFe7BDcPt4KnPA3ljxYAM3UsRsNSeBoUST_obWnTq9OG7Y423kV7unx1YsNx6YyuEKH0L0TD7SWHJQrl2_N-Psjb7ewDZ0bh4NPf0C699mjjHlB1-ptQet37X2hGpjkusFGCBVmSzwlK9aOZq4-C988',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCDFq81_0BDne6HQKF0ss82iQltc0787WRT8395azpeFGUljhW2vSCjSMBhbEmSfEKr5Jk7awZnVs5t6rpDz0IbQ4rl1SzV_HN-T93Mphkp2HQQQ2Q8Bmgs4B-we1jBezZ2RYBI46mTike6kzMPHBsd05MPNhQ00fB98zQ3frXD0PO7zVxSBAZnrFfh4DjwEu4VZSWRMdTrxyFkiiUSvLmroJMdXN-NpQuyWCy9qAKUW3t-6obBFlpMsV_9_u4CoFfSGxvVXwNzHBA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDED7_vj5Bo9tZfdjGKmrrdmjn99oTlgDpHJtU83qm2tYs-Qj0F6U11B-3HzNyWP8--ijruBiWu7cX0q_WPETd6HXjp46NwhV-dJnaYS_8FE9qkAEdqGwUA8zLW0hXvSQtgyvHddxlleUvbmA2ptfYjarYED3qm-Uk98HIg0nixgtZ1qklCjqlCd07txC305J5ppZZvKj8Y3VQpDT_9dkL_BPkGufQzsU51oZUrFzX1pluX5FN7ekU4fog9Eu4BLNgjhGx8dghhIoQ',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBlu1dSU7bWRjUMbvwG4E8P2SZd8_3pPaUOF2IRsljbalik6aZRsuYjvC-xuEJwSyuMSvk2LKHoON5MmtccjZBaTJEjh_TRi1FzJYaljUKTNgaVcl0usDYOL6y-UQqgVHxMVTVXq6qGSK_F2RhWYYP2R1_tfU_KxprF0LIuQlDSUItASzZKGNV03b37KQjU3D1bb729uvHn67BbBeTJLWM2-GpMK3E9Oj7jK_irXvkCZp2xRmzO1GP2KxjVD_nPwCotAAinmZv9kqA'
  ];

  constructor(
    private supabaseSvc: SupabaseService,
    private alertCtrl: AlertController
  ) { 
    addIcons({ menuOutline, flash });
  }

  async ngOnInit() {
    await this.loadDisconnectChallenges();
  }

  async loadDisconnectChallenges() {
    this.disconnectChallenges = await this.supabaseSvc.getDisconnectChallenges();
  }

  async acceptChallenge(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.acceptDisconnectChallenge(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Reto aceptado',
      message: `"${item.title}" quedó pendiente de aceptación de tu pareja.`,
      buttons: ['OK'],
      mode: 'ios'
    });
    await alert.present();
  }

  async confirmJointAcceptance(item: DisconnectChallenge) {
    this.disconnectChallenges = await this.supabaseSvc.confirmJointAcceptance(item.id);

    const alert = await this.alertCtrl.create({
      header: 'Aceptación conjunta lista',
      message: `"${item.title}" ya está aceptado por ambos. Ya pueden completarlo juntos.`,
      buttons: ['Genial'],
      mode: 'ios'
    });
    await alert.present();
  }

  getChallengeImage(index: number): string {
    return this.challengeImages[index % this.challengeImages.length];
  }
}
