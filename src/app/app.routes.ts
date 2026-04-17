import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'actions',
    loadComponent: () => import('./actions/actions.page').then(m => m.ActionsPage),
  },
  {
    path: 'catalog',
    loadComponent: () => import('./pages/catalog/catalog.page').then(m => m.CatalogPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage),
  },
  {
    path: '',
    redirectTo: 'actions',
    pathMatch: 'full',
  },
];