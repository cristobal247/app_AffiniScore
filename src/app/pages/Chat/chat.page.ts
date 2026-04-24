import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar
} from '@ionic/angular/standalone';
import { SupabaseService, ChatMessage } from '../../services/supabase';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
    CommonModule, FormsModule
  ]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  roomId: string = 'default-room-id'; // TODO: Obtener desde la ruta o el estado
  private subscription: any;

  constructor(private supabaseSvc: SupabaseService) {
    addIcons({ sendOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
    }

    await this.loadMessages();
    
    // Suscribirse a nuevos mensajes
    this.subscription = this.supabaseSvc.subscribeToRoomMessages(this.roomId, (newMsg: ChatMessage) => {
      // Prevenir duplicados si ya lo agregamos por el Optimistic UI
      const exists = this.messages.some(m => m.message === newMsg.message && m.sender_id === newMsg.sender_id);
      if (!exists) {
        this.messages.push(newMsg);
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy() {
    // Es importante desuscribirse para no dejar canales abiertos
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadMessages() {
    const { data, error } = await this.supabaseSvc.getMessagesByRoom(this.roomId);
    if (data) {
      this.messages = data;
      this.scrollToBottom();
    }
  }

  async sendMessage() {
    const trimmed = this.newMessage.trim();
    if (!trimmed) return;

    // Para que la UI se sienta instantánea (Optimistic UI) agregamos el mensaje a la vista inmediatamente
    const tempMsg: ChatMessage = {
      id: Math.random().toString(),
      room_id: this.roomId,
      sender_id: this.currentUserId,
      sender_type: 'USER',
      message: trimmed,
      created_at: new Date().toISOString()
    };
    
    this.messages.push(tempMsg);
    this.scrollToBottom();
    
    this.newMessage = '';
    
    // Enviamos a Supabase
    await this.supabaseSvc.sendMessage(this.roomId, trimmed);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender_id === this.currentUserId;
  }
}
