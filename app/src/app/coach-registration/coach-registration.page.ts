import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonLabel, IonSpinner, LoadingController, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LucideIconsModule } from '../../assets/icon/lucide-icons.module';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-coach-registration',
  templateUrl: './coach-registration.page.html',
  styleUrls: ['./coach-registration.page.scss'],
  standalone: true,
  imports: [IonContent, IonLabel, IonInput, IonButton, IonSpinner, CommonModule, FormsModule, ReactiveFormsModule, LucideIconsModule]
})
export class CoachRegistrationPage implements OnInit {
  registrationForm: FormGroup;
  isSubmitting = false;
  selectedFile: File | null = null;
  focusedField: string | null = null;
  successMessage: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // Firebase instances
  private app;
  private storage;
  private firestore;

  constructor(
    private fb: FormBuilder,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private router: Router,
    private firebaseService: FirebaseService
  ) {
    // Initialize Firebase
    this.app = initializeApp(environment.firebase);
    this.storage = getStorage(this.app);
    this.firestore = getFirestore(this.app);

    this.registrationForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9]{10,15}$/)]],
      gcashNumber: ['', [Validators.required, Validators.pattern(/^09[0-9]{9}$/)]],
      professionalIdNumber: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {}

  // Focus handling methods
  onFieldFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  onFieldBlur() {
    this.focusedField = null;
  }

  isFieldFocused(fieldName: string): boolean {
    return this.focusedField === fieldName;
  }

  enforceMaxLength(event: any, maxLength: number) {
    const input = event.target;
    if (input.value.length > maxLength) {
      input.value = input.value.slice(0, maxLength);
    }
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Please upload an image (JPEG, PNG) or PDF file.';
        event.target.value = ''; // Clear the input
        this.selectedFile = null;
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.errorMessage = 'Please upload a file smaller than 5MB.';
        event.target.value = ''; // Clear the input
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.errorMessage = ''; // Clear any previous error
    }
  }

  async onSubmit() {
    console.log('onSubmit started');
    
    // Clear previous messages
    this.successMessage = '';
    this.errorMessage = '';
    
    if (!this.registrationForm.valid) {
      this.registrationForm.markAllAsTouched();
      this.errorMessage = 'Please fill in all required fields correctly.';
      console.log('Form invalid');
      return;
    }

    if (!this.selectedFile) {
      this.errorMessage = 'Please upload your certified coach license.';
      console.log('No file selected');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Registering coach account...',
      spinner: 'dots'
    });
    
    try {
      await loading.present();
      console.log('Loading presented');

      const formValue = this.registrationForm.value;
      
      // Register the coach with Firebase Auth and save to Firestore
      console.log('Registering coach...');
      const user = await this.firebaseService.registerCoach(
        formValue.email,
        formValue.password,
        formValue.fullName,
        formValue.contactNumber,
        formValue.gcashNumber,
        formValue.professionalIdNumber,
        this.selectedFile!
      );
      
      console.log('Coach registration successful, user ID:', user?.uid);

      // Show success message and redirect
      await loading.dismiss();
      this.isSubmitting = false;
      
      this.successMessage = 'A verification email has been sent to your email address. Please verify your account before logging in.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      // Handle specific Firebase Auth errors
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please use a different email or sign in.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            break;
          case 'permission-denied':
            errorMessage = 'Permission denied. You do not have permission to perform this action.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      await loading.dismiss().catch(e => console.error('Error dismissing loading:', e));
      this.isSubmitting = false;
      
      this.errorMessage = errorMessage;
    }
  }

  private async uploadFileToStorage(file: File): Promise<string> {
    try {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `coach-licenses/${timestamp}_${this.registrationForm.get('professionalIdNumber')?.value}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(this.storage, fileName);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload coach license. Please try again.');
    }
  }

  private async saveCoachToFirestore(docId: string, coachData: any): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'coaches', docId);
      await setDoc(docRef, coachData);
    } catch (error) {
      console.error('Firestore save error:', error);
      throw new Error('Failed to save coach registration. Please try again.');
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Helper method to check if form field has error
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }

  // Helper method to get error message for a field
  getErrorMessage(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.hasError('required')) return `${fieldName} is required.`;
    if (field.hasError('minlength')) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters.`;
    if (field.hasError('pattern') && fieldName === 'contactNumber') return 'Please enter a valid phone number.';
    if (field.hasError('passwordMismatch')) return 'Passwords do not match.';

    return 'Invalid input.';
  }

  goToLogin() {
    this.registrationForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedFile = null;
    this.isSubmitting = false;
    this.router.navigate(['/login']);
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}