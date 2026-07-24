import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs/tabs.page';

// Tab Route Enum
export enum CoachTabRoutes {
  COACH_HOME = 'coach-home',
  COACH_CLASS = 'coach-class',
  COACH_NOTIFICATION = 'coach-notification',
  COACH_PROFILE = 'coach-profile',
  COACH_EXPLORE = 'coach-explore',
}

// Tab Configuration Interface
export interface CoachTabConfig {
  route: CoachTabRoutes;
  icon: string;
  label: string;
  path: string;
}

// Tab Configurations with Lucide icon names
export const COACH_TABS: CoachTabConfig[] = [
  {
    route: CoachTabRoutes.COACH_HOME,
    icon: 'home',
    label: 'Home',
    path: '/coach/coach-home',
  },

  {
    route: CoachTabRoutes.COACH_EXPLORE,
    icon: 'search',
    label: 'Explore',
    path: '/coach/coach-explore',
  },
  {
    route: CoachTabRoutes.COACH_CLASS,
    icon: 'dumbbell',
    label: 'Class',
    path: '/coach/coach-class',
  },
  {
    route: CoachTabRoutes.COACH_NOTIFICATION,
    icon: 'bell',
    label: 'Notification',
    path: '/coach/coach-notification',
  },
  {
    route: CoachTabRoutes.COACH_PROFILE,
    icon: 'user',
    label: 'Profile',
    path: '/coach/coach-profile',
  },
];

import { CoachAuthGuard } from '../guards/coach-auth.guard';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: CoachTabRoutes.COACH_HOME,
        loadComponent: () =>
          import('./pages/coach-home/coach-home.page').then(
            (m) => m.CoachHomePage
          ),
      },
      {
        path: CoachTabRoutes.COACH_CLASS,
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/coach-class/coach-class.page').then(
                (m) => m.CoachClassPage
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/coach-class/coach-class.page').then(
                (m) => m.CoachClassPage
              ),
          },
          {
            path: ':id/payment',
            loadComponent: () =>
              import('./pages/coach-payment/coach-payment.page').then(
                (m) => m.CoachPaymentPage
              ),
          },
        ],
      },
      {
        path: CoachTabRoutes.COACH_NOTIFICATION,
        loadComponent: () =>
          import('./pages/coach-notification/coach-notification.page').then(
            (m) => m.CoachNotificationPage
          ),
      },
      {
        path: CoachTabRoutes.COACH_PROFILE,
        loadComponent: () =>
          import('./pages/coach-profile/coach-profile.page').then(
            (m) => m.CoachProfilePage
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: CoachTabRoutes.COACH_EXPLORE,
        loadComponent: () =>
          import('./pages/coach-explore/coach-explore.page').then(
            (m) => m.CoachExplorePage
          ),
      },
      {
        path: 'gym/:gymId',
        children: [
          {
            path: '',
        loadComponent: () =>
          import('./pages/coach-gym-detail/coach-gym-detail.page').then(
            (m) => m.CoachGymDetailPage
          ),
          },
          {
            path: 'session-booking',
            loadComponent: () =>
              import('./pages/coach-gym-detail/session-booking/session-booking.page').then(
                (m) => m.SessionBookingPage
              ),
            data: { preload: true }
          },
        ],
      },
      {
        path: '',
        redirectTo: `/coach/${CoachTabRoutes.COACH_HOME}`,
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoachTabsRoutingModule {}
