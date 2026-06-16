import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonIcon, IonButton, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, LoadingController, AlertController, IonSpinner
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../services/supabase';
import { addIcons } from 'ionicons';
import { cameraOutline, checkmarkCircleOutline, alertCircleOutline, imageOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-challenge-validation',
  templateUrl: './challenge-validation.page.html',
  styleUrls: ['./challenge-validation.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonIcon, IonButton, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonSpinner, CommonModule, FormsModule
  ]
})
export class ChallengeValidationPage implements OnInit {
  challenge: any = null;
  selectedFile: File | Blob | null = null;
  imagePreview: string | null = null;
  currentStep: number = 1; // 1: Select/Preview, 2: Loading/Verifying, 3: Success/Feedback
  feedback: string = '';
  pointsAwarded: number = 0;
  maxPoints: number = 0;

  constructor(
    private supabaseSvc: SupabaseService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    addIcons({ cameraOutline, checkmarkCircleOutline, alertCircleOutline, imageOutline, sparklesOutline });
    
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.challenge = navigation.extras.state['challenge'];
    }
  }

  ngOnInit() {
    if (!this.challenge) {
      this.alertCtrl.create({
        header: 'Error',
        message: 'No se encontraron datos del reto a validar.',
        buttons: [{
          text: 'Volver',
          handler: () => {
            this.router.navigate(['/retos']);
          }
        }]
      }).then(alert => alert.present());
    }
  }

  onFileSelected(ev: any) {
    const file = ev.target?.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async verifyChallenge() {
    if (!this.selectedFile || !this.challenge) return;

    this.currentStep = 2; // Move to verification in progress step

    try {
      const res = await this.supabaseSvc.validateChallengePhoto(
        this.challenge.id,
        this.challenge.title,
        this.challenge.description,
        this.challenge.points,
        this.selectedFile
      );

      if (res.success && res.data) {
        const valData = res.data;
        this.feedback = valData.feedback;
        this.pointsAwarded = valData.points_awarded;
        this.maxPoints = valData.max_points;
        this.currentStep = 3; // Success!
      } else {
        throw new Error(res.error || 'No se pudo subir o validar la imagen.');
      }
    } catch (e: any) {
      this.currentStep = 1; // Go back to first step
      const alert = await this.alertCtrl.create({
        header: 'Error al validar',
        message: e.message || String(e),
        buttons: ['Intentar de nuevo'],
        mode: 'ios'
      });
      await alert.present();
    }
  }

  finish() {
    this.router.navigate(['/retos']);
  }
}
