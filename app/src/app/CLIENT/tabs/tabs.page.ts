import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import {
  ClientTabConfig,
  CLIENT_TABS,
  ClientTabRoutes,
} from '../client-tabs-routing.module';
import { NotificationService } from 'src/app/services/notification.service';
import { Subscription } from 'rxjs';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-client-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    LucideIconsModule,
  ],
  providers: [NotificationService]
})
export class TabsPage implements OnInit {
  tabs: ClientTabConfig[] = CLIENT_TABS;
  activeTab: string = '';

  public unreadCount: number = 0;
  private unreadCountSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Set initial active tab based on current route
    const currentPath = this.router.url.split('/').pop() || 'cl-home';
    this.activeTab = currentPath;

    // Listen for route changes to keep activeTab in sync
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const path = this.router.url.split('/').pop() || 'cl-home';
        this.activeTab = path;
      }
    });

    // Get unread notification count for the current user (Firebase Auth)
    const user = this.auth.currentUser;
    if (user && user.uid) {
      this.unreadCountSub = this.notificationService
        .getUnreadNotificationCount(user.uid)
        .subscribe(count => {
          this.unreadCount = count;
        });
    } else {
      // Listen for auth state changes if not immediately available
      this.auth.onAuthStateChanged((user) => {
        if (user && user.uid) {
          this.unreadCountSub = this.notificationService
            .getUnreadNotificationCount(user.uid)
            .subscribe(count => {
              this.unreadCount = count;
            });
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.unreadCountSub) {
      this.unreadCountSub.unsubscribe();
    }
  }

  async onTabClick(tab: ClientTabConfig) {
    this.activeTab = tab.route;
    this.router.navigate(['/client', tab.route]);
  }

  isActive(tab: ClientTabConfig): boolean {
    return this.activeTab === tab.route;
  }
}
