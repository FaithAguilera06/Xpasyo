import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { CoachTabConfig, COACH_TABS } from '../coach-tabs-routing.module';
import { NotificationService } from 'src/app/services/notification.service';
import { Subscription } from 'rxjs';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-coach-tabs',
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
export class TabsPage implements OnInit, OnDestroy {
  tabs: CoachTabConfig[] = COACH_TABS;
  activeTab: string = '';
  showTabBar: boolean = true;

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
    const currentPath = this.router.url.split('/').pop() || 'coach-home';
    this.activeTab = currentPath;
    this.updateTabBarVisibility(this.router.url);

    // Subscribe to router events to update tab bar visibility on navigation
    this.router.events.subscribe(() => {
      const url = this.router.url;
      this.updateTabBarVisibility(url);
      this.activeTab = url.split('/').pop() || 'coach-home';
    });

    // Get unread notification count for the current coach user (Firebase Auth)
    const user = this.auth.currentUser;
    if (user && user.uid) {
      this.unreadCountSub = this.notificationService
        .getUnreadNotificationCount(user.uid)
        .subscribe(count => {
          this.unreadCount = count;
        });
    } else {
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

  updateTabBarVisibility(url: string) {
    // Hide tab bar on coach-profile route
    if (url.includes('coach-profile')) {
      this.showTabBar = false;
    } else {
      this.showTabBar = true;
    }
  }

  onTabClick(tab: CoachTabConfig) {
    this.activeTab = tab.route;
    this.router.navigate(['/coach', tab.route]);
  }

  isActive(tab: CoachTabConfig): boolean {
    return this.activeTab === tab.route;
  }
}
