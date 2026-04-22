import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const publicGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabaseSvc = inject(SupabaseService);

  // Verificamos si ya hay un usuario logueado
  const user = await supabaseSvc.getCurrentUser();

  if (user) {
    // Si YA hay sesión, lo redirigimos directo a su dashboard para que salte el login
    router.navigate(['/tabs/dashboard']);
    return false;
  } else {
    // Si no hay sesión, dejamos que vea el login tranquilamente
    return true;
  }
};
