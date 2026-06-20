import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { createAnimation } from '@ionic/core';
import { iosTransitionAnimation } from '@ionic/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

/**
 * ─────────────────────────────────────────────────────────────────
 * GUARDIÁN DE ALMACENAMIENTO
 * Se ejecuta ANTES de que Supabase lea el localStorage.
 * Detecta tokens de sesión con JSON corrupto y los elimina,
 * evitando que la app quede en pantalla blanca en Android y web.
 * ─────────────────────────────────────────────────────────────────
 */
function sanitizeStorage(): void {
  try {
    const keysToCheck: string[] = [];

    // Recopilar todas las claves de Supabase y de la app
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keysToCheck.push(key);
    }

    for (const key of keysToCheck) {
      // Solo validamos las claves que almacenan JSON (Supabase guarda sb-*-auth-token)
      if (key.startsWith('sb-') || key.startsWith('supabase') || key.includes('auth-token') || key.includes('session')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) JSON.parse(raw); // Intenta parsear: si falla, el dato está corrupto
        } catch {
          console.warn(`[Startup] Dato corrupto detectado en localStorage["${key}"]. Eliminando...`);
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    // Si incluso leer el localStorage falla (cuota excedida, etc.), limpiamos todo
    console.error('[Startup] Error crítico al leer localStorage. Limpiando todo el almacenamiento.', e);
    try { localStorage.clear(); } catch { /* ignorar */ }
    try { sessionStorage.clear(); } catch { /* ignorar */ }
  }
}

/**
 * Limpieza de emergencia: borra todo el almacenamiento y recarga la app.
 * Se invoca solo si Angular no puede arrancar en absoluto.
 */
function emergencyReset(error: any): void {
  console.error('[Startup] Error fatal al inicializar Angular. Ejecutando limpieza de emergencia.', error);
  try { localStorage.clear(); } catch { /* ignorar */ }
  try { sessionStorage.clear(); } catch { /* ignorar */ }
  // Recargar la app limpia después de 500ms para que el log sea visible
  setTimeout(() => window.location.reload(), 500);
}

export const customAnimation = (_: HTMLElement, opts: any) => {
  const enteringEl = opts.enteringEl;
  const leavingEl = opts.leavingEl;

  const isProfileEntering = enteringEl.tagName === 'APP-PROFILE';
  const isProfileLeaving = leavingEl && leavingEl.tagName === 'APP-PROFILE';

  if (isProfileEntering && opts.direction === 'forward') {
    const rootAnimation = createAnimation()
      .addElement(enteringEl)
      .duration(300)
      .easing('cubic-bezier(0.36,0.66,0.04,1)');

    const enteringAnimation = createAnimation()
      .addElement(enteringEl)
      .fromTo('transform', 'translateY(100%)', 'translateY(0%)')
      .fromTo('opacity', 0, 1);

    rootAnimation.addAnimation(enteringAnimation);

    if (leavingEl) {
      const leavingAnimation = createAnimation()
        .addElement(leavingEl)
        .fromTo('transform', 'scale(1)', 'scale(0.93)')
        .fromTo('opacity', 1, 0.5);
      rootAnimation.addAnimation(leavingAnimation);
    }
    return rootAnimation;
  }

  if (isProfileLeaving && opts.direction === 'back') {
    const rootAnimation = createAnimation()
      .addElement(enteringEl)
      .duration(300)
      .easing('cubic-bezier(0.36,0.66,0.04,1)');

    const leavingAnimation = createAnimation()
      .addElement(leavingEl)
      .fromTo('transform', 'translateY(0%)', 'translateY(100%)')
      .fromTo('opacity', 1, 0);
    rootAnimation.addAnimation(leavingAnimation);

    if (enteringEl) {
      const enteringAnimation = createAnimation()
        .addElement(enteringEl)
        .fromTo('transform', 'scale(0.93)', 'scale(1)')
        .fromTo('opacity', 0.5, 1);
      rootAnimation.addAnimation(enteringAnimation);
    }
    return rootAnimation;
  }

  return iosTransitionAnimation(_, opts);
};

import { provideHttpClient } from '@angular/common/http';

// ─── PASO 1: Sanear almacenamiento ANTES de que Supabase lo lea ───────────────
sanitizeStorage();

// ─── PASO 2: Arrancar Angular con recuperación automática en caso de fallo ────
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'ios',
      navAnimation: customAnimation
    }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
  ],
}).catch(emergencyReset);
