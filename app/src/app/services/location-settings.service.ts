import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationSettings {
  locationEnabled: boolean;
  highAccuracyEnabled: boolean;
}

export interface LocationStatus {
  isEnabled: boolean;
  hasPermission: boolean;
  isGPSEnabled: boolean;
  canAccessLocation: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationSettingsService {

  constructor() { }

  async getLocationSettings(): Promise<LocationSettings> {
    try {
      const locationEnabled = await Preferences.get({ key: 'locationEnabled' });
      const highAccuracyEnabled = await Preferences.get({ key: 'highAccuracyEnabled' });
      
      return {
        locationEnabled: locationEnabled.value === 'true',
        highAccuracyEnabled: highAccuracyEnabled.value === 'true'
      };
    } catch (error) {
      console.error('Error loading location settings:', error);
      return {
        locationEnabled: false,
        highAccuracyEnabled: false
      };
    }
  }

  async saveLocationSettings(settings: LocationSettings): Promise<void> {
    try {
      await Preferences.set({ key: 'locationEnabled', value: settings.locationEnabled.toString() });
      await Preferences.set({ key: 'highAccuracyEnabled', value: settings.highAccuracyEnabled.toString() });
    } catch (error) {
      console.error('Error saving location settings:', error);
      throw error;
    }
  }

  async checkLocationStatus(): Promise<LocationStatus> {
    try {
      const settings = await this.getLocationSettings();
      
      // Check if location is enabled in app settings
      if (!settings.locationEnabled) {
        return {
          isEnabled: false,
          hasPermission: false,
          isGPSEnabled: false,
          canAccessLocation: false,
          errorMessage: 'Location is disabled in app settings'
        };
      }

      // Check device permissions
      const permission = await Geolocation.checkPermissions();
      const hasPermission = permission.location === 'granted';

      if (!hasPermission) {
        return {
          isEnabled: true,
          hasPermission: false,
          isGPSEnabled: false,
          canAccessLocation: false,
          errorMessage: 'Location permission not granted'
        };
      }

      // Try to get current location to test if GPS is working
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: settings.highAccuracyEnabled,
          timeout: 5000, // Shorter timeout for testing
          maximumAge: 0,
        });

        const isGPSEnabled = position.coords.accuracy <= 100; // GPS typically has accuracy < 100m

        return {
          isEnabled: true,
          hasPermission: true,
          isGPSEnabled,
          canAccessLocation: true
        };
      } catch (locationError) {
        return {
          isEnabled: true,
          hasPermission: true,
          isGPSEnabled: false,
          canAccessLocation: false,
          errorMessage: 'GPS not available or location service disabled'
        };
      }
    } catch (error) {
      console.error('Error checking location status:', error);
      return {
        isEnabled: false,
        hasPermission: false,
        isGPSEnabled: false,
        canAccessLocation: false,
        errorMessage: 'Failed to check location status'
      };
    }
  }

  async getCurrentLocationWithSettings(): Promise<{ lat: number; lng: number } | null> {
    try {
      const settings = await this.getLocationSettings();
      
      if (!settings.locationEnabled) {
        console.log('Location is disabled in settings');
        return null;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: settings.highAccuracyEnabled,
        timeout: 10000,
        maximumAge: 0,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async checkLocationPermission(): Promise<boolean> {
    try {
      const permission = await Geolocation.checkPermissions();
      return permission.location === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      const request = await Geolocation.requestPermissions();
      return request.location === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getLocationPermissionGuidance(): Promise<string> {
    try {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
          return 'Go to Settings > Apps > XPASYO > Permissions > Location and enable it.';
        } else if (platform === 'ios') {
          return 'Go to Settings > Privacy & Security > Location Services > XPASYO and select "While Using App".';
        }
      } else {
        return 'Click the location icon in your browser address bar and allow location access.';
      }
      return 'Please enable location access in your device settings.';
    } catch (error) {
      return 'Please enable location access in your device settings.';
    }
  }

  async enableLocationAccess(): Promise<{ success: boolean; message: string }> {
    try {
      // First check current permission status
      const currentPermission = await this.checkLocationPermission();
      
      if (currentPermission) {
        // Permission already granted, test location access
        try {
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0,
          });

          // Save settings
          await this.saveLocationSettings({
            locationEnabled: true,
            highAccuracyEnabled: false
          });

          return {
            success: true,
            message: 'Location access enabled successfully'
          };
        } catch (error) {
          return {
            success: false,
            message: 'Location service not available. Please check your device settings.'
          };
        }
      } else {
        // Permission not granted, request it
        const hasPermission = await this.requestLocationPermission();
        
        if (hasPermission) {
          // Permission granted, test location access
          try {
            await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 0,
            });

            // Save settings
            await this.saveLocationSettings({
              locationEnabled: true,
              highAccuracyEnabled: false
            });

            return {
              success: true,
              message: 'Location access enabled successfully'
            };
          } catch (error) {
            return {
              success: false,
              message: 'Location service not available. Please check your device settings.'
            };
          }
        } else {
          // Permission denied
          return {
            success: false,
            message: 'Location permission denied. Please go to your device settings and enable location access for this app, then try again.'
          };
        }
      }
    } catch (error) {
      console.error('Error enabling location access:', error);
      return {
        success: false,
        message: 'Failed to enable location access. Please try again.'
      };
    }
  }
} 