import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonImg, IonModal, IonTitle, IonToolbar, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

addIcons({ imagesOutline, cloudUploadOutline, expandOutline, closeOutline, locationOutline, timeOutline, heartOutline });

@Component({
  selector: 'app-memories',
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>Recuerdos & Galería</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div class="collage-shell">
      <div class="topbar">
        <div class="topbar-copy">
          <span class="eyebrow">Galería privada</span>
          <h2>Recuerdos de la relación</h2>
          <p>Un collage sobrio con momentos validados de la pareja.</p>
        </div>

        <label class="upload-btn-wrap">
          <input type="file" accept="image/*" (change)="onFileSelected($event)" hidden />
          <ion-button size="small" fill="outline">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Subir imagen
          </ion-button>
        </label>
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
        <div *ngIf="images.length === 0" class="empty">No hay recuerdos validados todavía.</div>
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
        <span>Solo aparecen fotografías con validación positiva o vinculadas a recuerdos completados.</span>
      </div>
    </div>

    <ion-modal [isOpen]="selectedImage !== null" (didDismiss)="closeImage()">
      <ng-template>
        <div class="modal-shell" *ngIf="selectedImage">
          <ion-button fill="clear" class="close-btn" (click)="closeImage()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
          <img [src]="selectedImage.image_url" [alt]="selectedImage.title || 'recuerdo'" />
          <div class="detail-card">
            <div class="detail-row">
              <ion-icon name="time-outline"></ion-icon>
              <span>{{ formatDate(selectedImage.created_at) }}</span>
            </div>
            <div class="detail-row">
              <ion-icon name="location-outline"></ion-icon>
              <span>{{ selectedImage.location_name || 'Lugar no registrado' }}</span>
            </div>
            <div class="detail-row">
              <ion-icon name="heart-outline"></ion-icon>
              <span>{{ selectedImage.emotional_score ?? 'Validado por IA' }}</span>
            </div>
          </div>
        </div>
      </ng-template>
    </ion-modal>
  </ion-content>
  `,
  styles: [
    `:host { display: block; background: linear-gradient(180deg, #fffaf8 0%, #f6f1ed 100%); min-height: 100%; }
     .collage-shell { padding: 16px; max-width: 980px; margin: 0 auto; }
     .topbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
     .topbar-copy h2 { margin: 8px 0 6px; font-size: 28px; color: #2f2324; }
     .topbar-copy p { margin: 0; color: #6f6464; line-height: 1.5; }
     .eyebrow { display: inline-flex; padding: 7px 12px; border-radius: 999px; background: rgba(189,52,58,.08); color: #bd343a; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
     .upload-btn-wrap { align-self: center; }
     .stats-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .game-actions { display: flex; gap: 8px; margin: 12px 0 18px; flex-wrap: wrap; }
     .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
     .grid-item { position: relative; margin: 0; overflow: hidden; border-radius: 18px; cursor: pointer; aspect-ratio: 1 / 1.08; box-shadow: 0 10px 24px rgba(31, 24, 24, .06); }
     .grid-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
     .tile-overlay { position: absolute; inset: auto 10px 10px 10px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 999px; background: rgba(17, 17, 17, .30); color: #fff; backdrop-filter: blur(8px); font-size: 12px; }
     .empty { grid-column: 1 / -1; min-height: 210px; display: grid; place-items: center; color: #7e7e7e; border: 1px dashed rgba(126,126,126,.25); border-radius: 18px; background: rgba(255,255,255,.55); }
     .subtle-note { display: flex; align-items: center; gap: 8px; margin-top: 14px; color: #7c7070; font-size: 13px; }
     .modal-shell { height: 100%; background: #111; display: flex; flex-direction: column; }
     .modal-shell img { width: 100%; height: 60vh; object-fit: cover; }
     .detail-card { padding: 18px; display: grid; gap: 12px; background: linear-gradient(180deg, rgba(17,17,17,0) 0%, #111 24%); color: #fff; margin-top: -84px; }
     .detail-row { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,.9); }
     .close-btn { position: absolute; top: 8px; right: 8px; z-index: 2; color: #fff; }
     @media (min-width: 768px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .topbar-copy h2 { font-size: 38px; } }
     @media (min-width: 1100px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }`
  ],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonBadge, IonButton, IonIcon, IonImg, IonModal]
})
export class MemoriesPage implements OnInit {
  images: Array<any> = [];
  selectedImage: any | null = null;

  constructor(private supabaseSvc: SupabaseService, private toastCtrl: ToastController, private router: Router) {}

  openGame(path: string) {
    // navigate within the app (tabs routes are under /tabs/...)
    this.router.navigateByUrl('/' + path).catch(err => console.warn('Navigation error', err));
  }

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    const user = await this.supabaseSvc.getCurrentUser();
    const partnership = await this.supabaseSvc.getActivePartnership();

    if (!user || !partnership) {
      this.images = [];
      return;
    }

    const res = await this.supabaseSvc.getCollageMemories(partnership.id);
    if (res && res.data) {
      this.images = res.data;
    } else {
      this.images = [];
    }
  }

  async onFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file) return;

    try {
      const up = await this.supabaseSvc.uploadMemory(file);
      if (up && up.publicUrl) {
        const toast = await this.toastCtrl.create({ message: 'Imagen subida', duration: 1500, color: 'success' });
        await toast.present();
        await this.loadImages();
      } else {
        const toast = await this.toastCtrl.create({ message: 'Error subiendo imagen', duration: 2000, color: 'danger' });
        await toast.present();
      }
    } catch (e) {
      console.error(e);
    } finally {
      ev.target.value = '';
    }
  }

  openImage(image: any) {
    this.selectedImage = image;
  }

  closeImage() {
    this.selectedImage = null;
  }

  formatDate(value?: string) {
    if (!value) return 'Fecha no registrada';
    return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
