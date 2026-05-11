import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
  IonMenu, IonMenuButton, IonList, IonItem, IonLabel, MenuController
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
    IonMenu, IonMenuButton, IonList, IonItem, IonLabel,
    CommonModule, FormsModule, RouterModule
  ]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  aiSessions: any[] = [];
  messages: ChatMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  currentUserName: string = '';
  roomId: string = ''; 
  isLoading: boolean = false;
  private subscription: any;

  constructor(
    private supabaseSvc: SupabaseService,
    private groqSvc: GroqService,
    private menuCtrl: MenuController
  ) {
    addIcons({ sendOutline, arrowBackOutline, videocam, call, ellipsisVertical, happyOutline, cameraOutline, send, sparkles, ellipsisHorizontal, addCircleOutline: 'add-circle-outline', chatbubbleOutline: 'chatbubble-outline' });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      if (profile?.full_name) {
        this.currentUserName = profile.full_name;
      }
      
      await this.loadSessionsList();
    }
  }

  async loadSessionsList() {
    const { data, error } = await this.supabaseSvc.getAiSessions();
    if (data && data.length > 0) {
      this.aiSessions = data;
      // Cargar la última sesión por defecto
      await this.loadSession(this.aiSessions[0].id);
    } else {
      await this.createNewSession();
    }
  }

  async createNewSession() {
    this.menuCtrl.close();
    const res = await this.supabaseSvc.createAiSession();
    if (res.data) {
      this.roomId = res.data.id;
      this.messages = [];
      this.groqSvc.resetConversation();
      
      // Mensaje de bienvenida de la IA
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        room_id: this.roomId,
        sender_id: 'groq-bot',
        sender_type: 'AI',
        message: '¡Hola! Soy AffiniCoach. ¿En qué puedo ayudarte a ti y a tu pareja hoy?',
        created_at: new Date().toISOString()
      };
      this.messages.push(welcomeMsg);
      // Guardar en Supabase
      await this.supabaseSvc.sendMessage(this.roomId, welcomeMsg.message, 'AI');
      
      // Actualizar lista
      const listRes = await this.supabaseSvc.getAiSessions();
      if (listRes.data) this.aiSessions = listRes.data;
    }
  }

  async loadSession(roomId: string) {
    this.menuCtrl.close();
    this.roomId = roomId;
    const { data, error } = await this.supabaseSvc.getMessagesByRoom(roomId);
    
    if (data) {
      this.messages = data;
      this.groqSvc.setConversationHistory(data);
      this.scrollToBottom();
    }
  }

  ngOnDestroy() {
    // Limpiar suscripciones si las hubiera
  }

  async sendMessage() {
    const trimmed = this.newMessage.trim();
    if (!trimmed) return;

    // UI optimista
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
    
    // Guardar el mensaje del usuario en Supabase de forma asíncrona (no bloquea UI)
    const sendUserMsgPromise = this.supabaseSvc.sendMessage(this.roomId, trimmed, 'USER');

    // Auto-título si es el primer mensaje real del usuario (solo tenemos 2 mensajes en memoria: welcome + este)
    if (this.messages.length === 2) {
      this.groqSvc.generateTitle(trimmed).then(async (title) => {
        await this.supabaseSvc.updateSessionTitle(this.roomId, title);
        // Recargar la lista de la barra lateral para ver el nuevo título
        const listRes = await this.supabaseSvc.getAiSessions();
        if (listRes.data) this.aiSessions = listRes.data;
      });
    }
    
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

    // Guardar respuesta de la IA y asegurar que el primer mensaje se guardó
    await sendUserMsgPromise;
    await this.supabaseSvc.sendMessage(this.roomId, botResponseText, 'AI');
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
