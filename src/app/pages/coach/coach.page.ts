import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonAvatar, IonButtons } from '@ionic/angular/standalone';

@Component({
  selector: 'app-coach',
  templateUrl: './coach.page.html',
  styleUrls: ['./coach.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonAvatar, IonButtons]
})
export class CoachPage {}
