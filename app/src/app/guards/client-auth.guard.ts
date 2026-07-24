// client-auth.guard.ts - Improved version
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ClientAuthGuard implements CanActivate {
  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    const auth = getAuth();

    return new Observable<boolean | UrlTree>((subscriber) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('ClientAuthGuard: Timeout reached, redirecting to login');
        subscriber.next(this.router.createUrlTree(['/login']));
        subscriber.complete();
      }, 5000);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          clearTimeout(timeout);
          console.log('ClientAuthGuard: Auth state changed, user:', user?.uid);

          if (user) {
            const role = await this.firebaseService.getUserRole(user.uid);
            console.log('ClientAuthGuard: User role:', role);

            if (role === 'client') {
              subscriber.next(true);
            } else if (role === 'coach') {
              // Redirect to coach dashboard instead of login
              console.log(
                'ClientAuthGuard: Coach detected, redirecting to coach dashboard'
              );
              subscriber.next(this.router.createUrlTree(['/coach']));
            } else {
              console.log(
                'ClientAuthGuard: Unknown role, redirecting to login'
              );
              subscriber.next(this.router.createUrlTree(['/login']));
            }
          } else {
            console.log('ClientAuthGuard: No user, redirecting to login');
            subscriber.next(this.router.createUrlTree(['/login']));
          }
        } catch (error) {
          console.error('ClientAuthGuard: Error:', error);
          subscriber.next(this.router.createUrlTree(['/login']));
        } finally {
          subscriber.complete();
          unsubscribe();
        }
      });
    });
  }
}
