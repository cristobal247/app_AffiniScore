import { Routes } from '@angular/router';
import { publicGuard } from './guards/public.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
    canActivate: [publicGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage),
    canActivate: [publicGuard]
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [authGuard],
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
        path: 'bingo',
        loadComponent: () => import('./pages/profile/bingo.page').then(m => m.BingoPage)
      },
      {
        path: 'quick-interaction',
        loadComponent: () => import('./pages/quick-interaction/quick-interaction.page').then(m => m.QuickInteractionPage)
      },

      {
        path: 'chat-ai',
        loadComponent: () => import('./pages/Chat/chat.page').then(m => m.ChatPage)
      },
      {
        path: 'chat-partner',
        loadComponent: () => import('./pages/partner-chat/partner-chat.page').then(m => m.PartnerChatPage)
      },
      {
        path: 'retos',
        redirectTo: 'actions',
        pathMatch: 'full'
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
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'welcome',
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
    path: 'bingo',
    redirectTo: 'tabs/bingo',
    pathMatch: 'full'
  },
  {
    path: 'quick-interaction',
    redirectTo: 'tabs/quick-interaction',
    pathMatch: 'full'
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat-list/chat-list.page').then(m => m.ChatListPage),
    canActivate: [authGuard]
  },
  {
    path: 'retos',
    redirectTo: 'tabs/actions',
    pathMatch: 'full'
  },
  {
    path: 'qr',
    loadComponent: () => import('./pages/QR/qr.page').then( m => m.QrPage),
    canActivate: [authGuard]
  },
  {
    path: 'coach',
    redirectTo: 'tabs/chat',
    pathMatch: 'full'
  },
  {
    path: 'tienda',
    loadComponent: () => import('./tienda/tienda.page').then( m => m.TiendaPage),
    canActivate: [authGuard]
  },
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then( m => m.WelcomePage),
    canActivate: [publicGuard]
  },
  {
    path: 'gallery',
    loadComponent: () => import('./pages/gallery/gallery.page').then( m => m.GalleryPage),
    canActivate: [authGuard]
  }
];