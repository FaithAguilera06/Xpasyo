import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this._isAuthenticated.asObservable();
  private storage: Storage | null = null;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.storage = window.localStorage;
      this.init();
    }
  }

  private init() {
    const token = this.storage?.getItem('auth_token');
    this._isAuthenticated.next(!!token);
  }

  async login(credentials: any): Promise<boolean> {
    // Implement your login logic here
    // For now, we'll just simulate a successful login
    if (this.storage) {
      this.storage.setItem('auth_token', 'dummy_token');
      this._isAuthenticated.next(true);
      return true;
    }
    return false;
  }

  async logout(): Promise<void> {
    if (this.storage) {
      this.storage.removeItem('auth_token');
    }
    this._isAuthenticated.next(false);
    this.router.navigate(['/login']);
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.storage) return false;
    const token = this.storage.getItem('auth_token');
    return !!token;
  }
}
