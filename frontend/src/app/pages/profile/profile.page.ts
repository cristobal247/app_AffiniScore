import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton, IonCard, IonCardContent, IonToggle,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline, cameraOutline, documentTextOutline } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PrivacySettings {
  profileVisibleToPartner: boolean;
  showStreak: boolean;
  shareActivityStatus: boolean;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  dailyReminder: boolean;
  challengeInvites: boolean;
  scoreMilestones: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButton, 
    IonIcon, IonItem, IonLabel, IonList, IonToggle,
    IonButtons, IonBackButton, IonCard, IonCardContent,
    CommonModule, FormsModule
  ]
})
export class ProfilePage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  userEmail: string | undefined = '';
  
  privacySettings: PrivacySettings = {
    profileVisibleToPartner: true,
    showStreak: true,
    shareActivityStatus: true,
  };
  
  notificationSettings: NotificationSettings = {
    pushEnabled: false,
    dailyReminder: true,
    challengeInvites: true,
    scoreMilestones: true,
  };

  avatarUrl: string | null = null;
  isUploading = false;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({ logOutOutline, personCircleOutline, chevronForwardOutline, heartOutline, qrCodeOutline, shieldCheckmarkOutline, notificationsOutline, checkmarkCircleOutline, phonePortraitOutline, cameraOutline, documentTextOutline });
  }

  async ngOnInit() {
    const user = await this.supabaseSvc.getCurrentUser();
    this.userEmail = user?.email;

    const { data: profile } = await this.supabaseSvc.getUserProfile();
    if (profile && profile.avatar_url) {
      this.avatarUrl = profile.avatar_url;
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Procesando imagen...',
      mode: 'ios'
    });
    await loading.present();

    try {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const updateRes = await this.supabaseSvc.updateAvatarUrl(dataUrl);
            
            if (updateRes.error) {
              console.error('Supabase Error:', updateRes.error);
              const errMsg = typeof updateRes.error === 'string' ? updateRes.error : updateRes.error.message;
              this.showToast('Error: ' + errMsg, 'danger');
            } else {
              this.avatarUrl = dataUrl;
              this.showToast('Foto de perfil actualizada exitosamente.', 'success');
            }
          } else {
            this.showToast('Error al procesar la imagen.', 'danger');
          }
          this.isUploading = false;
          await loading.dismiss();
          event.target.value = null;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      this.showToast('Ocurrió un error inesperado.', 'danger');
      this.isUploading = false;
      await loading.dismiss();
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }

  goToQr() {
    this.router.navigateByUrl('/qr');
  }

  onPrivacyChange(): void {
    console.log('Privacy updated', this.privacySettings);
  }

  onNotificationChange(): void {
    console.log('Notifications updated', this.notificationSettings);
  }

  enablePushNotifications(): void {
    this.notificationSettings.pushEnabled = true;
    console.log('Push notifications enabled');
  }

  sendTestNotification(): void {
    console.log('Test notification sent');
  }

  async logout() {
    const loading = await this.loadingCtrl.create({
      message: 'Cerrando sesión...',
      mode: 'ios'
    });
    await loading.present();

    await this.supabaseSvc.signOut();
    
    await loading.dismiss();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  async exportPDF() {
    try {
      const { data: profile } = await this.supabaseSvc.getUserProfile();
      const points = profile?.total_points || 0;
      const nivelAfinidad = Math.floor(points / 1000) + 1;

      const { data: history, error } = await this.supabaseSvc.getWeeklyHistory();
      if (error) {
        console.error('Error fetching weekly history for PDF:', error);
        return;
      }

      // Agrupar por día de la semana
      const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const groupedByDay: { [key: string]: number } = {};
      
      let weeklyTotal = 0;

      (history || []).forEach((log: any) => {
        const date = new Date(log.date);
        const dayName = daysOfWeek[date.getDay()];
        const pts = log.points_earned || 0;
        groupedByDay[dayName] = (groupedByDay[dayName] || 0) + pts;
        weeklyTotal += pts;
      });

      // Inicializar jsPDF
      const doc = new jsPDF();

      // Título y Cabeceras
      doc.setFontSize(18);
      doc.text('Reporte Semanal de AffiniScore', 14, 22);

      doc.setFontSize(12);
      doc.text(`Nivel de Afinidad: ${nivelAfinidad}`, 14, 32);
      doc.text(`Puntos Totales: ${points}`, 14, 40);
      doc.text(`Puntos Recolectados esta Semana: ${weeklyTotal}`, 14, 48);

      // Tabla de Resumen Semanal
      const tableData = Object.keys(groupedByDay).map(day => [
        day,
        `+${groupedByDay[day]} pts`
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Día de la Semana', 'Puntos Recolectados']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [189, 52, 58] } // Color $red-brand
      });

      // Detalles de acciones de la semana
      doc.setFontSize(14);
      const finalY = (doc as any).lastAutoTable.finalY || 55;
      doc.text('Detalle de Acciones', 14, finalY + 10);

      const detailsData = (history || []).map((log: any) => {
        const d = new Date(log.date);
        return [
          `${daysOfWeek[d.getDay()]} ${d.toLocaleDateString()}`,
          log.action_name,
          `+${log.points_earned}`
        ];
      });

      autoTable(doc, {
        startY: finalY + 15,
        head: [['Fecha', 'Acción', 'Puntos']],
        body: detailsData,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
      });

      // Guardar PDF
      doc.save('Reporte-Semanal-AffiniScore.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  }
}