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
import { Auth, updateProfile } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';
import { LocationSettingsService } from '../../../services/location-settings.service';

interface ClientProfile {
  uid: string;
  email: string;
  name: string;
  contactNumber: string;
  gcashNumber?: string;
  bio?: string;
  photoURL?: string;
}

@Component({
  selector: 'app-client-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
export class ProfilePage implements OnInit {
  clientId: string = '';
  clientData: ClientProfile = {
    uid: '',
    email: '',
    name: '',
    contactNumber: '',
    gcashNumber: '',
    bio: '',
    photoURL: '',
  };
  isLoading: boolean = true;
  private storage: FirebaseStorage = getStorage();
  locationEnabled: boolean = false;
  highAccuracyEnabled: boolean = false;
  isLocationLoading: boolean = false;

  constructor(
    private actionSheetCtrl: ActionSheetController,
    private alertController: AlertController,
    private auth: Auth,
    private elementRef: ElementRef,
    private firestore: Firestore,
    private loadingCtrl: LoadingController,
    private platform: Platform,
    private renderer: Renderer2,
    private toastCtrl: ToastController,
    public navCtrl: NavController,
    private locationSettingsService: LocationSettingsService
  ) {}

  async ngOnInit() {
    this.clientId = this.auth.currentUser?.uid || '';
    if (!this.clientId) {
      this.navCtrl.navigateRoot(['/login']);
      return;
    }
    await this.loadClientData();
    await this.loadLocationSettings();
  }

  async loadClientData() {
    this.isLoading = true;
    const loading = await this.loadingCtrl.create({ message: 'Loading profile...' });
    try {
      await loading.present();
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('uid', '==', this.clientId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) throw new Error('Client profile not found');
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as ClientProfile;
      this.clientData = {
        uid: this.clientId,
        email: userData['email'] || '',
        name: userData['name'] || 'No Name',
        contactNumber: userData['contactNumber'] || 'Not provided',
        gcashNumber: userData['gcashNumber'] || 'Not provided',
        bio: userData['bio'] || '',
        photoURL: userData['photoURL'] || '',
      };
    } catch (error: any) {
      this.showError(error.message || 'Failed to load profile');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
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

  async logout() {
    // Use your AuthService or Firebase signOut
    if (this.auth.currentUser) {
      await this.auth.signOut();
      this.navCtrl.navigateRoot(['/login']);
    }
  }

  showError(message: string) {
    this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'danger',
      position: 'bottom',
    }).then(t => t.present());
  }

  showSuccess(message: string) {
    this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom',
    }).then(t => t.present());
  }

  openSettings() {
    alert('Settings page coming soon!');
  }
} 