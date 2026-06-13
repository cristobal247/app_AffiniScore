import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonContent } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { cameraOutline, send, closeOutline, heartDislikeOutline, imageOutline, chevronBackOutline, person } from 'ionicons/icons';

import { FormatMessagePipe } from '../../pipes/format-message.pipe';

@Component({
  selector: 'app-partner-chat',
  templateUrl: './partner-chat.page.html',
  styleUrls: ['./partner-chat.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, FormatMessagePipe]
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
  userAvatarUrl: string | null = null;
  partnerAvatarUrl: string | null = null;

  selectedImageUrl: string | null = null;
  isUploadingImage: boolean = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ cameraOutline, send, closeOutline, heartDislikeOutline, imageOutline, chevronBackOutline, person });
  }

  async ngOnInit() {
    this.isLoading = true;
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      
      if (profile) {
        if (profile.avatar_url) {
          this.userAvatarUrl = profile.avatar_url;
        }
        
        if (profile.partnership_id) {
          // Buscar la pareja y su avatar/nombre
          const partnership = await this.supabaseSvc.getActivePartnership();
          if (partnership) {
            const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
            if (partnerId) {
              const { data: partnerProfile } = await this.supabaseSvc.supabase
                .from('profiles')
                .select('avatar_url, full_name')
                .eq('id', partnerId)
                .single();
              
              if (partnerProfile) {
                if (partnerProfile.avatar_url) {
                  this.partnerAvatarUrl = partnerProfile.avatar_url;
                }
                if (partnerProfile.full_name) {
                  this.partnerName = partnerProfile.full_name;
                }
              }
            }
          }

          // Buscar la sala de chat de pareja (P2P) usando el partnership_id
          const { data: rooms, error } = await this.supabaseSvc['supabase']
            .from('chat_rooms')
            .select('*')
            .eq('partnership_id', profile.partnership_id)
            .eq('room_type', 'COUPLE');

        if (rooms && rooms.length > 0) {
          this.roomId = rooms[0].id;
          this.supabaseSvc.setLastRead(this.roomId!); // Marcar como leído
          await this.loadMessages();
          this.subscribeToMessages();
        } else {
          // Crear la sala de chat de pareja automáticamente para esta vinculación activa
          const { data: newRoom, error: createError } = await this.supabaseSvc['supabase']
            .from('chat_rooms')
            .insert({
              partnership_id: profile.partnership_id,
              room_type: 'COUPLE'
            })
            .select('*')
            .single();

          if (newRoom) {
            this.roomId = newRoom.id;
            await this.loadMessages();
            this.subscribeToMessages();
          } else {
            console.error("Error al crear automáticamente la sala de chat:", createError);
          }
        }
      } else {
        console.warn("El usuario no tiene una pareja vinculada aún.");
      }
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
      const exists = this.messages.some(m => m.id === newMsg.id);
      if (!exists) {
        // Si el mensaje es del usuario actual, comprobamos si ya existe con ID temporal
        if (newMsg.sender_id === this.currentUserId) {
          const tempIndex = this.messages.findIndex(m => typeof m.id === 'string' && m.id.startsWith('temp-') && m.message === newMsg.message);
          if (tempIndex > -1) {
            this.messages[tempIndex].id = newMsg.id;
            this.messages[tempIndex].created_at = newMsg.created_at;
            this.cdr.detectChanges();
            return;
          }
        }
        this.messages.push(newMsg);
        this.scrollToBottom();
      }
    });
  }

  cancelSelectedImage() {
    this.selectedImageUrl = null;
    this.isUploadingImage = false;
  }

  async onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    this.isUploadingImage = true;
    const res = await this.supabaseSvc.uploadChatImage(file);
    this.isUploadingImage = false;

    // Resetear el valor para permitir seleccionar el mismo archivo si es necesario
    try {
      event.target.value = '';
    } catch (e) {}

    if (res.url) {
      this.selectedImageUrl = res.url;
    } else {
      console.error('Error al subir la imagen:', res.error);
      alert('No se pudo subir la foto. Inténtalo de nuevo.');
    }
  }

  async sendMessage() {
    const trimmed = this.newMessage.trim();
    const imageUrl = this.selectedImageUrl;
    if (!trimmed && !imageUrl) return;
    if (!this.roomId) return;
    
    const msgText = trimmed || '📷 Foto';
    this.selectedImageUrl = null; // Limpiar selección
    this.newMessage = ''; // Limpiar input rápidamente para mejor UX

    // UI optimista con prefijo 'temp-'
    const tempId = `temp-${Math.random().toString()}`;
    const tempMsg: any = {
      id: tempId,
      room_id: this.roomId,
      sender_id: this.currentUserId,
      sender_type: 'USER',
      message: msgText,
      metadata: imageUrl ? { image_url: imageUrl } : undefined,
      created_at: new Date().toISOString()
    };
    
    this.messages.push(tempMsg);
    this.scrollToBottom();
    
    const res = await this.supabaseSvc.sendMessage(this.roomId, msgText, 'USER', imageUrl || undefined);
    if (res && res.data) {
      // Reemplazar ID temporal por la ID final devuelta por la BD
      const idx = this.messages.findIndex(m => m.id === tempId);
      if (idx > -1) {
        this.messages[idx].id = res.data.id;
        this.messages[idx].created_at = res.data.created_at;
        this.cdr.detectChanges();
      }
    }
  }

  scrollToBottom() {
    this.cdr.detectChanges();
    const intervals = [10, 100, 300, 600];
    intervals.forEach(delay => {
      setTimeout(async () => {
        if (this.content) {
          try {
            const el = await this.content.getScrollElement();
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          } catch (e) {}

          try {
            const contentEl = document.querySelector('ion-content.chat-content');
            if (contentEl) {
              contentEl.scrollTop = contentEl.scrollHeight;
            }
          } catch (e) {}

          try {
            this.content.scrollToBottom(0);
          } catch (e) {}
        }
      }, delay);
    });
  }

  isMine(msg: any): boolean {
    return msg.sender_id === this.currentUserId;
  }
}
