import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonBackButton, IonIcon, IonCard, IonCardContent, IonCardHeader,
  IonButton, LoadingController, ToastController, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, imageOutline, mic, cameraOutline } from 'ionicons/icons';
import { SharedMemory, SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-memories',
  templateUrl: './memories.page.html',
  styleUrls: ['./memories.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonBackButton, IonIcon, IonCard, IonCardContent, IonCardHeader,
    IonButton, IonFab, IonFabButton,
    CommonModule, FormsModule
  ]
})
export class MemoriesPage implements OnInit {
  // Lista de recuerdos obtenida de Supabase
  memories: SharedMemory[] = [];

  // Control para loading
  isLoading = true;

  constructor(
    private supabaseSvc: SupabaseService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBack, imageOutline, mic, cameraOutline });
  }

  async ngOnInit() {
    // Cargar los recuerdos cuando se inicializa la página
    await this.loadMemories();
  }

  // Obtener todos los recuerdos compartidos de la pareja
  async loadMemories() {
    this.isLoading = true;
    const { data, error } = await this.supabaseSvc.getSharedMemories();

    if (error) {
      console.error('Error loading memories:', error);
      this.showToast('Error al cargar los recuerdos.', 'danger');
    } else {
      this.memories = data || [];
    }

    this.isLoading = false;
  }

  // Formatear la fecha para mostrarla de manera legible
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Mostrar un toast con un mensaje
  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  // Placeholder para agregar una nueva foto
  // Esta funcionalidad se implementará en futuras versiones
  async addNewMemory() {
    this.showToast('Funcionalidad disponible próximamente', 'warning');
  }

  // Placeholder para agregar una nota de voz
  // Esta funcionalidad se implementará en futuras versiones
  async addVoiceNote(memory: SharedMemory) {
    this.showToast('Funcionalidad disponible próximamente', 'warning');
  }
}
