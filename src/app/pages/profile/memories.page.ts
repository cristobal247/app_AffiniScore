import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

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

  triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Subiendo recuerdo...',
      mode: 'ios'
    });
    await loading.present();

    try {
      const uploadResult = await this.supabaseSvc.uploadMemoryImage(file);

      if (uploadResult.error || !uploadResult.url) {
        this.showToast('No se pudo subir la imagen.', 'danger');
        return;
      }

      const saveResult = await this.supabaseSvc.saveSharedMemory(
        uploadResult.url,
        new Date().toISOString()
      );

      if (saveResult.error) {
        this.showToast('La imagen se subió, pero no se pudo guardar el recuerdo.', 'danger');
        return;
      }

      this.showToast('Recuerdo agregado correctamente.', 'success');
      await this.loadMemories();
    } catch (error) {
      console.error('Error uploading memory:', error);
      this.showToast('Error inesperado al subir el recuerdo.', 'danger');
    } finally {
      await loading.dismiss();
      input.value = '';
    }
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

  async addNewMemory() {
    this.triggerFileInput();
  }

  // Placeholder para agregar una nota de voz
  // Esta funcionalidad se implementará en futuras versiones
  async addVoiceNote(memory: SharedMemory) {
    this.showToast('Funcionalidad disponible próximamente', 'warning');
  }
}
