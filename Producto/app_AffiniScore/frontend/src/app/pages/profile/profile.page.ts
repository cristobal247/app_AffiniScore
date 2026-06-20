import { Component, ViewChild, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton,
  IonIcon, IonItem, IonLabel, IonList, LoadingController,
  IonButtons, IonBackButton, IonCard, IonCardContent, IonToggle,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  personCircleOutline,
  chevronForwardOutline,
  heartOutline,
  heart,
  heartDislikeOutline,
  qrCodeOutline,
  shieldCheckmarkOutline,
  notificationsOutline,
  cameraOutline,
  documentTextOutline,
  trashOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    CommonModule, FormsModule, RouterModule
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
    pushEnabled: true,
    dailyReminder: true,
    challengeInvites: true,
    scoreMilestones: true,
  };

  avatarUrl: string | null = null;
  isUploading = false;
  hasPartner: boolean = false;
  partnerName: string = '';
  partnerAvatarUrl: string | null = null;
  aiVerificationEnabled: boolean = true;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef,
    private alertCtrl: AlertController
  ) {
    addIcons({
      logOutOutline,
      personCircleOutline,
      chevronForwardOutline,
      heartOutline,
      heart,
      heartDislikeOutline,
      qrCodeOutline,
      shieldCheckmarkOutline,
      notificationsOutline,
      cameraOutline,
      documentTextOutline,
      trashOutline
    });
  }

  ngOnInit() {
    this.loadProfileData();
    this.setupPartnershipSubscription();
  }

  ionViewWillEnter() {
    this.loadProfileData();
  }

  /**
   * Se suscribe a cambios en la tabla partnerships para detectar desvinculaciones en tiempo real
   */
  async setupPartnershipSubscription() {
    const user = await this.supabaseSvc.getCurrentUser();
    if (!user) return;

    this.supabaseSvc.supabase
      .channel('partnership-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partnerships',
        },
        (payload: any) => {
          const updated = payload.new;
          // Si el cambio afecta a mi vinculación
          if (updated.user1_id === user.id || updated.user2_id === user.id) {
            if (updated.status === 'active') {
              console.log('Detectada vinculación activa en tiempo real');
              this.loadProfileData().then(() => {
                this.showToast(`¡Vinculación exitosa con ${this.partnerName}!`, 'success');
              });
            } else if (updated.status !== 'active') {
              console.log('Detectada desvinculación en tiempo real');
              this.loadProfileData();
              this.showToast('Tu pareja ha desvinculado la cuenta.', 'warning');
            }
          }
        }
      )
      .subscribe();
  }

  loadingProfile: boolean = false;

  async loadProfileData() {
    this.loadingProfile = true;
    const user = await this.supabaseSvc.getCurrentUser();
    if (!user) {
      this.loadingProfile = false;
      return;
    }
    this.userEmail = user.email;

    // 1. Obtener mi perfil (forzar recarga para asegurar datos actualizados)
    const { data: profile } = await this.supabaseSvc.getUserProfile(true);
    console.log('Current profile fetched (forced refresh):', profile);

    if (profile && profile.avatar_url) {
      this.avatarUrl = profile.avatar_url;
    }

    // 2. Buscar vinculación activa en la tabla 'partnerships'
    // El usuario puede ser user1_id o user2_id
    const { data: partnerships, error: psError } = await (this.supabaseSvc as any).supabase
      .from('partnerships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')
      .limit(1);

    if (psError) {
      console.error('Error fetching partnerships:', psError);
    }

    if (partnerships && partnerships.length > 0) {
      const p = partnerships[0];
      this.hasPartner = true;

      // Identificar el ID de la pareja
      const partnerId = p.user1_id === user.id ? p.user2_id : p.user1_id;

      if (partnerId) {
        // 3. Obtener el nombre de la pareja desde la tabla 'profiles'
        const { data: partnerProfile, error: ppError } = await (this.supabaseSvc as any).supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', partnerId)
          .single();

        if (ppError) {
          console.error('Error fetching partner profile:', ppError);
          this.partnerName = 'Tu Pareja';
        } else if (partnerProfile) {
          this.partnerName = partnerProfile.full_name || 'Tu Pareja';
          this.partnerAvatarUrl = partnerProfile.avatar_url || null;
        }
      } else {
        this.partnerName = 'Tu Pareja';
      }
    } else {
      this.hasPartner = false;
      this.partnerName = '';
      this.partnerAvatarUrl = null;
    }

    // Cargar la preferencia de validación con IA
    this.aiVerificationEnabled = await this.supabaseSvc.getAiVerificationPreference();

    this.cdr.detectChanges();
    setTimeout(() => {
      this.loadingProfile = false;
    }, 150); // Pequeño delay para asegurar que el binding de Angular e Ionic finalice
  }

  public async confirmUnlink() {
    const loading = await this.loadingCtrl.create({
      message: 'Desvinculando...',
      mode: 'ios'
    });
    await loading.present();

    const res = await this.supabaseSvc.unlinkPartner();
    await loading.dismiss();

    if (res.error) {
      this.showToast(res.error, 'danger');
    } else {
      await this.loadProfileData(); // Refrescar datos reales
      this.showToast('Te has desvinculado de tu pareja.', 'success');
    }
  }

  public async linkWithSomeoneElse() {
    const loading = await this.loadingCtrl.create({
      message: 'Preparando nueva vinculación...',
      mode: 'ios'
    });
    await loading.present();

    const res = await this.supabaseSvc.unlinkPartner();
    await loading.dismiss();

    if (res.error) {
      this.showToast(res.error, 'danger');
    } else {
      await this.loadProfileData(); // Refrescar antes de irse
      this.showToast('Te has desvinculado. Ahora puedes vincularte con alguien más.', 'success');
      this.router.navigateByUrl('/qr');
    }
  }

  public navigateToQr() {
    this.router.navigateByUrl('/qr');
  }

  public triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  public async onFileSelected(event: any) {
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
            canvas.toBlob(async (blob) => {
              if (blob) {
                // 1. Subir al bucket 'avatars'
                const uploadRes = await this.supabaseSvc.uploadAvatar(blob);

                if (uploadRes.error) {
                  console.error('Upload Error:', uploadRes.error);
                  this.showToast('Error al subir imagen: ' + uploadRes.error, 'danger');
                } else if (uploadRes.publicUrl) {
                  // 2. Actualizar el perfil con la URL pública
                  const updateRes = await this.supabaseSvc.updateAvatarUrl(uploadRes.publicUrl);

                  if (updateRes.error) {
                    this.showToast('Error al actualizar perfil.', 'danger');
                  } else {
                    this.avatarUrl = uploadRes.publicUrl;
                    this.showToast('Foto de perfil actualizada exitosamente.', 'success');
                  }
                }
              } else {
                this.showToast('Error al procesar la imagen.', 'danger');
              }
              this.isUploading = false;
              await loading.dismiss();
              event.target.value = null;
            }, 'image/jpeg', 0.8);
          }
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

  public async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }


  public onPrivacyChange(): void {
    console.log('Privacy updated', this.privacySettings);
  }

  public onNotificationChange(): void {
    console.log('Notifications updated', this.notificationSettings);
  }

  public async onAiVerificationToggleChange(event: any) {
    if (this.loadingProfile) {
      // Ignorar cambios que provienen de la inicialización de la vista
      return;
    }
    const val = event.detail.checked;
    this.aiVerificationEnabled = val;
    console.log('AI Verification Preference updated', val);
    const res = await this.supabaseSvc.updateAiVerificationPreference(val);
    if (res.error) {
      this.showToast('Error al guardar la preferencia: ' + (res.error.message || res.error), 'danger');
    } else {
      this.showToast('Preferencia de verificación con IA actualizada.', 'success');
    }
  }

  public async logout() {
    const loading = await this.loadingCtrl.create({
      message: 'Cerrando sesión...',
      mode: 'ios'
    });
    await loading.present();

    await this.supabaseSvc.signOut();

    await loading.dismiss();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  public async confirmDeleteAccount() {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar tu cuenta?',
      subHeader: 'Esta acción es permanente. Se borrarán tus datos de forma definitiva y te desvincularás de tu pareja.',
      message: 'Para confirmar la eliminación, escribe la frase "eliminar cuenta" a continuación:',
      mode: 'ios',
      inputs: [
        {
          name: 'confirmationText',
          type: 'text',
          placeholder: 'Escribe "eliminar cuenta"'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async (data) => {
            const typedText = data.confirmationText ? data.confirmationText.toLowerCase().trim() : '';
            if (typedText !== 'eliminar cuenta') {
              this.showToast('La frase escrita no es válida. No se eliminó la cuenta.', 'warning');
              return false;
            }

            const loading = await this.loadingCtrl.create({
              message: 'Eliminando tu cuenta...',
              mode: 'ios'
            });
            await loading.present();

            try {
              const currentUser = await this.supabaseSvc.getCurrentUser();
              if (!currentUser) throw new Error('No se encontró el usuario actual');

              const res = await this.supabaseSvc.deleteAccount(currentUser.id);
              await loading.dismiss();

              if (res.error) {
                this.showToast('Error al eliminar cuenta: ' + res.error, 'danger');
              } else {
                this.showToast('Tu cuenta ha sido eliminada exitosamente.', 'success');
                await this.supabaseSvc.signOut();
                this.router.navigateByUrl('/login', { replaceUrl: true });
              }
            } catch (err: any) {
              await loading.dismiss();
              this.showToast('Error: ' + (err.message || err), 'danger');
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async exportPDF() {
    const loading = await this.loadingCtrl.create({
      message: 'Generando Reporte Semanal...',
      mode: 'ios'
    });
    await loading.present();

    try {
      const res = await this.supabaseSvc.getWeeklyReportData();
      await loading.dismiss();

      if (res.error || !res.data) {
        this.showToast('No se pudieron obtener los datos para el reporte: ' + (res.error || 'Sin datos'), 'danger');
        return;
      }

      const { memberPoints, actionsDetail, memories, newGeozones } = res.data;

      // Calcular puntos semanales totales de la pareja
      let totalWeeklyPoints = 0;
      memberPoints.forEach((m: any) => {
        totalWeeklyPoints += m.weeklyPoints;
      });

      // Inicializar jsPDF
      const doc = new jsPDF();

      // Cabecera Principal
      doc.setFontSize(22);
      doc.setTextColor(189, 52, 58); // Color de la marca ($red-brand)
      doc.text('Reporte de Pareja - AffiniScore', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 14, 28);
      
      // Separador
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 32, 196, 32);

      // Sección 1: Resumen de Puntos de la Relación
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumen de Puntos de la Relación', 14, 42);

      const pointsSummaryData = memberPoints.map((m: any) => [
        m.name,
        `+${m.weeklyPoints} pts`,
        `${m.totalPoints} pts`
      ]);
      // Añadir fila de totales
      pointsSummaryData.push([
        'Total Pareja',
        `+${totalWeeklyPoints} pts`,
        `${memberPoints.reduce((acc: number, val: any) => acc + val.totalPoints, 0)} pts`
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['Miembro de la Pareja', 'Puntos esta Semana', 'Puntos Acumulados']],
        body: pointsSummaryData,
        theme: 'striped',
        headStyles: { fillColor: [189, 52, 58] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 12;

      // Sección 2: Detalle de Acciones (Quién hizo qué)
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Detalle de Acciones de la Semana', 14, currentY);

      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const detailsData = (actionsDetail || []).map((log: any) => {
        const d = new Date(log.date);
        return [
          `${daysOfWeek[d.getDay()]} ${d.toLocaleDateString()}`,
          log.userName,
          log.action_name,
          log.category || 'General',
          `+${log.points} pts`
        ];
      });

      if (detailsData.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('No se registraron acciones esta semana.', 14, currentY + 6);
        currentY += 15;
      } else {
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Fecha', 'Usuario', 'Acción / Actividad', 'Categoría', 'Puntos']],
          body: detailsData,
          theme: 'plain',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // Salto de página para galería y geozonas si es muy largo
      if (currentY > 200) {
        doc.addPage();
        currentY = 22;
      }

      // Sección 3: Retos y Galería de Recuerdos
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Retos Completados y Galería de Recuerdos', 14, currentY);

      const memoriesData = (memories || []).map((mem: any) => {
        const d = new Date(mem.created_at);
        const smileText = mem.emotional_score !== undefined && mem.emotional_score !== null 
          ? `${Math.round(mem.emotional_score * 100)}% de felicidad (IA)` 
          : 'Sin validación emocional';
        return [
          mem.title || 'Recuerdo',
          d.toLocaleDateString(),
          smileText,
          mem.file_url ? 'Ver Foto' : 'Sin Foto'
        ];
      });

      if (memoriesData.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('No se agregaron fotos ni recuerdos esta semana.', 14, currentY + 6);
        currentY += 15;
      } else {
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Recuerdo / Reto', 'Fecha', 'Puntuación IA', 'Foto']],
          body: memoriesData,
          theme: 'striped',
          headStyles: { fillColor: [100, 100, 100] },
          columnStyles: {
            3: { textColor: [189, 52, 58], fontStyle: 'bold' } // Resaltar "Ver Foto"
          },
          didDrawCell: (data) => {
            // Si la celda es "Ver Foto" y tiene URL, la hacemos clickeable en el PDF
            if (data.column.index === 3 && data.cell.text[0] === 'Ver Foto') {
              const memIndex = data.row.index;
              const url = memories[memIndex]?.file_url;
              if (url) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
              }
            }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      if (currentY > 210) {
        doc.addPage();
        currentY = 22;
      }

      // Sección 4: Nuevas Zonas de Geofencing
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Nuevas Zonas Especiales (Geofencing)', 14, currentY);

      const geozonesData = (newGeozones || []).map((zone: any) => [
        zone.name,
        `Radio: ${zone.radius || 50}m`,
        `Lat: ${zone.latitude.toFixed(5)}, Lon: ${zone.longitude.toFixed(5)}`
      ]);

      if (geozonesData.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('No se agregaron nuevas zonas especiales esta semana.', 14, currentY + 6);
      } else {
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Nombre del Lugar', 'Radio de Cobertura', 'Coordenadas']],
          body: geozonesData,
          theme: 'striped',
          headStyles: { fillColor: [70, 130, 180] } // Color azul acero para geofencing
        });
      }

      // Guardar o compartir PDF según plataforma
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `Reporte-Semanal-AffiniScore-${Date.now()}.pdf`;
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Reporte Semanal AffiniScore',
          text: 'Aquí está tu reporte semanal de afinidad completo.',
          url: result.uri,
          dialogTitle: 'Compartir o guardar Reporte'
        });
      } else {
        doc.save('Reporte-Semanal-AffiniScore.pdf');
      }

      this.showToast('Reporte generado exitosamente.', 'success');
    } catch (err: any) {
      await loading.dismiss();
      console.error('Error generando PDF:', err);
      this.showToast('Error al generar PDF: ' + err.message, 'danger');
    }
  }
}