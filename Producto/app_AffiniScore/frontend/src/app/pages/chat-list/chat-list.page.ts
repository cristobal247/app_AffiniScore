import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.page.html',
  styleUrls: ['./chat-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class ChatListPage {

  userAvatarUrl: string | null = null;
  partnerAvatarUrl: string | null = null;

  chats: any[] = [
    {
      id: 'partner',
      name: 'Mi Pareja',
      lastMessage: 'Toca para abrir el chat de pareja',
      time: '',
      route: '/tabs/chat-partner',
      isAI: false,
      unreadCount: 0
    },
    {
      id: 'ai',
      name: 'AffiniCoach (IA)',
      lastMessage: 'Tu terapeuta virtual 24/7',
      time: '',
      route: '/tabs/chat-ai',
      isAI: true,
      unreadCount: 0
    },
    {
      id: 'group-ai',
      name: 'Terapia Grupal',
      lastMessage: 'Sesión conjunta con AffiniCoach',
      time: '',
      route: '/tabs/group-chat',
      isAI: true,
      unreadCount: 0
    }
  ];

  constructor(private supabaseSvc: SupabaseService) {}

  async ionViewWillEnter() {
    const { data: profile } = await this.supabaseSvc.getUserProfile();
    if (profile?.avatar_url) {
      this.userAvatarUrl = profile.avatar_url;
    }

    // Obtener el avatar de la pareja
    const partnership = await this.supabaseSvc.getActivePartnership();
    if (partnership) {
      const user = await this.supabaseSvc.getCurrentUser();
      if (user) {
        const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
        if (partnerId) {
          const { data: partnerProfile } = await this.supabaseSvc.supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', partnerId)
            .single();
            
          if (partnerProfile?.avatar_url) {
            this.partnerAvatarUrl = partnerProfile.avatar_url;
          }
        }
      }
    }

    if (profile?.partnership_id) {
      // 1. Unread Count para Chat Grupal (Usa partnership_id como room_id)
      this.chats[2].unreadCount = await this.supabaseSvc.getUnreadCount(profile.partnership_id);

      // 2. Unread Count para Chat de Pareja (Necesitamos buscar el roomId)
      const { data: rooms } = await this.supabaseSvc.supabase
        .from('chat_rooms')
        .select('id')
        .eq('partnership_id', profile.partnership_id)
        .eq('room_type', 'COUPLE')
        .limit(1);
      
      if (rooms && rooms.length > 0) {
        this.chats[0].unreadCount = await this.supabaseSvc.getUnreadCount(rooms[0].id);
      }
    }

    // Para la IA individual, se deja por defecto.
  }
}
