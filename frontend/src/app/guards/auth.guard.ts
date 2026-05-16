import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabaseSvc = inject(SupabaseService);

  // Le preguntamos a Supabase si hay un usuario activo
  const user = await supabaseSvc.getCurrentUser();

  if (user) {
    // Si hay sesión, dejamos que la ruta cargue normalmente
    return true;
  } else {
    // Si NO hay sesión, lo expulsamos al login
    router.navigate(['/login']);
    return false;
  }
};
