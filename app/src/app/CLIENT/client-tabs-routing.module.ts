import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs/tabs.page';

// Tab Route Enum
export enum ClientTabRoutes {
  HOME = 'home',
  EXPLORE = 'explore',
  CLASS = 'class',
  NOTIFICATION = 'notification',
  PROFILE = 'profile',
  // LOGOUT = 'logout',
}

// Tab Configuration Interface
export interface ClientTabConfig {
  route: ClientTabRoutes;
  icon: string;
  label: string;
  path: string;
}

// Tab Configurations with Lucide icon names
export const CLIENT_TABS: ClientTabConfig[] = [
  {
    route: ClientTabRoutes.HOME,
    icon: 'home',
    label: 'Home',
    path: '/client/home',
  },
  {
    route: ClientTabRoutes.EXPLORE,
    icon: 'map-pin',
    label: 'Explore',
    path: '/client/explore',
  },
  {
    route: ClientTabRoutes.CLASS,
    icon: 'dumbbell',
    label: 'Class',
    path: '/client/class',
  },
  {
    route: ClientTabRoutes.NOTIFICATION,
    icon: 'bell',
    label: 'Notification',
    path: '/client/notification',
  },
  {
    route: ClientTabRoutes.PROFILE,
    icon: 'user',
    label: 'Profile',
    path: '/client/profile',
  },
  // Removed logout tab
];
import { ClientAuthGuard } from '../guards/client-auth.guard';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    // canActivate: [ClientAuthGuard], // Removed to avoid redundant guard execution
    children: [
      {
        path: ClientTabRoutes.HOME,
        loadComponent: () =>
          import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: ClientTabRoutes.EXPLORE,
        loadComponent: () =>
          import('./pages/explore/explore.page').then((m) => m.ExplorePage),
      },
      {
        path: ClientTabRoutes.CLASS,
        loadComponent: () =>
          import('./pages/class/class.page').then((m) => m.ClassPage),
      },
      {
        path: 'class/detail/:id',
        loadComponent: () =>
          import('./pages/class-detail/class-detail.page').then(
            (m) => m.ClassDetailPage
          ),
      },
      {
        path: 'gym-detail/:id',
        loadComponent: () =>
          import('./pages/gym-detail/gym-detail.page').then(
            (m) => m.GymDetailPage
          ),
      },
      {
        path: 'gym-detail/:gymId/session/:sessionId',
        loadComponent: () =>
          import('./pages/gym-detail/session-details/session-details.page').then(
            (m) => m.SessionDetailsPage
          ),
      },
      {
        path: ClientTabRoutes.NOTIFICATION,
        loadComponent: () =>
          import('./pages/notification/notification.page').then(
            (m) => m.NotificationPage
          ),
      },
      {
        path: ClientTabRoutes.PROFILE,
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/search/search.page').then((m) => m.SearchPage),
      },
      {
        path: '',
        redirectTo: `/client/${ClientTabRoutes.HOME}`,
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: `/client/${ClientTabRoutes.HOME}`,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientTabsRoutingModule {}
