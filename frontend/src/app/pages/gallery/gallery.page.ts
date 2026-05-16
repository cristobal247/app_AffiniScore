import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonBackButton, IonGrid, IonRow, IonCol, IonCard, IonIcon,
  IonFab, IonFabButton, IonModal, IonButton, IonItem, IonLabel,
  IonInput, IonTextarea, IonImg, IonSkeletonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, cameraOutline, imagesOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { SupabaseService, Memory } from '../../services/supabase';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonBackButton, IonGrid, IonRow, IonCol, IonCard, IonIcon,
    IonFab, IonFabButton, IonModal, IonButton, IonItem, IonLabel,
    IonInput, IonTextarea, IonImg, IonSkeletonText
  ]
})
export class GalleryPage implements OnInit {
  memories: any[] = [];
  isLoading = true;
  isModalOpen = false;
  
  newMemory = {
    description: '',
    imageFile: null as File | null,
    imagePreview: null as string | null
  };

  constructor(private supabaseSvc: SupabaseService) {
    addIcons({ addOutline, cameraOutline, imagesOutline, closeOutline, trashOutline });
  }

  async ngOnInit() {
    await this.loadMemories();
  }

  async loadMemories() {
    this.isLoading = true;
    try {
      // Intentamos cargar de Supabase, si falla usamos mocks para el demo
      const { data, error } = await (this.supabaseSvc as any).getMemories();
      if (error || !data || data.length === 0) {
        this.memories = this.getMockMemories();
      } else {
        this.memories = data;
      }
    } catch (err) {
      this.memories = this.getMockMemories();
    } finally {
      this.isLoading = false;
    }
  }

  getMockMemories() {
    return [
      {
        id: '1',
        image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800&auto=format&fit=crop',
        description: 'Aquel viaje espontáneo a la costa.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString()
      },
      {
        id: '2',
        image_url: 'https://images.unsplash.com/photo-1516589174184-c68526674fd6?q=80&w=800&auto=format&fit=crop',
        description: 'Nuestra primera cena oficial.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200).toISOString()
      },
      {
        id: '3',
        image_url: 'https://images.unsplash.com/photo-1522673607200-1648832cee33?q=80&w=800&auto=format&fit=crop',
        description: 'Caminando bajo la lluvia.',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
      }
    ];
  }

  openAddModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetNewMemory();
  }

  resetNewMemory() {
    this.newMemory = {
      description: '',
      imageFile: null,
      imagePreview: null
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newMemory.imageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.newMemory.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveMemory() {
    if (!this.newMemory.imageFile) return;

    try {
      const res = await (this.supabaseSvc as any).uploadMemory(this.newMemory.imageFile, this.newMemory.description);
      await this.loadMemories();
      this.closeModal();
    } catch (err) {
      console.error('Error saving memory:', err);
      // Fallback local para demo
      const mockNew = {
        id: Date.now().toString(),
        image_url: this.newMemory.imagePreview,
        description: this.newMemory.description,
        created_at: new Date().toISOString()
      };
      this.memories.unshift(mockNew);
      this.closeModal();
    }
  }
}
