import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonImg, IonModal, IonTitle, IonToolbar, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline, chevronBackOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

addIcons({ imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline, chevronBackOutline });

@Component({
  selector: 'app-memories',
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-button fill="clear" class="back-home-btn" (click)="goHome()">
        <ion-icon name="chevron-back-outline" slot="start"></ion-icon>
        Home
      </ion-button>
      <ion-title>Recuerdos & Galería</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="memories-content">
    <div class="collage-shell">
      <div class="topbar">
        <div class="topbar-copy">
          <span class="eyebrow">Galería privada</span>
          <h2>Recuerdos de la relación</h2>
          <p>Un collage sobrio con momentos validados de la pareja.</p>
        </div>

        <div class="topbar-actions">
          <ion-button size="small" fill="outline" class="back-btn" (click)="goHome()">
            <ion-icon name="chevron-back-outline" slot="start"></ion-icon>
            Volver al home
          </ion-button>
          <div class="upload-btn-wrap">
          <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" hidden />
          <ion-button size="small" fill="outline" (click)="fileInput.click()">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Subir imagen
          </ion-button>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <ion-badge color="light">{{ images.length }} recuerdos</ion-badge>
        <ion-badge color="light">Privado para la pareja</ion-badge>
      </div>

      <div class="game-actions">
        <ion-button size="small" fill="outline" (click)="openGame('tabs/memory-history')">Jugar: Recuerdo rápido</ion-button>
        <ion-button size="small" fill="outline" (click)="openGame('tabs/bingo')">Jugar: Bingo</ion-button>
        <ion-button size="small" fill="outline" (click)="openGame('tabs/quick-interaction')">Jugar: ¿Dónde estábamos?</ion-button>
      </div>
      <div class="grid">
        <div *ngIf="images.length === 0" class="empty">
          <div class="empty-card">
            <ion-icon name="images-outline"></ion-icon>
            <h3>No hay recuerdos todavía</h3>
            <p>Sube una imagen para empezar a llenar esta galería.</p>
          </div>
        </div>
        <ion-card class="grid-item" *ngFor="let img of images" (click)="openImage(img)">
          <img [src]="img.image_url" [alt]="img.title || 'recuerdo'" />
          <div class="tile-overlay">
            <ion-icon name="expand-outline"></ion-icon>
            <span>Ver detalle</span>
          </div>
        </ion-card>
      </div>

      <div class="subtle-note">
        <ion-icon name="images-outline"></ion-icon>
        <span>Aparecen tus recuerdos subidos y los de la pareja cuando existe una relación activa.</span>
      </div>
    </div>

    <ion-modal [isOpen]="showUploadModal" (didDismiss)="closeUploadModal()">
      <ng-template>
        <div class="modal-shell upload-shell">
          <ion-button fill="clear" class="close-btn" (click)="closeUploadModal()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>

          <img [src]="pendingPreviewUrl || ''" alt="Vista previa del recuerdo" />

          <div class="detail-card upload-card">
            <div class="detail-card-header">
              <div>
                <div class="detail-kicker">Nuevo recuerdo</div>
                <h3>Fecha y lugar</h3>
              </div>
            </div>

            <div class="detail-row">
              <ion-icon name="time-outline"></ion-icon>
              <input type="date" [(ngModel)]="uploadForm.created_at" />
            </div>

            <div class="detail-row">
              <ion-icon name="location-outline"></ion-icon>
              <input type="text" [(ngModel)]="uploadForm.location_name" placeholder="Escribe un lugar" />
            </div>

            <div class="detail-actions">
              <ion-button size="small" fill="outline" (click)="closeUploadModal()">Cancelar</ion-button>
              <ion-button size="small" fill="solid" class="save-btn" (click)="confirmUpload()" [disabled]="isUploading">{{ isUploading ? 'Subiendo...' : 'Subir imagen' }}</ion-button>
            </div>
          </div>
        </div>
      </ng-template>
    </ion-modal>

    <ion-modal [isOpen]="selectedImage !== null" (didDismiss)="closeImage()">
      <ng-template>
        <div class="modal-shell" *ngIf="selectedImage">
          <ion-button fill="clear" class="close-btn" (click)="closeImage()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
          <img [src]="selectedImage.image_url" [alt]="selectedImage.title || 'recuerdo'" />
          <div class="detail-card">
            <div class="detail-card-header">
              <div>
                <div class="detail-kicker">Detalles del recuerdo</div>
                <h3>Fecha y lugar</h3>
              </div>
              <ion-button size="small" fill="clear" class="edit-toggle" (click)="toggleEditDetails()">
                {{ isEditingDetails ? 'Cerrar edición' : 'Editar' }}
              </ion-button>
            </div>

            <div class="detail-row">
              <ion-icon name="time-outline"></ion-icon>
              <span *ngIf="!isEditingDetails">{{ formatDate(selectedImage.created_at) }}</span>
              <input *ngIf="isEditingDetails" type="date" [(ngModel)]="editForm.created_at" />
            </div>

            <div class="detail-row">
              <ion-icon name="location-outline"></ion-icon>
              <span *ngIf="!isEditingDetails">{{ selectedImage.location_name || 'Lugar no registrado' }}</span>
              <input *ngIf="isEditingDetails" type="text" [(ngModel)]="editForm.location_name" placeholder="Escribe un lugar" />
            </div>

            <div *ngIf="isEditingDetails" class="detail-actions">
              <ion-button size="small" fill="outline" (click)="cancelEditDetails()">Cancelar</ion-button>
              <ion-button size="small" fill="solid" class="save-btn" (click)="saveDetails()" [disabled]="isSavingDetails">{{ isSavingDetails ? 'Guardando...' : 'Guardar cambios' }}</ion-button>
            </div>
          </div>
        </div>
      </ng-template>
    </ion-modal>
  </ion-content>
  `,
  styles: [
    `:host { display: block; background: linear-gradient(180deg, #fffaf8 0%, #f6f1ed 100%); min-height: 100%; color: #2f2324; }
     ion-content.memories-content { --background: linear-gradient(180deg, #fffaf8 0%, #f6f1ed 100%); --color: #2f2324; }
     .collage-shell { padding: 16px; max-width: 980px; margin: 0 auto; }
     .topbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
     .topbar-copy h2 { margin: 8px 0 6px; font-size: 28px; color: #2f2324; }
     .topbar-copy p { margin: 0; color: #6f6464; line-height: 1.5; }
     .eyebrow { display: inline-flex; padding: 7px 12px; border-radius: 999px; background: rgba(189,52,58,.08); color: #bd343a; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .topbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .upload-btn-wrap { align-self: center; display: inline-flex; }
    .back-home-btn { display: none; }
     .stats-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .game-actions { display: flex; gap: 8px; margin: 12px 0 18px; flex-wrap: wrap; }
     .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
     .grid-item { position: relative; margin: 0; overflow: hidden; border-radius: 18px; cursor: pointer; aspect-ratio: 1 / 1.08; box-shadow: 0 10px 24px rgba(31, 24, 24, .06); }
     .grid-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tile-overlay { position: absolute; inset: auto 10px 10px 10px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 999px; background: rgba(17, 17, 17, .55); color: #fff; backdrop-filter: blur(8px); font-size: 12px; }
    .empty { grid-column: 1 / -1; min-height: 210px; display: grid; place-items: center; border: 1px dashed rgba(126,126,126,.25); border-radius: 18px; background: rgba(255,255,255,.55); }
    .empty-card { display: grid; gap: 8px; place-items: center; text-align: center; color: #7e7e7e; padding: 18px; }
    .empty-card ion-icon { font-size: 28px; color: #bd343a; }
    .empty-card h3 { margin: 0; color: #2f2324; font-size: 18px; }
    .empty-card p { margin: 0; color: #7e7e7e; line-height: 1.4; }
     .subtle-note { display: flex; align-items: center; gap: 8px; margin-top: 14px; color: #7c7070; font-size: 13px; }
    .modal-shell { height: 100%; background: #111; display: flex; flex-direction: column; overflow-y: auto; }
    .modal-shell img { width: 100%; height: 46vh; object-fit: cover; flex: 0 0 auto; }
    .upload-shell img { height: 44vh; }
    .detail-card { padding: 18px; display: grid; gap: 12px; background: linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,.94) 24%, #111 100%); color: #fff; margin-top: -84px; }
    .upload-card { margin-top: -72px; }
     .detail-card-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
     .detail-kicker { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.6); }
     .detail-card h3 { margin: 4px 0 0; color: #fff; font-size: 18px; }
     .detail-row { display: flex; align-items: center; gap: 10px; color: #fff; }
     .detail-row ion-icon { color: #fff; }
    .detail-row span { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.45); }
    .detail-row input { flex: 1; min-width: 0; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08); color: #fff; border-radius: 10px; padding: 10px 12px; outline: none; text-shadow: 0 1px 2px rgba(0,0,0,.35); }
    .detail-row input[type="date"] { color-scheme: dark; }
    .detail-row input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .95; }
     .detail-row input::placeholder { color: rgba(255,255,255,.65); }
     .detail-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
     .close-btn { position: absolute; top: 8px; right: 8px; z-index: 2; color: #fff; }
     .edit-toggle { color: #fff; --color: #fff; }
    .save-btn { --background: #bd343a; --background-activated: #9f272d; --color: #fff; }
     @media (max-width: 767px) { .back-home-btn { display: inline-flex; } .back-btn { display: none; } }
     @media (min-width: 768px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .topbar-copy h2 { font-size: 38px; } }
     @media (min-width: 1100px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }`
  ],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonBadge, IonButton, IonIcon, IonImg, IonModal]
})
export class MemoriesPage implements OnInit {
  images: Array<any> = [];
  selectedImage: any | null = null;
  private localPreviewUrl: string | null = null;
  pendingFile: File | null = null;
  pendingPreviewUrl: string | null = null;
  isEditingDetails = false;
  isSavingDetails = false;
  isUploading = false;
  showUploadModal = false;
  uploadForm = {
    created_at: new Date().toISOString().slice(0, 10),
    location_name: '',
  };
  editForm = {
    location_name: '',
    created_at: '',
  };

  constructor(private supabaseSvc: SupabaseService, private toastCtrl: ToastController, private router: Router) {}

  openGame(path: string) {
    // navigate within the app (tabs routes are under /tabs/...)
    this.router.navigateByUrl('/' + path).catch(err => console.warn('Navigation error', err));
  }

  goHome() {
    this.router.navigateByUrl('/tabs/dashboard').catch(err => console.warn('Navigation error', err));
  }

  async ngOnInit() {
    await this.loadImages();
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

  async onFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file) return;

    if (this.pendingPreviewUrl) {
      URL.revokeObjectURL(this.pendingPreviewUrl);
      this.pendingPreviewUrl = null;
    }

    this.pendingFile = file;
    this.pendingPreviewUrl = URL.createObjectURL(file);
    this.showUploadModal = true;
    ev.target.value = '';
  }

  async confirmUpload() {
    if (!this.pendingFile) return;

    this.isUploading = true;
    try {
      const up = await this.supabaseSvc.uploadMemory(this.pendingFile, undefined, this.uploadForm);
      if (up && up.publicUrl) {
        const toast = await this.toastCtrl.create({ message: 'Imagen subida', duration: 1500, color: 'success' });
        await toast.present();
        this.closeUploadModal();
        await this.loadImages();
        this.uploadForm = {
          created_at: new Date().toISOString().slice(0, 10),
          location_name: '',
        };
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

  openImage(image: any) {
    this.selectedImage = image;
    this.isEditingDetails = false;
    this.editForm = {
      location_name: image?.location_name || '',
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
      this.editForm = {
        location_name: this.selectedImage.location_name || '',
        created_at: this.toDateInputValue(this.selectedImage.created_at),
      };
    }
  }

  cancelEditDetails() {
    this.isEditingDetails = false;
    if (this.selectedImage) {
      this.editForm = {
        location_name: this.selectedImage.location_name || '',
        created_at: this.toDateInputValue(this.selectedImage.created_at),
      };
    }
  }

  async saveDetails() {
    if (!this.selectedImage || !this.selectedImage.id) return;

    this.isSavingDetails = true;
    try {
      const location_name = this.editForm.location_name.trim() || null;
      const created_at = this.editForm.created_at ? new Date(`${this.editForm.created_at}T12:00:00`).toISOString() : null;
      const result = await this.supabaseSvc.updateMemoryMetadata(this.selectedImage.id, { location_name, created_at }, this.selectedImage.image_url);

      if (result?.error) {
        const message = typeof result.error === 'string' ? result.error : result.error?.message || 'No se pudo guardar';
        const toast = await this.toastCtrl.create({ message: 'Error guardando detalle: ' + message, duration: 2500, color: 'danger' });
        await toast.present();
        return;
      }

      this.selectedImage = {
        ...this.selectedImage,
        location_name: location_name ?? undefined,
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
}
