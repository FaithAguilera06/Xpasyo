import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { FirebaseService } from './services/firebase.service';
import { Router } from '@angular/router';
import { CustomSplashComponent } from './custom-splash/custom-splash.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [CommonModule, IonApp, IonRouterOutlet, CustomSplashComponent],
})
export class AppComponent implements OnInit {
  showSplash = true;
  isOnline = navigator.onLine;

  constructor(private firebaseService: FirebaseService, private router: Router) {}

  ngOnInit() {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
    this.checkAuthAndConnection();
  }

  handleConnectionChange(status: boolean) {
    this.isOnline = status;
    if (status) {
      this.checkAuthAndConnection();
    }
  }

  checkAuthAndConnection() {
    if (!this.isOnline) {
      // Keep splash visible and show offline message
      this.showSplash = true;
      return;
    }
    const auth = getAuth();
    const splashMinTime = 2000; // 2 seconds minimum
    const splashStart = Date.now();

    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const role = await this.firebaseService.getUserRole(user.uid);
        if (role === 'client') {
          this.router.navigate(['/client/home']);
        } else if (role === 'coach') {
          this.router.navigate(['/coach/coach-home']);
        } else {
          this.router.navigate(['/login']);
        }
      } else {
        this.router.navigate(['/login']);
      }
      // Ensure splash is visible for at least splashMinTime ms
      const elapsed = Date.now() - splashStart;
      const remaining = splashMinTime - elapsed;
      setTimeout(() => {
        if (this.isOnline) {
          this.showSplash = false;
        }
      }, remaining > 0 ? remaining : 0);
    });
  }
}
