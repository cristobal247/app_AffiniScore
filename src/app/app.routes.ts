import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'actions',
        loadComponent: () => import('./actions/actions.page').then(m => m.ActionsPage)
      },
      {
        path: 'mapa',
        loadComponent: () => import('./pages/mapa/mapa.page').then(m => m.MapaPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/Chat/chat.page').then(m => m.ChatPage)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'catalog',
    loadComponent: () => import('./pages/catalog/catalog.page').then(m => m.CatalogPage),
  },
  {
    path: '',
    redirectTo: 'login', // O 'actions' si ya estás logueada
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'home',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'actions',
    redirectTo: 'tabs/actions',
    pathMatch: 'full'
  },
  {
    path: 'mapa',
    redirectTo: 'tabs/mapa',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    redirectTo: 'tabs/profile',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    redirectTo: 'tabs/chat',
    pathMatch: 'full'
  },
  {
    path: 'qr',
    loadComponent: () => import('./pages/QR/qr.page').then( m => m.QrPage)
  },
  {
    path: 'coach',
    redirectTo: 'tabs/chat',
    pathMatch: 'full'
  },
  {
    path: 'tienda',
    loadComponent: () => import('./tienda/tienda.page').then( m => m.TiendaPage)
  }

];