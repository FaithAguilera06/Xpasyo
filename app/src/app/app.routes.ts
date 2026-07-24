import { Routes } from '@angular/router';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { CoachAuthGuard } from './guards/coach-auth.guard';

export const routes: Routes = [
  // Specific routes first
  {
    path: 'client/class/detail/:id',
    loadComponent: () => import('./CLIENT/pages/class-detail/class-detail.page').then(m => m.ClassDetailPage)
  },
  {
    path: 'client/payment',
    loadComponent: () => import('./CLIENT/pages/payment/payment.page').then(m => m.PaymentPage)
  },
  {
    path: 'gym/:id',
    loadComponent: () => import('./CLIENT/pages/gym-detail/gym-detail.page').then( m => m.GymDetailPage)
  },
  {
    path: 'coach/coach-gym-detail/:id',
    loadComponent: () => import('./COACH/pages/coach-gym-detail/coach-gym-detail.page').then( m => m.CoachGymDetailPage)
  },
  // Main feature modules
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'client',
    loadChildren: () => import('./CLIENT/client-tabs-routing.module').then(m => m.ClientTabsRoutingModule),
    canActivate: [ClientAuthGuard],
  },
  {
    path: 'coach',
    loadChildren: () => import('./COACH/coach-tabs-routing.module').then(m => m.CoachTabsRoutingModule),
    canActivate: [CoachAuthGuard],
  },
  // Other routes
  {
    path: 'landing',
    loadComponent: () => import('./landing/landing.page').then( m => m.LandingPage)
  },
  {
    path: 'role-selection',
    loadComponent: () => import('./role-selection/role-selection.page').then(m => m.RoleSelectionPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'cl-registration',
    loadComponent: () => import('./cl-registration/cl-registration.page').then( m => m.ClRegistrationPage)
  },
  {
    path: 'coach-registration',
    loadComponent: () => import('./coach-registration/coach-registration.page').then( m => m.CoachRegistrationPage)
  },
  // Default and catch-all routes
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
