import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import {
  ActionSheetController,
  AlertController,
  IonButton,
  IonContent,
  IonLabel,
  IonSpinner,
  LoadingController,
  NavController,
  Platform,
  ToastController,
  IonAvatar,
  IonToggle,
} from '@ionic/angular/standalone';
import { LucideAngularModule } from 'lucide-angular';
import { Auth, signOut } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import {
  getStorage,
  FirebaseStorage,
} from 'firebase/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';
import { LocationSettingsService } from '../../../services/location-settings.service';

declare var Vibrant: any; // For color extraction

interface CoachProfile {
  uid: string;
  email: string;
  name: string;
  contactNumber: string;
  gcashNumber?: string;
  avatar?: string;
}

@Component({
  selector: 'app-coach-profile',
  templateUrl: './coach-profile.page.html',
  styleUrls: ['./coach-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonLabel,
    IonButton,
    IonSpinner,
    LucideAngularModule,
    LucideIconsModule,
    IonAvatar,
    IonToggle,
  ],
})
export class CoachProfilePage implements OnInit {
  coachId: string = '';
  coachData: CoachProfile = {
    uid: '',
    email: '',
    name: '',
    contactNumber: '',
    gcashNumber: '',
    avatar: '',
  };
  isLoading: boolean = true;
  private storage: FirebaseStorage = getStorage();
  locationEnabled: boolean = false;
  highAccuracyEnabled: boolean = false;
  isLocationLoading: boolean = false;

  constructor(
    private alertController: AlertController,
    private auth: Auth,
    private firestore: Firestore,
    private loadingCtrl: LoadingController,
    private platform: Platform,
    private renderer: Renderer2,
    public route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private locationSettingsService: LocationSettingsService
  ) {}

  goBack() {
      this.navCtrl.back();
  }

  async ngOnInit() {
    try {
      this.route.params.subscribe(async (params: any) => {
        this.coachId = params['id'] || this.auth.currentUser?.uid;
        if (!this.coachId) {
          this.router.navigate(['/login']);
          return;
        }
        await this.loadCoachData();
        await this.loadLocationSettings();
      });
    } catch (error) {
      this.showError('Failed to initialize profile page');
    }
  }

  async loadLocationSettings() {
    try {
      const locationEnabled = await Preferences.get({ key: 'locationEnabled' });
      const highAccuracyEnabled = await Preferences.get({ key: 'highAccuracyEnabled' });
      
      this.locationEnabled = locationEnabled.value === 'true';
      this.highAccuracyEnabled = highAccuracyEnabled.value === 'true';
    } catch (error) {
      console.error('Error loading location settings:', error);
    }
  }

  async onLocationToggleChange(event: any) {
    this.isLocationLoading = true;
    
    try {
      const enabled = event.detail.checked;
      
      if (enabled) {
        // Use the enhanced location service to enable location access
        const result = await this.locationSettingsService.enableLocationAccess();
        
        if (result.success) {
          this.locationEnabled = true;
          await this.saveLocationSettings();
          this.showSuccess(result.message);
        } else {
          this.locationEnabled = false;
          // Get platform-specific guidance
          const guidance = await this.locationSettingsService.getLocationPermissionGuidance();
          this.showError(`${result.message}\n\n${guidance}`);
        }
      } else {
        this.locationEnabled = false;
        this.highAccuracyEnabled = false;
        await this.saveLocationSettings();
        this.showSuccess('Location access disabled');
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      this.showError('Failed to update location settings');
    } finally {
      this.isLocationLoading = false;
    }
  }

  async onHighAccuracyToggleChange(event: any) {
    this.isLocationLoading = true;
    try {
      this.highAccuracyEnabled = event.detail.checked;
      await this.saveLocationSettings();
      this.showSuccess(this.highAccuracyEnabled ? 'High accuracy enabled' : 'High accuracy disabled');
    } catch (error) {
      console.error('Error toggling high accuracy:', error);
      this.showError('Failed to update accuracy settings');
    } finally {
      this.isLocationLoading = false;
    }
  }

  async saveLocationSettings() {
    try {
      await Preferences.set({ key: 'locationEnabled', value: this.locationEnabled.toString() });
      await Preferences.set({ key: 'highAccuracyEnabled', value: this.highAccuracyEnabled.toString() });
    } catch (error) {
      console.error('Error saving location settings:', error);
    }
  }

  showSuccess(message: string) {
    this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom',
    }).then(t => t.present());
  }

  async loadCoachData() {
    this.isLoading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Loading profile...',
      spinner: 'crescent',
    });
    try {
      await loading.present();
      const coachRef = doc(this.firestore, 'users', this.coachId);
      const coachSnap = await getDoc(coachRef);
      if (coachSnap.exists()) {
        this.coachData = coachSnap.data() as CoachProfile;
      } else {
        throw new Error('Coach not found');
      }
    } catch (error: any) {
      this.showError('Failed to load profile: ' + (error.message || 'Unknown error. Please try again.'));
    } finally {
      this.isLoading = false;
      if (loading) await loading.dismiss();
    }
  }

  private async showError(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    toast.present();
  }

  async logout() {
    if (this.auth.currentUser) {
      await this.auth.signOut();
      this.router.navigate(['/login']);
    }
  }

  openSettings() {
    alert('Settings page coming soon!');
  }
}
