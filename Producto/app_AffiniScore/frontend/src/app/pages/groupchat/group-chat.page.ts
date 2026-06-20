import { Component, OnInit, OnDestroy, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar,
  IonSpinner
} from '@ionic/angular/standalone';
import { SupabaseService, ChatMessage } from '../../services/supabase';
import { environment } from '../../../environments/environment';
import { FormatMessagePipe } from '../../pipes/format-message.pipe';
import { addIcons } from 'ionicons';
import { send, sparkles, ellipsisHorizontal, chevronBackOutline, person, cameraOutline, close } from 'ionicons/icons';
import { retry, timer } from 'rxjs';

@Component({
  selector: 'app-group-chat',
  templateUrl: './group-chat.page.html',
  styleUrls: ['./group-chat.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonFooter, IonInput, IonButton, IonIcon, IonAvatar, IonSpinner,
    CommonModule, FormsModule, RouterModule, FormatMessagePipe
  ]
})
export class GroupChatPage implements OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  messages: ChatMessage[] = [];
  newMessage: string = '';
  partnershipAvatars: string[] = [];
  profileMap: { [key: string]: string } = {};
  currentUserId: string = '';
  partnershipId: string = '';
  isLoading: boolean = false;
  loadingStatus: string = 'Escribiendo';
  
  selectedImageUrl: string | null = null;
  isUploadingImage: boolean = false;
  
  private subscription: any;
  private httpSubscription: any; // Suscripción HTTP activa para poder cancelarla al salir

  constructor(
    private supabaseSvc: SupabaseService,
    private http: HttpClient,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ send, sparkles, ellipsisHorizontal, chevronBackOutline, person, 'camera-outline': cameraOutline, close });
  }

  async ionViewWillEnter() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (user) {
      this.currentUserId = user.id;
      
      // Obtenemos la vinculación activa directamente (más fiable que el perfil)
      const partnership = await this.supabaseSvc.getActivePartnership();
      
      if (partnership) {
        this.partnershipId = partnership.id;
        this.supabaseSvc.setLastRead(this.partnershipId); // Marcar como leído
        await this.loadMessages();
        await this.loadPartnershipProfiles(partnership);
        this.setupRealtime();
      } else {
        console.warn('No se encontró una vinculación activa para este usuario.');
      }
    }
  }

  ionViewWillLeave() {
    this.cleanupRealtime();
  }

  cleanupRealtime() {
    if (this.subscription) {
      console.log('DEBUG Realtime: Cerrando canal para la sala:', this.partnershipId);
      // FIX: Los canales de Supabase se cierran con removeChannel(), NO con .unsubscribe()
      this.supabaseSvc.supabase.removeChannel(this.subscription)
        .catch((err: any) => console.warn('Error al cerrar canal de chat grupal:', err));
      this.subscription = null;
    }
  }

  async loadPartnershipProfiles(partnership?: any) {
    if (!partnership) {
      partnership = await this.supabaseSvc.getActivePartnership();
    }
    if (!partnership) return;

    const { data: profiles } = await this.supabaseSvc.supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', [partnership.user1_id, partnership.user2_id]);
    
    if (profiles) {
      this.partnershipAvatars = profiles
         .map(p => p.avatar_url)
         .filter(url => !!url);
      
      // Crear un mapa para acceder rápido por ID
      profiles.forEach(p => {
        if (p.avatar_url) {
          this.profileMap[p.id] = p.avatar_url;
        }
      });
    }
  }

  async loadMessages() {
    const { data } = await this.supabaseSvc.getMessagesByRoom(this.partnershipId);
    if (data) {
      this.messages = data;
      this.scrollToBottom();
      
      // Si no hay mensajes guardados en esta sala, pedimos el mensaje de bienvenida de la IA
      if (this.messages.length === 0) {
        await this.triggerWelcomeMessage();
      }
    }
  }

  async triggerWelcomeMessage() {
    this.isLoading = true;
    this.loadingStatus = 'Escribiendo';
    this.cdr.detectChanges();

    const apiUrl = (environment as any).apiUrl || 'http://localhost:8000';
    const url = `${apiUrl}/api/chat/3/${this.currentUserId}/welcome`;

    this.http.post<any>(url, {}).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.isLoading = false;
          if (res.ai_response) {
            if (!this.messages.find(m => m.id === res.ai_response.id)) {
              this.messages.push(res.ai_response);
              this.scrollToBottom();
            }
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error cargando bienvenida grupal:', err);
        this.zone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  setupRealtime() {
    this.cleanupRealtime();
    if (!this.partnershipId) return;
    
    console.log('DEBUG Realtime: Iniciando suscripción para la sala:', this.partnershipId);
    
    this.subscription = this.supabaseSvc.subscribeToRoomMessages(this.partnershipId, (newMsg: ChatMessage) => {
      console.log('DEBUG Realtime: Evento recibido:', newMsg);
      if (newMsg && newMsg.sender_id !== this.currentUserId) {
        this.zone.run(() => {
          if (!this.messages.find(m => m.id === newMsg.id)) {
            this.messages.push(newMsg);
            this.isLoading = false;
            this.scrollToBottom();
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  ngOnDestroy() {
    this.cleanupRealtime();
    // Cancelar el request HTTP si el usuario sale antes de recibir respuesta
    if (this.httpSubscription) {
      this.httpSubscription.unsubscribe();
      this.httpSubscription = null;
    }
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

    const tempMsg: ChatMessage = {
      id: Math.random().toString(),
      room_id: this.partnershipId,
      sender_id: this.currentUserId,
      sender_type: 'USER',
      message: displayMsg,
      created_at: new Date().toISOString(),
      metadata: { 
        emisor: 'Tú',
        image_url: imageUrl || undefined
      }
    };
    
    this.messages.push(tempMsg);
    this.scrollToBottom();
    this.newMessage = '';
    this.isLoading = true;
    this.loadingStatus = 'Escribiendo';

    const apiUrl = (environment as any).apiUrl || 'http://localhost:8000';
    const url = `${apiUrl}/api/chat/3/${this.currentUserId}`;
    
    console.log('DEBUG: Enviando mensaje a URL:', url);
    console.log('DEBUG: Partnership ID:', this.partnershipId);

    const payload = { 
      message: displayMsg,
      image_url: imageUrl || null
    };

    this.httpSubscription = this.http.post<any>(url, payload).pipe(
      retry({
        count: 3, // Máximo 3 reintentos (era 12) — evita 60 segundos de Observable vivo
        delay: (error, retryCount) => {
          console.warn(`Intento de conexión grupal ${retryCount} fallido. Reintentando...`);
          this.zone.run(() => {
            this.loadingStatus = 'Escribiendo';
            this.cdr.detectChanges();
          });
          return timer(3000); // 3s entre reintentos (era 5s)
        }
      })
    ).subscribe({
      next: (res) => {
        console.log('DEBUG: Respuesta recibida:', res);
        this.zone.run(() => {
          this.isLoading = false;
          if (res.ai_response) {
              // Verificar si el mensaje ya está (por si Realtime ya lo insertó)
              if (!this.messages.find(m => m.id === res.ai_response.id)) {
                  this.messages.push(res.ai_response);
                  this.scrollToBottom();
              }
          }
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('DEBUG: Error enviando mensaje grupal:', err);
        this.zone.run(() => {
          this.isLoading = false;
          // Eliminar el mensaje temporal si falló
          this.messages = this.messages.filter(m => m.id !== tempMsg.id);
          this.cdr.detectChanges();
        });
        alert('No se pudo enviar el mensaje. Revisa tu conexión con el servidor.');
      }
    });
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
