import { Routes } from '@angular/router';
import { publicGuard } from './guards/public.guard';
import { authGuard } from './guards/auth.guard';
import { partnerGuard } from './guards/partner.guard';

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
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
    canActivate: [publicGuard]
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.page').then(m => m.ResetPasswordPage)
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
        loadComponent: () => import('./actions/actions.page').then(m => m.ActionsPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'mapa',
        loadComponent: () => import('./pages/mapa/mapa.page').then(m => m.MapaPage),
        canActivate: [partnerGuard]
      },

      {
        path: 'chat-ai',
        loadComponent: () => import('./pages/Chat/chat.page').then(m => m.ChatPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'chat-partner',
        loadComponent: () => import('./pages/partner-chat/partner-chat.page').then(m => m.PartnerChatPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'chat',
        loadComponent: () => import('./pages/chat-list/chat-list.page').then(m => m.ChatListPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'group-chat',
        loadComponent: () => import('./pages/groupchat/group-chat.page').then(m => m.GroupChatPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'bingo',
        loadComponent: () => import('./bingo/bingo.page').then(m => m.BingoPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'quick-interaction',
        loadComponent: () => import('./quick-interaction/quick-interaction.page').then(m => m.QuickInteractionPage),
        canActivate: [partnerGuard]
      },
      {
        path: 'memory-history',
        loadComponent: () => import('./pages/memory-history/memory-history.page').then(m => m.MemoryHistoryPage),
        canActivate: [partnerGuard]
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
    canActivate: [authGuard, partnerGuard]
  },
  {
    path: 'memories',
    loadComponent: () => import('./pages/memories/memories.page').then(m => m.MemoriesPage),
    canActivate: [authGuard, partnerGuard]
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
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'chat',
    redirectTo: 'tabs/chat',
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
    path: 'memory-history',
    redirectTo: 'tabs/memory-history',
    pathMatch: 'full'
  },
  {
    path: 'retos',
    loadComponent: () => import('./pages/retos/retos.page').then(m => m.RetosPage),
    canActivate: [authGuard, partnerGuard]
  },
  {
    path: 'challenge-validation',
    loadComponent: () => import('./pages/challenge-validation/challenge-validation.page').then(m => m.ChallengeValidationPage),
    canActivate: [authGuard, partnerGuard]
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
  }
];