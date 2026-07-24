// coach-auth.guard.ts - Improved version
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CoachAuthGuard implements CanActivate {
  constructor(
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    const auth = getAuth();

    return new Observable<boolean | UrlTree>((subscriber) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('CoachAuthGuard: Timeout reached, redirecting to login');
        subscriber.next(this.router.createUrlTree(['/login']));
        subscriber.complete();
      }, 5000);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          clearTimeout(timeout);
          console.log('CoachAuthGuard: Auth state changed, user:', user?.uid);

          if (user) {
            const role = await this.firebaseService.getUserRole(user.uid);
            console.log('CoachAuthGuard: User role:', role);

            if (role === 'coach') {
              subscriber.next(true);
            } else if (role === 'client') {
              // Redirect to client dashboard instead of login
              console.log(
                'CoachAuthGuard: Client detected, redirecting to client dashboard'
              );
              subscriber.next(this.router.createUrlTree(['/client']));
            } else {
              console.log('CoachAuthGuard: Unknown role, redirecting to login');
              subscriber.next(this.router.createUrlTree(['/login']));
            }
          } else {
            console.log('CoachAuthGuard: No user, redirecting to login');
            subscriber.next(this.router.createUrlTree(['/login']));
          }
        } catch (error) {
          console.error('CoachAuthGuard: Error:', error);
          subscriber.next(this.router.createUrlTree(['/login']));
        } finally {
          subscriber.complete();
          unsubscribe();
        }
      });
    });
  }
}
