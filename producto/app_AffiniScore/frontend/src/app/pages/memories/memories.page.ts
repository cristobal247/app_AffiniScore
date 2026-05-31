import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonImg, IonModal, IonTitle, IonToolbar, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline, chevronBackOutline, cameraOutline, sparklesOutline, gameControllerOutline, chevronForwardOutline, shareOutline, ellipsisHorizontalOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

addIcons({ imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline, chevronBackOutline, cameraOutline, sparklesOutline, gameControllerOutline, chevronForwardOutline, shareOutline, ellipsisHorizontalOutline });

@Component({
  selector: 'app-memories',
  templateUrl: './memories.page.html',
  styleUrls: ['./memories.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonBadge, IonButton, IonIcon, IonImg, IonModal]
})
export class MemoriesPage implements OnInit {
  images: Array<any> = [];
  selectedImage: any | null = null;
  userAvatarUrl: string | null = null;
  partnerAvatarUrl: string | null = null;
  pendingFile: File | null = null;
  pendingPreviewUrl: string | null = null;
  isEditingDetails = false;
  isSavingDetails = false;
  isUploading = false;
  showUploadModal = false;
  showGamesMenu = false;
  showSuccessAnimation = false;
  newlyCreatedMemory: any = null;
  currentUserId: string | null = null;
  userDisplayName = 'Yo';
  partnerDisplayName = 'Mi pareja';
  
  uploadForm = {
    created_at: new Date().toISOString().slice(0, 10),
    location_name: '',
    description: '',
  };
  editForm = {
    location_name: '',
    description: '',
    created_at: '',
  };

  constructor(private supabaseSvc: SupabaseService, private toastCtrl: ToastController, private router: Router) {}

  openGame(path: string) {
    this.showGamesMenu = false;
    this.router.navigateByUrl('/' + path).catch(err => console.warn('Navigation error', err));
  }

  goHome() {
    this.router.navigateByUrl('/tabs/dashboard').catch(err => console.warn('Navigation error', err));
  }

  toggleGamesMenu() {
    this.showGamesMenu = !this.showGamesMenu;
  }

  getRotationStyle(index: number): string {
    const rotations = [-4, 3, -2, 5, -3, 2];
    return `rotate(${rotations[index % rotations.length]}deg)`;
  }



  async ngOnInit() {
    await this.loadImages();
    await this.loadProfiles();
  }

  async loadProfiles() {
    try {
      const user = await this.supabaseSvc.getCurrentUser();
      if (user) {
        this.currentUserId = user.id;
      }
      
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      if (profile) {
        if (profile.avatar_url) this.userAvatarUrl = profile.avatar_url;
        if (profile.full_name) this.userDisplayName = profile.full_name;
      }
      
      const partnership = await this.supabaseSvc.getActivePartnership();
      if (partnership) {
        if (user) {
          const partnerId = partnership.user1_id === user.id ? partnership.user2_id : partnership.user1_id;
          if (partnerId) {
            const { data: partnerProfile } = await this.supabaseSvc.supabase
              .from('profiles')
              .select('avatar_url, full_name')
              .eq('id', partnerId)
              .single();
              
            if (partnerProfile) {
              if (partnerProfile.avatar_url) this.partnerAvatarUrl = partnerProfile.avatar_url;
              if (partnerProfile.full_name) this.partnerDisplayName = partnerProfile.full_name;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error loading profiles in memories:', e);
    }
  }

  async loadImages() {
    const user = await this.supabaseSvc.getCurrentUser();
    const partnership = await this.supabaseSvc.getActivePartnership();

    if (!user) {
      this.images = [];
      return;
    }

    const res = partnership
      ? await this.supabaseSvc.getCollageMemories(partnership.id)
      : await this.supabaseSvc.getPersonalMemories();
    if (res && res.data) {
      this.images = res.data;
    } else {
      this.images = [];
    }
  }

  openUploadModal() {
    this.pendingFile = null;
    this.pendingPreviewUrl = null;
    this.uploadForm = {
      created_at: new Date().toISOString().slice(0, 10),
      location_name: '',
      description: '',
    };
    this.showUploadModal = true;
  }

  async onFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file) return;

    if (this.pendingPreviewUrl) {
      URL.revokeObjectURL(this.pendingPreviewUrl);
      this.pendingPreviewUrl = null;
    }

    this.pendingFile = file;
    this.pendingPreviewUrl = URL.createObjectURL(file);
    ev.target.value = '';
  }

  async confirmUpload() {
    if (!this.pendingFile) return;

    this.isUploading = true;
    try {
      const finalLocation = this.uploadForm.description.trim()
        ? `${this.uploadForm.location_name.trim()} - ${this.uploadForm.description.trim()}`
        : this.uploadForm.location_name.trim();

      const payload = {
        created_at: this.uploadForm.created_at,
        location_name: finalLocation || 'Recuerdo',
      };

      const up = await this.supabaseSvc.uploadMemory(this.pendingFile, undefined, payload);
      if (up && up.publicUrl) {
        this.newlyCreatedMemory = {
          image_url: up.publicUrl,
          location_name: payload.location_name,
          created_at: payload.created_at
        };
        this.showSuccessAnimation = true;
        this.closeUploadModal();
        await this.loadImages();
        this.uploadForm = {
          created_at: new Date().toISOString().slice(0, 10),
          location_name: '',
          description: '',
        };
        
        setTimeout(() => {
          this.showSuccessAnimation = false;
          this.newlyCreatedMemory = null;
        }, 4000);
      } else {
        const detail = typeof up?.error === 'string' ? up.error : (up?.error?.message || 'Error subiendo imagen');
        const toast = await this.toastCtrl.create({ message: 'Error subiendo imagen: ' + detail, duration: 2500, color: 'danger' });
        await toast.present();
      }
    } catch (e) {
      console.error(e);
      const detail = (e as any)?.message || String(e);
      const toast = await this.toastCtrl.create({ message: 'Error subiendo imagen: ' + detail, duration: 2500, color: 'danger' });
      await toast.present();
    } finally {
      this.isUploading = false;
    }
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.pendingFile = null;
    if (this.pendingPreviewUrl) {
      URL.revokeObjectURL(this.pendingPreviewUrl);
      this.pendingPreviewUrl = null;
    }
  }

  triggerDatePicker(picker: any) {
    if (picker) {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.click();
      }
    }
  }

  getMemoryTitle(locationName?: string): string {
    if (!locationName) return '';
    const parts = locationName.split(' - ');
    return parts[0] || '';
  }

  getMemoryDescription(locationName?: string): string {
    if (!locationName) return '';
    const parts = locationName.split(' - ');
    return parts.slice(1).join(' - ') || '';
  }

  getDaysAgoText(dateStr?: string): string {
    if (!dateStr) return '';
    const memoryDate = new Date(dateStr);
    const today = new Date();
    memoryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - memoryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'hoy';
    if (diffDays < 0) return 'en el futuro';
    return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  openImage(image: any) {
    this.selectedImage = image;
    this.isEditingDetails = false;
    const title = this.getMemoryTitle(image?.location_name);
    const desc = this.getMemoryDescription(image?.location_name);
    this.editForm = {
      location_name: title,
      description: desc,
      created_at: this.toDateInputValue(image?.created_at),
    };
  }

  closeImage() {
    this.selectedImage = null;
    this.isEditingDetails = false;
  }

  toggleEditDetails() {
    this.isEditingDetails = !this.isEditingDetails;
    if (this.selectedImage && this.isEditingDetails) {
      const title = this.getMemoryTitle(this.selectedImage.location_name);
      const desc = this.getMemoryDescription(this.selectedImage.location_name);
      this.editForm = {
        location_name: title,
        description: desc,
        created_at: this.toDateInputValue(this.selectedImage.created_at),
      };
    }
  }

  cancelEditDetails() {
    this.isEditingDetails = false;
    if (this.selectedImage) {
      const title = this.getMemoryTitle(this.selectedImage.location_name);
      const desc = this.getMemoryDescription(this.selectedImage.location_name);
      this.editForm = {
        location_name: title,
        description: desc,
        created_at: this.toDateInputValue(this.selectedImage.created_at),
      };
    }
  }

  async saveDetails() {
    if (!this.selectedImage || !this.selectedImage.id) return;

    this.isSavingDetails = true;
    try {
      const finalLocation = this.editForm.description.trim()
        ? `${this.editForm.location_name.trim()} - ${this.editForm.description.trim()}`
        : this.editForm.location_name.trim();

      const created_at = this.editForm.created_at ? new Date(`${this.editForm.created_at}T12:00:00`).toISOString() : null;
      const result = await this.supabaseSvc.updateMemoryMetadata(this.selectedImage.id, { location_name: finalLocation, created_at }, this.selectedImage.image_url);

      if (result?.error) {
        const message = typeof result.error === 'string' ? result.error : result.error?.message || 'No se pudo guardar';
        const toast = await this.toastCtrl.create({ message: 'Error guardando detalle: ' + message, duration: 2500, color: 'danger' });
        await toast.present();
        return;
      }

      this.selectedImage = {
        ...this.selectedImage,
        location_name: finalLocation,
        created_at: created_at ?? this.selectedImage.created_at,
      };
      this.images = this.images.map(image => image.id === this.selectedImage.id ? { ...image, ...this.selectedImage } : image);
      this.isEditingDetails = false;

      const toast = await this.toastCtrl.create({ message: 'Detalle guardado', duration: 1500, color: 'success' });
      await toast.present();
    } catch (error) {
      const toast = await this.toastCtrl.create({ message: 'Error guardando detalle: ' + ((error as any)?.message || String(error)), duration: 2500, color: 'danger' });
      await toast.present();
    } finally {
      this.isSavingDetails = false;
    }
  }

  private toDateInputValue(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  formatDate(value?: string) {
    if (!value) return 'Fecha no registrada';
    return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateShort(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
}
