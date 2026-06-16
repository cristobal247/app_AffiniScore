import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonAvatar, IonButtons, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-coach',
  templateUrl: './coach.page.html',
  styleUrls: ['./coach.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonAvatar, IonButtons, IonButton, RouterModule]
})
export class CoachPage {}
