import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar
} from '@ionic/angular/standalone';
import { SupabaseService, ChatMessage } from '../../services/supabase';
import { GroqService } from '../../services/groq.service';
import { addIcons } from 'ionicons';
import { sendOutline, arrowBackOutline, videocam, call, ellipsisVertical, happyOutline, cameraOutline, send, sparkles, ellipsisHorizontal } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
    CommonModule, FormsModule, RouterModule
  ]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  currentUserName: string = '';
  roomId: string = 'default-room-id'; // TODO: Obtener desde la ruta o el estado
  isLoading: boolean = false;
  private subscription: any;

  constructor(
    private supabaseSvc: SupabaseService,
    private groqSvc: GroqService
  ) {
    addIcons({ sendOutline, arrowBackOutline, videocam, call, ellipsisVertical, happyOutline, cameraOutline, send, sparkles, ellipsisHorizontal });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      if (profile?.full_name) {
        this.currentUserName = profile.full_name;
      }
    }

    // No cargaremos mensajes de Supabase por ahora, ya que es un chat efímero con la IA.
    // Si quisieras guardarlos, aquí podrías cargar el historial desde la BD.
    
    // Opcionalmente, agregar un mensaje de bienvenida de la IA si está vacío
    if (this.messages.length === 0) {
      this.messages.push({
        id: 'welcome',
        room_id: this.roomId,
        sender_id: 'groq-bot',
        sender_type: 'AI',
        message: '¡Hola! Soy AffiniCoach. ¿En qué puedo ayudarte a ti y a tu pareja hoy?',
        created_at: new Date().toISOString()
      });
    }
  }

  ngOnDestroy() {
    // Limpiar suscripciones si las hubiera
  }

  async loadMessages() {
    // Sin acción por ahora
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
    this.isLoading = true;
    
    // Enviamos a Groq con el nombre del usuario
    const botResponseText = await this.groqSvc.sendMessage(trimmed, this.currentUserName);
    
    const botMsg: ChatMessage = {
      id: Math.random().toString(),
      room_id: this.roomId,
      sender_id: 'groq-bot',
      sender_type: 'AI',
      message: botResponseText,
      created_at: new Date().toISOString()
    };
    
    this.messages.push(botMsg);
    this.isLoading = false;
    this.scrollToBottom();
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
