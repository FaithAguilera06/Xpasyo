import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonInput, 
  IonButton, 
  IonFooter, 
  IonToolbar, 
  IonTitle,
  IonLoading,
  IonAlert,
  ToastController,
  IonLabel
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { LucideIconsModule } from '../../assets/icon/lucide-icons.module';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonFooter, 
    IonTitle, 
    IonToolbar, 
    IonContent, 
    IonInput, 
    IonButton, 
    CommonModule, 
    FormsModule, 
    RouterLink,
    IonLoading,
    IonAlert,
    IonLabel,
    LucideIconsModule
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showErrorAlert: boolean = false;
  focusedField: string = '';
  showPassword: boolean = false;

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private toastController: ToastController,
    private changeDetector: ChangeDetectorRef
  ) {}

  // Focus handling methods
  onFieldFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  onFieldBlur() {
    this.focusedField = '';
  }

  isFieldFocused(fieldName: string): boolean {
    return this.focusedField === fieldName;
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    // Reset any previous errors
    this.showErrorAlert = false;
    
    // Basic validation
    if (!this.email || !this.password) {
      this.showError('Please enter both email and password');
      return;
    }

    // Set loading state
    this.isLoading = true;
    
    try {
      // Sign in with Firebase
      const user = await this.firebaseService.login(this.email, this.password);
      
      if (!user) {
        throw new Error('No user returned from authentication');
      }
      
      // Restrict login if email is not verified
      if (!user.emailVerified) {
        this.showError('Please verify your email address before logging in.');
        // Optionally sign out
        await this.firebaseService.logout();
        return;
      }
      
      // Sync Firestore verification status if email is verified
      try {
        await this.firebaseService.updateEmailVerificationStatus(user.uid, true);
      } catch (error) {
        console.warn('Failed to update Firestore verification status:', error);
        // Continue with login even if Firestore update fails
      }
      
      // Get user profile
      const userProfile = await this.firebaseService.getUserProfile(user.uid);
      
      if (!userProfile) {
        await this.router.navigate(['/profile-setup']);
        this.isLoading = false;
        this.changeDetector.detectChanges();
        return;
      }
      
      // Navigate based on role
      const navigationPath = this.getNavigationPath(userProfile['role']);
      await this.router.navigate([navigationPath]);
      this.isLoading = false;
      this.changeDetector.detectChanges();
      
      // Show success message
      this.presentToast('Login successful!', 'success');
      
    } catch (error: any) {
      console.error('Login error:', error);
      this.handleLoginError(error);
    }
  }
  
  private getNavigationPath(role: string): string {
    switch (role) {
      case 'client':
        return '/client/home';
      case 'coach':
        return '/coach';
      default:
        return '/role-selection';
    }
  }
  
  private handleLoginError(error: any): void {
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    
    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
      }
    }
    
    this.showError(errorMessage);
  }
  
  private async showError(message: string) {
    this.errorMessage = message;
    this.showErrorAlert = true;
  }
  
  private async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      buttons: [{
        icon: 'close',
        role: 'cancel'
      }]
    });
    
    await toast.present();
  }

  forgotPassword() {
    // This is a placeholder. In a real app, this would navigate
    // to a password reset page or open a modal.
    this.presentToast('Forgot Password functionality not yet implemented.', 'danger');
  }
}
