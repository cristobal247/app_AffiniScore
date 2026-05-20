import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonButton, IonIcon, IonImg, IonInput, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, cloudUploadOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';

addIcons({ imagesOutline, cloudUploadOutline });

@Component({
  selector: 'app-memories',
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>Recuerdos & Galería</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div style="padding: 16px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <ion-icon name="images-outline"></ion-icon>
        <h3 style="margin:0;">Galería de Recuerdos</h3>
        <div style="flex:1"></div>
        <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none" />
          <ion-button size="small">
            <ion-icon name="cloud-upload-outline"></ion-icon>
            Subir imagen
          </ion-button>
        </label>
      </div>

      <div class="grid">
        <div *ngIf="images.length === 0" style="color: #7e7e7e;">No hay recuerdos disponibles.</div>
        <div class="grid-item" *ngFor="let img of images">
          <ion-card>
            <img [src]="img.publicUrl" alt="recuerdo" />
          </ion-card>
        </div>
      </div>
    </div>
  </ion-content>
  `,
  styles: [
    `.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
     .grid-item ion-card { padding: 0; overflow: hidden; }
     .grid-item img { width: 100%; height: 160px; object-fit: cover; display: block; }`
  ],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonButton, IonIcon]
})
export class MemoriesPage implements OnInit {
  images: Array<{ name: string; publicUrl: string }> = [];
  uploading: boolean = false;

  constructor(private supabaseSvc: SupabaseService, private toastCtrl: ToastController) {}

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    const res = await this.supabaseSvc.listMemoriesPublic();
    if (res && res.data) {
      this.images = res.data;
    } else {
      this.images = [];
    }
  }

  async onFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file) return;
    this.uploading = true;
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
      this.uploading = false;
      ev.target.value = '';
    }
  }
}
