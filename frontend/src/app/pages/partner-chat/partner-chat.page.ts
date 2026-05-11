import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonContent } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-partner-chat',
  templateUrl: './partner-chat.page.html',
  styleUrls: ['./partner-chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class PartnerChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  messages: any[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  roomId: string | null = null;
  subscription: any = null;
  partnerName: string = 'Mi Pareja';
  isLoading: boolean = true;

  constructor(private supabaseSvc: SupabaseService) {}

  async ngOnInit() {
    this.isLoading = true;
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      
      if (profile && profile.partnership_id) {
        // Buscar la sala de chat de pareja (P2P) usando el partnership_id
        const { data: rooms, error } = await this.supabaseSvc['supabase']
          .from('chat_rooms')
          .select('*')
          .eq('partnership_id', profile.partnership_id)
          .eq('room_type', 'COUPLE');

        if (rooms && rooms.length > 0) {
          this.roomId = rooms[0].id;
          await this.loadMessages();
          this.subscribeToMessages();
        } else {
          console.error("No se encontró una sala de chat para esta pareja.");
        }
      } else {
         console.warn("El usuario no tiene una pareja vinculada aún.");
      }
    }
    this.isLoading = false;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadMessages() {
    if (!this.roomId) return;
    const { data, error } = await this.supabaseSvc.getMessagesByRoom(this.roomId);
    if (data) {
      this.messages = data;
      this.scrollToBottom();
    }
  }

  subscribeToMessages() {
    if (!this.roomId) return;
    this.subscription = this.supabaseSvc.subscribeToRoomMessages(this.roomId, (newMsg: any) => {
      this.messages.push(newMsg);
      this.scrollToBottom();
    });
  }

  async sendMessage() {
    if (this.newMessage.trim() === '' || !this.roomId) return;
    
    const msgText = this.newMessage.trim();
    this.newMessage = ''; // Limpiar input rápidamente para mejor UX
    
    await this.supabaseSvc.sendMessage(this.roomId, msgText);
    // El mensaje aparecerá por la suscripción en tiempo real o lo podemos agregar manualmente
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}
