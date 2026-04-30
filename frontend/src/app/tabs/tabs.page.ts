import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonRouterOutlet,
  IonContent,
  IonFooter,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  NavController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet, IonContent, IonFooter, IonTabBar, IonTabButton, IonIcon, IonLabel]
})
export class TabsPage {
  constructor(private navCtrl: NavController, private router: Router) {}

  navigate(path: string) {
    if (this.router.url !== path) {
      this.navCtrl.navigateForward(path, { animated: true, animationDirection: 'forward' });
    }
  }

  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }
}
