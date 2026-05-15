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

    // Para la IA individual, podríamos sumar todas las sesiones, 
    // pero por ahora lo dejamos en 0 o implementamos una lógica similar.
  }
}
