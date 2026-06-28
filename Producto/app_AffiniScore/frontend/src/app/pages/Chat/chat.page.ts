import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
  IonMenu, IonMenuButton, IonList, IonItem, IonLabel, MenuController,
  IonSpinner
} from '@ionic/angular/standalone';
import { SupabaseService, ChatMessage } from '../../services/supabase';
import { GeminiService } from '../../services/gemini.service';
import { FormatMessagePipe } from '../../pipes/format-message.pipe';
import { addIcons } from 'ionicons';
import { sendOutline, arrowBackOutline, videocam, call, ellipsisVertical, happyOutline, cameraOutline, send, sparkles, ellipsisHorizontal, chevronBackOutline, person, menuOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { retry, timer } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
    IonMenu, IonMenuButton, IonList, IonItem, IonLabel, IonSpinner,
    CommonModule, FormsModule, RouterModule, FormatMessagePipe
  ]
})
export class ChatPage implements OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  aiSessions: any[] = [];
  messages: ChatMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  currentUserName: string = '';
  roomId: string = ''; 
  isLoading: boolean = false;
  loadingStatus: string = 'Escribiendo';
  
  selectedImageUrl: string | null = null;
  isUploadingImage: boolean = false;
  
  private subscription: any;

  constructor(
    private supabaseSvc: SupabaseService,
    private geminiSvc: GeminiService,
    private menuCtrl: MenuController,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    addIcons({ sendOutline, arrowBackOutline, videocam, call, ellipsisVertical, happyOutline, cameraOutline, 'camera-outline': cameraOutline, send, sparkles, ellipsisHorizontal, chevronBackOutline, person, menuOutline, addCircleOutline: 'add-circle-outline', chatbubbleOutline: 'chatbubble-outline' });
  }

  userAvatarUrl: string | null = null;

  async ionViewWillEnter() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      this.currentUserName = '';
      
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      if (profile?.full_name) {
        this.currentUserName = profile.full_name;
      }
      if (profile?.avatar_url) {
        this.userAvatarUrl = profile.avatar_url;
      }
      
      await this.loadSessionsList();
    }
  }

  async loadSessionsList() {
    const { data, error } = await this.supabaseSvc.getAiSessions();
    if (data && data.length > 0) {
      this.aiSessions = data;
      const latestSession = this.aiSessions[0];
      
      // Obtener mensajes de la última sesión para verificar inactividad
      const { data: messages } = await this.supabaseSvc.getMessagesByRoom(latestSession.id);
      
      let shouldCreateNew = false;
      if (messages && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        const lastMsgTime = new Date(lastMsg.created_at || '').getTime();
        const currentTime = new Date().getTime();
        const diffMinutes = (currentTime - lastMsgTime) / (1000 * 60);
        
        // Si han pasado más de 30 minutos de inactividad, iniciamos una nueva sesión
        if (diffMinutes >= 30) {
          shouldCreateNew = true;
        }
      }
      
      if (shouldCreateNew) {
        await this.createNewSession();
      } else {
        await this.loadSession(latestSession.id);
      }
    } else {
      await this.createNewSession();
    }
  }

  async createNewSession() {
    await this.menuCtrl.close();
    const res = await this.supabaseSvc.createAiSession();
    if (res.data) {
      this.roomId = res.data.id;
      this.messages = [];
      this.geminiSvc.resetConversation();
      
      // Mensaje de bienvenida de la IA
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        room_id: this.roomId,
        sender_id: 'gemini-bot',
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
    await this.menuCtrl.close();
    this.roomId = roomId;
    const { data, error } = await this.supabaseSvc.getMessagesByRoom(roomId);
    
    if (data) {
      this.messages = data;
      this.geminiSvc.setConversationHistory(data);
      this.scrollToBottom(0);
    }
  }

  async openMenu() {
    await this.menuCtrl.enable(true, 'chat-menu');
    await this.menuCtrl.open('chat-menu');
  }

  ngOnDestroy() {
    // Limpiar suscripciones si las hubiera
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

    const displayMsg = trimmed || '📷 Foto';
    this.selectedImageUrl = null; // Limpiar selección

    // UI optimista
    const tempMsg: ChatMessage = {
      id: Math.random().toString(),
      room_id: this.roomId,
      sender_id: this.currentUserId,
      sender_type: 'USER',
      message: displayMsg,
      metadata: imageUrl ? { image_url: imageUrl } : undefined,
      created_at: new Date().toISOString()
    };
    
    this.messages.push(tempMsg);
    this.scrollToBottom();
    
    this.newMessage = '';
    this.isLoading = true;
    this.loadingStatus = 'Escribiendo';
    
    // Auto-título si es el primer mensaje real del usuario
    if (this.messages.length === 2) {
      this.geminiSvc.generateTitle(displayMsg).then(async (title) => {
        await this.supabaseSvc.updateSessionTitle(this.roomId, title);
        // Recargar la lista de la barra lateral para ver el nuevo título
        const listRes = await this.supabaseSvc.getAiSessions();
        if (listRes.data) this.aiSessions = listRes.data;
      });
    }

    const apiUrl = (environment as any).apiUrl || 'http://localhost:8000';
    const nameSegment = this.currentUserName ? `/${encodeURIComponent(this.currentUserName)}` : '';
    const url = `${apiUrl}/api/chat/${this.roomId}${nameSegment}?canal_id=2`;
    const payload = {
      message: displayMsg,
      image_url: imageUrl || null,
      sender_id: this.currentUserId
    };

    this.http.post<any>(url, payload).pipe(
      retry({
        count: 12,
        delay: (error, retryCount) => {
          console.warn(`Intento de conexión ${retryCount} fallido. El servidor podría estar iniciando. Reintentando...`);
          this.loadingStatus = 'Escribiendo';
          this.cdr.detectChanges();
          return timer(5000);
        }
      })
    ).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.ai_response) {
          const idx = this.messages.findIndex(m => m.id === tempMsg.id);
          if (idx > -1 && res.user_message) {
            this.messages[idx].id = res.user_message.id;
            this.messages[idx].created_at = res.user_message.created_at;
          }
          this.messages.push(res.ai_response);
          this.scrollToBottom();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al enviar mensaje individual:', err);
        this.isLoading = false;
        this.messages = this.messages.filter(m => m.id !== tempMsg.id);
        this.cdr.detectChanges();
        alert('No se pudo enviar el mensaje. Revisa tu conexión con el servidor.');
      }
    });
  }

  scrollToBottom(duration: number = 300) {
    // Forzar detección de cambios inmediatamente
    this.cdr.detectChanges();

    // Hacemos múltiples intentos progresivos (a los 10ms, 100ms, 300ms, 600ms, 1000ms)
    // para asegurar que el scroll se mueva al final bajo cualquier circunstancia o contenedor de scroll
    const intervals = [10, 100, 300, 600, 1000];
    intervals.forEach(delay => {
      setTimeout(async () => {
        if (this.content) {
          try {
            // Estrategia 1: Scroll en el elemento de scroll interno de Ionic
            const el = await this.content.getScrollElement();
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          } catch (e) {}

          try {
            // Estrategia 2: Scroll en el propio elemento ion-content
            const contentEl = document.querySelector('ion-content');
            if (contentEl) {
              contentEl.scrollTop = contentEl.scrollHeight;
            }
          } catch (e) {}

          try {
            // Estrategia 3: Scroll clásico en el scroll de Ionic
            this.content.scrollToBottom(0);
          } catch (e) {}
        }

        try {
          // Estrategia 4: Scroll a nivel de ventana global (Window y Document)
          window.scrollTo(0, document.body.scrollHeight);
          if (document.documentElement) {
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
          }
        } catch (e) {}
      }, delay);
    });
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender_id === this.currentUserId && msg.sender_type !== 'AI';
  }
}
