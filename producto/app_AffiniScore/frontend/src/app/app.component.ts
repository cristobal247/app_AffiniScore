import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private router: Router, private supabaseSvc: SupabaseService) {}

  ngOnInit() {
    this.supabaseSvc.onAuthStateChange((event, session) => {
      // Si el evento es un cierre de sesión (manual o por expiración del token)
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }
}
