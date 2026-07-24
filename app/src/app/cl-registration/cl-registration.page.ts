import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { IonContent, IonInput, IonButton, LoadingController, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { debounceTime, map, switchMap, first } from 'rxjs/operators';
import { LucideIconsModule } from '../../assets/icon/lucide-icons.module';

@Component({
  selector: 'app-cl-registration',
  templateUrl: './cl-registration.page.html',
  styleUrls: ['./cl-registration.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, IonLabel, CommonModule, FormsModule, ReactiveFormsModule, LucideIconsModule]
})
export class ClRegistrationPage implements OnInit {
  registrationForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  passwordStrength: string = '';
  focusedField: string = '';

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private loadingController: LoadingController,
    private router: Router
  ) {
    this.registrationForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z\s'-]+$/)
      ]],
      contactNumber: ['', [
        Validators.required,
        Validators.pattern(/^09\d{9}$/)
      ]],
      gcashNumber: ['', [
        Validators.required,
        Validators.pattern(/^09\d{9}$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ], [this.emailUniqueValidator()]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Add validation logging on form changes
    this.registrationForm.valueChanges.subscribe(() => {
      this.logValidationErrors();
    });
  }

  // Method to log validation errors to console
  logValidationErrors() {
    const controls = this.registrationForm.controls;
    
    Object.keys(controls).forEach(key => {
      const control = controls[key as keyof typeof controls];
      if (control.invalid && control.touched) {
        const errors = control.errors;
        if (errors) {
          console.log(`Validation Error in ${key}:`, {
            field: key,
            value: control.value,
            errors: errors
          });
          
          // Specific error messages for each field
          if (key === 'fullName') {
            if (errors['required']) console.log('❌ Full Name is required');
            if (errors['minlength']) console.log('❌ Full Name must be at least 2 characters');
            if (errors['maxlength']) console.log('❌ Full Name must be less than 100 characters');
            if (errors['pattern']) console.log('❌ Full Name can only contain letters, spaces, hyphens, and apostrophes');
          }
          
          if (key === 'contactNumber') {
            if (errors['required']) console.log('❌ Contact Number is required');
            if (errors['pattern']) console.log('❌ Contact Number must be in format: 09XXXXXXXXX');
          }
          
          if (key === 'gcashNumber') {
            if (errors['required']) console.log('❌ Gcash Number is required');
            if (errors['pattern']) console.log('❌ Gcash Number must be in format: 09XXXXXXXXX');
          }
          
          if (key === 'email') {
            if (errors['required']) console.log('❌ Email is required');
            if (errors['email']) console.log('❌ Please enter a valid email address');
            if (errors['emailTaken']) console.log('❌ This email is already registered');
          }
          
          if (key === 'password') {
            if (errors['required']) console.log('❌ Password is required');
            if (errors['minlength']) console.log('❌ Password must be at least 8 characters');
            if (errors['pattern']) console.log('❌ Password must contain uppercase, lowercase, number, and special character');
          }
          
          if (key === 'confirmPassword') {
            if (errors['required']) console.log('❌ Please confirm your password');
          }
        }
      }
    });
    
    // Check for password mismatch
    if (this.registrationForm.errors?.['passwordMismatch']) {
      console.log('❌ Passwords do not match');
    }
  }

  // Custom validator for password match
  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Async validator for email uniqueness
  emailUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      return control.valueChanges.pipe(
        debounceTime(500),
        switchMap(email => this.firebaseService.checkEmailExists(email)),
        map(exists => exists ? { emailTaken: true } : null),
        first()
      );
    };
  }

  // Password strength meter
  onPasswordInput() {
    const value = this.registrationForm.get('password')?.value || '';
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[!@#$%^&*]/.test(value)) strength++;
    if (strength <= 2) this.passwordStrength = 'Weak';
    else if (strength === 3 || strength === 4) this.passwordStrength = 'Medium';
    else if (strength === 5) this.passwordStrength = 'Strong';
    else this.passwordStrength = '';
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
  toggleShowConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';

    // Log all validation errors before submission
    console.log('🔍 Checking form validation...');
    this.logValidationErrors();

    if (this.registrationForm.valid) {
      console.log('✅ Form is valid, proceeding with registration...');
      const { fullName, contactNumber, gcashNumber, email, password, confirmPassword } = this.registrationForm.value;

      if (password !== confirmPassword) {
        console.log('❌ Password mismatch detected');
        this.errorMessage = 'Passwords do not match.';
        return;
      }

      try {
        console.log('📝 Attempting to register user...');
        await this.firebaseService.registerClient(email, password, fullName, contactNumber, gcashNumber);
        console.log('✅ Registration successful');
        this.successMessage = 'A verification email has been sent to your email address. Please verify your account before logging in.';
        this.registrationForm.reset();

        const loading = await this.loadingController.create({
          message: 'Loading...',
          duration: 2000,
          spinner: 'crescent'
        });
        await loading.present();

        setTimeout(() => {
          loading.dismiss();
          this.router.navigate(['/login']);
        }, 2000);

      } catch (error: any) {
        console.log('❌ Registration failed:', error);
        this.errorMessage = error.message || 'Registration failed. Please try again.';
      }
    } else {
      console.log('❌ Form validation failed');
      this.registrationForm.markAllAsTouched();
      this.logValidationErrors();
    }
  }

  // Method to check if a field is currently focused
  isFieldFocused(fieldName: string): boolean {
    return this.focusedField === fieldName;
  }

  // Method to set focused field
  onFieldFocus(fieldName: string) {
    this.focusedField = fieldName;
  }

  // Method to clear focused field
  onFieldBlur() {
    this.focusedField = '';
  }

  enforceMaxLength(event: any, maxLength: number) {
    const value = event.target.value;
    const control = this.registrationForm.get(this.focusedField);

    if (!control) {
      return;
    }

    if (value && !value.startsWith('09')) {
      control.markAsTouched();
      control.setErrors({ ...control.errors, pattern: true });
    } else if (control.hasError('pattern')) {
      // If it starts with '09' and the only error is the pattern, clear it
      const { pattern, ...errors } = control.errors || {};
      if (Object.keys(errors).length === 0) {
        control.setErrors(null);
      } else {
        control.setErrors(errors);
      }
    }

    if (value && value.length > maxLength) {
      const truncatedValue = value.slice(0, maxLength);
      event.target.value = truncatedValue;
      control.setValue(truncatedValue);
    }
  }

  goToLogin() {
    this.registrationForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
    this.router.navigate(['/login']);
  }
}
