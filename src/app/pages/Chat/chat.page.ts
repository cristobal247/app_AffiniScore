import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../services/supabase';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

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
  
  messages: Message[] = [];
  newMessage: string = '';
  currentUserId: string = '';
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
    this.subscription = this.supabaseSvc.subscribeToMessages((newMsg) => {
      // Prevenir duplicados si ya lo agregamos por el Optimistic UI
      const exists = this.messages.some(m => m.content === newMsg.content && m.sender_id === newMsg.sender_id);
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
    const { data, error } = await this.supabaseSvc.getMessages();
    if (data) {
      this.messages = data;
      this.scrollToBottom();
    }
  }

  async sendMessage() {
    const trimmed = this.newMessage.trim();
    if (!trimmed) return;

    // Para que la UI se sienta instantánea (Optimistic UI) agregamos el mensaje a la vista inmediatamente
    const tempMsg: Message = {
      id: Math.random().toString(),
      sender_id: this.currentUserId,
      content: trimmed,
      created_at: new Date().toISOString()
    };
    
    this.messages.push(tempMsg);
    this.scrollToBottom();
    
    this.newMessage = '';
    
    // Enviamos a Supabase
    await this.supabaseSvc.sendMessage(trimmed);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  isMine(msg: Message): boolean {
    return msg.sender_id === this.currentUserId;
  }
}
