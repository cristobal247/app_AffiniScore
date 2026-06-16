import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { createAnimation } from '@ionic/core';
import { iosTransitionAnimation } from '@ionic/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

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
});
