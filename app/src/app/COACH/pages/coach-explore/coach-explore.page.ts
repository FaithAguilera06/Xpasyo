import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
  HostListener,
} from '@angular/core';
import {
  IonicModule,
  LoadingController,
  AlertController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Geolocation, Position } from '@capacitor/geolocation';
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
} from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';

import { Database, ref, get } from '@angular/fire/database';
import { GeolocationService } from '../../../services/geolocation.service';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { CityPolygonService } from 'src/app/shared/city-polygon.service';
import { LocationSettingsService } from '../../../services/location-settings.service';

// Declare maplibregl to avoid TypeScript errors
declare const maplibregl: any;

interface Coordinates {
  lat: number;
  lng: number;
}

interface Gym {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  coordinates?: Coordinates;
  image?: string;
  gym_logo?:
    | {
        data?: string;
      }
    | string; // Allow both object with data property or direct string
  rating?: number;
  distance?: number;
  gymInfo?: {
    name: string;
    image?: string;
    latitude?: string;
    longitude?: string;
  };
  gym_address?: string;
}

@Component({
  selector: 'app-explore',
  templateUrl: './coach-explore.page.html',
  styleUrls: ['./coach-explore.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    LucideIconsModule,
    // IonSegment and IonSegmentButton removed
    // Add any other required modules here
  ],
})
export class CoachExplorePage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('smallMapContainer', { static: false }) smallMapContainer!: ElementRef;

  private map: any;
  private smallMap: any;
  private userMarker: any;
  private gymMarkers: any[] = [];
  private smallMapUserMarker: any;
  private smallMapGymMarker: any;

  userLocation: { lat: number; lng: number } | null = null;
  nearestGyms: Gym[] = [];
  isGymsLoading = true;
  isMapReady = false;
  get isLoading() {
    return this.isGymsLoading || !this.isMapReady;
  }
  error = '';
  mapInitialized = false;
  mapLoadError = '';
  showLocationModal = false;
  isNative = (window as any).Capacitor ? (window as any).Capacitor.isNativePlatform() : false;
  distanceLimit: number | null = null;
  isFetchingLocation = false;
  private _selectedGym: Gym | null = null;
  set selectedGym(gym: Gym | null) {
    this._selectedGym = gym;
    this.addGymMarkers(); // Re-render markers to update bubble visibility
    
    // Initialize small map when gym is selected
    if (gym) {
      setTimeout(() => {
        this.initializeSmallMap();
      }, 100); // Small delay to ensure DOM is ready
    } else {
      // Clean up small map when no gym is selected
      if (this.smallMap) {
        this.smallMap.remove();
        this.smallMap = null;
      }
    }
  }
  get selectedGym(): Gym | null {
    return this._selectedGym;
  }
  public isClosingCard = false;
  private touchStartY: number | null = null;
  
  // Map caching properties
  private mapCache: { [key: string]: any } = {};
  private tileCache: { [key: string]: any } = {};
  private mapStyleCache: any = null;
  private isMapLibreLoaded = false;

  constructor(
    private router: Router,
    private database: Database,
    private loadingCtrl: LoadingController,
    private zone: NgZone,
    private http: HttpClient,
    private geolocationService: GeolocationService,
    private alertCtrl: AlertController,
    private cityPolygonService: CityPolygonService,
    private locationSettingsService: LocationSettingsService
  ) {}

  async ngOnInit() {
    console.log('=== ngOnInit STARTED ===');
    this.isGymsLoading = true;
    try {
      console.log('Loading MapLibre script...');
      await this.cityPolygonService.loadPolygons();
      await this.loadMapLibreScript();
      console.log('MapLibre script loaded, initializing map...');
      await this.initializeMap();
      if (!this.userLocation) {
        this.showLocationModal = true;
      } else {
        this.showLocationModal = false;
        await this.loadGyms();
      }
      console.log('Gyms loaded');
    } catch (error) {
      console.error('Error initializing explore page:', error);
      this.error = 'Failed to initialize. Please try again.';
    } finally {
      this.isGymsLoading = false;
      console.log('=== ngOnInit COMPLETED ===');
    }
  }

  ngAfterViewInit() {
    // Map initialization is handled in ngOnInit
  }

  private async loadMapLibreScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).maplibregl) {
        resolve();
        return;
      }
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
      document.head.appendChild(cssLink);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
      script.onload = () => resolve();
      script.onerror = () => reject('Failed to load map library.');
      document.head.appendChild(script);
    });
  }

  private async initializeMap() {
    if (this.mapInitialized) return;
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      this.mapLoadError = 'Map library not loaded.';
      return;
    }
    if (!this.mapContainer || !this.mapContainer.nativeElement) {
      this.mapLoadError = 'Map container not available.';
      return;
    }
    let userLocation = await this.getCurrentLocation();
    let initialCenter;
    if (userLocation) {
      this.userLocation = userLocation;
      initialCenter = { lng: userLocation.lng, lat: userLocation.lat };
    } else {
      // Default to Mangga, Quezon City
      initialCenter = { lng: 121.061589, lat: 14.625863 };
    }
    const zoomLevel = 15;
    try {
      this.map = new maplibregl.Map({
        container: this.mapContainer.nativeElement,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [initialCenter.lng, initialCenter.lat],
        zoom: zoomLevel,
      });
      this.map.addControl(new maplibregl.NavigationControl());
      this.mapInitialized = true;
      this.mapLoadError = '';
      this.map.on('load', (e: any) => {
        this.isMapReady = true;
        if (this.userLocation) {
          this.addUserLocationMarker(this.userLocation.lng, this.userLocation.lat);
        }
        this.addGymMarkers();
      });
      this.map.on('error', (e: any) => {
        this.mapLoadError = 'Map failed to load.';
      });
    } catch (error) {
      this.mapLoadError = 'Failed to initialize map.';
    }
  }

  // Get current location using Capacitor Geolocation
  public async getCurrentLocation(): Promise<{
    lat: number;
    lng: number;
  } | null> {
    this.isFetchingLocation = true;
    try {
      // Check location settings first
      const settings = await this.locationSettingsService.getLocationSettings();
      if (!settings.locationEnabled) {
        console.log('Location is disabled in settings');
        return null;
      }
      // Only use cached location if location is enabled
      const cached = localStorage.getItem('cachedUserLocation');
      let cachedLocation: { lat: number; lng: number } | null = null;
      if (cached) {
        cachedLocation = JSON.parse(cached);
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: settings.highAccuracyEnabled,
        timeout: 10000,
        maximumAge: 0,
      });
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      localStorage.setItem('cachedUserLocation', JSON.stringify(location));
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      // Only use cached location if location is enabled (already checked above)
      return null;
    } finally {
      this.isFetchingLocation = false;
    }
  }

  // Add user location marker to the map
  private addUserLocationMarker(lng: number, lat: number) {
    if (!this.map) {
      console.warn('Map is not initialized yet!');
      return;
    }
    if (this.userMarker) {
      this.userMarker.remove();
    }
    const el = document.createElement('div');
    el.className = 'custom-map-pin-marker user-location-marker';
    el.innerHTML = `
      <style>
        .user-location-bubble {
          position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-8px);
          background: #fff; color: #222; padding: 6px 16px; border-radius: 16px; font-size: 14px; font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14); white-space: nowrap; z-index: 10; pointer-events: none; border: 1px solid #e0e0e0;
        }
        .user-location-bubble::after {
          content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
          width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent;
          border-top: 10px solid #fff; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.08));
        }
      </style>
      <div class="user-location-bubble">You are here</div>
      <div class="icon-circle user-location-marker">
        <img src="assets/user-pin.svg" class="user-marker-img" width="48" height="48" alt="User Location" />
      </div>
    `;
    const maplibregl = (window as any).maplibregl;
    this.userMarker = new maplibregl.Marker({
      element: el,
    })
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  // Helper function to clean and normalize an address
  private cleanAddress(address: string): string {
    if (!address) return '';

    // Remove extra whitespace and trim
    let cleaned = address.trim().replace(/\s+/g, ' ');

    // Remove common issues that might cause geocoding to fail
    cleaned = cleaned
      .replace(/\b(?:near|beside|in front of|at)\s+/gi, '') // Remove common prepositions (removed comma from this pattern)
      .replace(/\s*,\s*/g, ', ') // Normalize commas
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s,-]/g, '') // Remove special characters except commas and hyphens
      .trim();

    // Ensure we have a city and country for better geocoding
    if (
      !cleaned.toLowerCase().includes('quezon') &&
      !cleaned.toLowerCase().includes('philippines')
    ) {
      cleaned += ', Quezon City, Philippines';
    }

    return cleaned;
  }

  // Helper function to geocode an address using Nominatim with CORS proxy
  private async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lng: number; display_name: string } | null> {
    console.log('Original address:', address);

    if (!address) {
      console.warn('No address provided for geocoding');
      return null;
    }

    // Clean and normalize the address
    const cleanedAddress = this.cleanAddress(address);
    console.log('Cleaned address:', cleanedAddress);

    // Helper function to directly call Nominatim API with CORS proxy
    const directGeocode = async (
      query: string,
      countryCode: string = 'ph'
    ): Promise<{ lat: number; lng: number; display_name: string } | null> => {
      if (!query) return null;

      try {
        // Using CORS proxy to avoid CORS issues
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const searchQuery = `${query}, ${countryCode}`.trim();
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=1&email=contact@xpasyo.com`;
        const fullUrl = proxyUrl + encodeURIComponent(nominatimUrl);

        console.log('Making geocoding request to:', fullUrl);

        const response = await fetch(fullUrl, {
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent':
              'XpasyoApp/1.0 (contact@xpasyo.com; https://xpasyo.com)',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Geocoding API error: ${response.status} - ${errorText}`
          );
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Geocoding response:', data);

        if (data && data.length > 0) {
          const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display_name: data[0].display_name,
          };
          console.log('Geocoding successful:', result);
          return result;
        }

        console.warn('No results found for query:', searchQuery);
        return null;
      } catch (error) {
        console.error('Geocoding failed with error:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }
        return null;
      }
    };

    try {
      // Try with full address first
      console.log('Trying to geocode full address:', cleanedAddress);
      let result = await directGeocode(cleanedAddress, 'Philippines');

      // If that fails, try with just the first part of the address
      if (!result && cleanedAddress.includes(',')) {
        const firstPart = cleanedAddress.split(',')[0].trim();
        console.log(
          'First attempt failed, trying with first part of address:',
          firstPart
        );
        result = await directGeocode(firstPart, 'Philippines');
      }

      if (!result) {
        console.warn('All geocoding attempts failed for address:', address);
      }

      return result;
    } catch (error) {
      console.error('Unexpected error in geocodeAddress:', error);
      return null;
    }
  }

  // Load gyms from Firebase and geocode their addresses
  private async loadGyms() {
    this.isGymsLoading = true;
    console.log('=== loadGyms STARTED ===');
    console.log('User location:', this.userLocation);
    try {
      console.log('Creating database reference...');
      const gymsRef = ref(this.database, 'gyms');
      console.log('Database reference created:', gymsRef);
      console.log('Fetching gyms from database...');
      
      let snapshot;
      try {
        snapshot = await get(gymsRef);
        console.log('✅ Database fetch successful');
      console.log(
        'Gyms snapshot received:',
        snapshot.exists() ? 'has data' : 'no data'
      );
      } catch (dbError) {
        console.error('❌ Database fetch failed:', dbError);
        throw dbError;
      }

      if (snapshot.exists()) {
        const rawGymsData = snapshot.val();
        console.log('Raw gyms data keys:', Object.keys(rawGymsData));
        console.log('Total gyms in database:', Object.keys(rawGymsData).length);
        
        // Convert the gyms object to an array and add the id to each gym
        const gymsArray = Object.keys(rawGymsData).map((key) => {
          const gym = {
            ...rawGymsData[key],
            originalData: { ...rawGymsData[key] }, // Keep original data for debugging
          };
          // Ensure gym_logo is properly formatted if it exists
          if (gym.gym_logo && gym.gym_logo.data) {
            // If we have a nested data object with the logo URL
            if (!gym.gym_logo.data.startsWith('http')) {
              // Handle relative paths if needed
              // For Firebase Storage, you might need to prepend the storage URL
              // gym.gym_logo.data = `https://firebasestorage.googleapis.com/v0/b/your-app-id.appspot.com/o/${encodeURIComponent(gym.gym_logo.data)}?alt=media`;
              console.log('Processed gym logo path:', gym.gym_logo.data);
            }
          } else {
            // Set a default logo if none exists
            gym.gym_logo = gym.gym_logo || {};
            gym.gym_logo.data = 'assets/icon/gym-placeholder.png';
          }
          return {
            id: key,
            ...gym,
          };
        });
        
        console.log('Gyms array created:', gymsArray.length, 'gyms');
        console.log('Sample gym data:', gymsArray[0]);

        // Process gyms to get coordinates and ensure they're valid
        const gymsWithLocation = [];
        console.log('Starting coordinate processing for', gymsArray.length, 'gyms');

        for (const gym of gymsArray) {
          try {
            let lat: number | null = null;
            let lng: number | null = null;
            let source = 'database';

            console.log(`Processing gym: ${gym.name || 'Unnamed'} (${gym.id})`);
            console.log('Gym data:', {
              latitude: gym.latitude,
              longitude: gym.longitude,
              gymInfo: gym.gymInfo,
              gym_address: gym.gym_address
            });

            // First try to use existing coordinates if they exist
            if (gym.latitude !== undefined && gym.longitude !== undefined) {
              const parsedLat = parseFloat(gym.latitude);
              const parsedLng = parseFloat(gym.longitude);

              if (
                !isNaN(parsedLat) &&
                !isNaN(parsedLng) &&
                Math.abs(parsedLat) <= 90 &&
                Math.abs(parsedLng) <= 180
              ) {
                lat = parsedLat;
                lng = parsedLng;
                console.log(`✅ Using direct coordinates: ${lat}, ${lng}`);
              } else {
                console.log(`❌ Invalid direct coordinates: ${parsedLat}, ${parsedLng}`);
              }
            } else if (gym.gymInfo?.latitude !== undefined && gym.gymInfo?.longitude !== undefined) {
              const parsedLat = parseFloat(gym.gymInfo.latitude);
              const parsedLng = parseFloat(gym.gymInfo.longitude);

              if (
                !isNaN(parsedLat) &&
                !isNaN(parsedLng) &&
                Math.abs(parsedLat) <= 90 &&
                Math.abs(parsedLng) <= 180
              ) {
                lat = parsedLat;
                lng = parsedLng;
                console.log(`✅ Using gymInfo coordinates: ${lat}, ${lng}`);
              } else {
                console.log(`❌ Invalid gymInfo coordinates: ${parsedLat}, ${parsedLng}`);
              }
            } else {
              console.log(`❌ No direct coordinates found`);
            }

            // If no valid coordinates, try to geocode the address
            if ((lat === null || lng === null) && gym.gym_address) {
              console.log(`🔄 Attempting to geocode address: ${gym.gym_address}`);
              const result = await this.geocodeAddress(gym.gym_address);
              if (result) {
                lat = result.lat;
                lng = result.lng;
                source = 'geocoding';
                console.log(`✅ Geocoding successful: ${lat}, ${lng}`);
              } else {
                console.log(`❌ Geocoding failed for address: ${gym.gym_address}`);
              }
            } else if (lat === null || lng === null) {
              console.log(`❌ No address available for geocoding`);
            }

            // Only add the gym if we have valid coordinates
            if (lat !== null && lng !== null) {
              const gymData = {
                id: gym.id,
                name: gym.name,
                originalAddress: gym.originalData?.gym_address || 'N/A',
                cleanedAddress: gym.gym_address,
                coordinates: { lat, lng },
                source,
                originalData: {
                  latitude: gym.originalData?.gymInfo?.latitude,
                  longitude: gym.originalData?.gymInfo?.longitude,
                },
              };

              console.log(`✅ Adding gym with coordinates: ${lat}, ${lng} (source: ${source})`);

              gymsWithLocation.push({
                ...gym,
                coordinates: { lat, lng },
              });
            } else {
              console.warn(
                `❌ Skipping gym ${gym.id} - no valid coordinates found`,
                {
                  name: gym.name,
                  originalAddress: gym.originalData?.gym_address,
                  cleanedAddress: gym.gym_address,
                  source,
                  hadLatLng: !!(gym.gymInfo?.latitude && gym.gymInfo?.longitude),
                }
              );
            }
          } catch (error) {
            console.error(`❌ Error processing gym ${gym.id}:`, error);
          }
        }
        
        console.log(`Coordinate processing complete. Valid gyms: ${gymsWithLocation.length}/${gymsArray.length}`);

        const validGyms = gymsWithLocation as Gym[];
        console.log(`Valid gyms after processing: ${validGyms.length}`);

        // If we have user location, sort by distance
        if (this.userLocation) {
          console.log(`User location available: ${this.userLocation.lat}, ${this.userLocation.lng}`);
          this.nearestGyms = this.geolocationService.findNearestGyms(
            this.userLocation,
            validGyms,
            50 // Return all gyms, sorted by distance
          );
          console.log(`Gyms after distance calculation: ${this.nearestGyms.length}`);
          
          // Apply distance filter if limit is set
          if (this.distanceLimit !== null) {
            this.nearestGyms = this.filterGymsByDistance(this.nearestGyms, this.distanceLimit);
            console.log(`Filtered gyms to ${this.distanceLimit}km limit. Found ${this.nearestGyms.length} gyms.`);
          }
        } else {
          // If no user location, do not display any gyms
          console.log(`❌ No user location available - setting nearestGyms to empty array`);
          this.nearestGyms = [];
        }

        console.log(`Final nearestGyms count: ${this.nearestGyms.length}`);
        console.log('=== loadGyms COMPLETED ===');

        // Add gym markers to the map
        this.addGymMarkers();
      } else {
        console.log('No gyms found');
        this.nearestGyms = [];
      }
    } catch (error) {
      console.error('❌ Error loading gyms:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      this.error = 'Failed to load gyms. Please try again.';
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message:
          'Failed to load gyms. Please check your connection and try again.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      console.log('Setting isGymsLoading to false');
      this.isGymsLoading = false;
    }
  }

  // Add markers for each gym on the map
  private addGymMarkers() {
    console.log('=== addGymMarkers STARTED ===');
    console.log('Map exists:', !!this.map);
    console.log('MapLibre exists:', !!(window as any).maplibregl);
    console.log('Number of gyms to add:', this.nearestGyms.length);
    console.log('Gyms data:', this.nearestGyms);

    if (!this.map) {
      console.error('Map not initialized');
      return;
    }

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      console.error('MapLibre not loaded');
      return;
    }

    this.gymMarkers.forEach(marker => marker.remove());
    this.gymMarkers = [];

    for (const gym of this.nearestGyms) {
      // Use coordinates if available, otherwise fall back to latitude/longitude
      const lng = gym.coordinates?.lng || gym.longitude;
      const lat = gym.coordinates?.lat || gym.latitude;

      console.log(`Gym ${gym.name} coordinates:`, { lat, lng });

      if (lat && lng) {
        console.log(`Adding marker for gym: ${gym.name} at [${lng}, ${lat}]`);
        
        // Only show bubble if not selected
        let bubbleHtml = '';
        if (!this.selectedGym || this.selectedGym.id !== gym.id) {
          bubbleHtml = `
            <style>
              .gym-marker-bubble { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-8px); background: #fff; color: #222; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.12); white-space: nowrap; z-index: 10; pointer-events: none; border: 1px solid #e0e0e0; }
              .gym-marker-bubble::after { content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #fff; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.08)); }
            </style>
            <div class="gym-marker-bubble">${gym.gymInfo?.name || gym.name || 'Gym'}</div>
          `;
        }
        const el = document.createElement('div');
        el.className = 'custom-map-pin-marker gym-marker';
        el.innerHTML = `
          ${bubbleHtml}
          <div class="icon-circle">
            <img src="assets/map-pin.svg" class="gym-marker-img" width="40" height="40" alt="Gym Marker"/>
          </div>
        `;
        const marker = new maplibregl.Marker({
          element: el,
        })
          .setLngLat([lng, lat])
          .addTo(this.map);
        
        // Add click event to marker
        el.addEventListener('click', () => {
          this.selectedGym = gym;
        });
        
        this.gymMarkers.push(marker);
        console.log(`Successfully added marker for gym: ${gym.gymInfo?.name || gym.name}`);
      } else {
        console.warn(`Skipping gym ${gym.name} - no valid coordinates`);
      }
    }

    console.log(`Total markers added: ${this.gymMarkers.length}`);
    console.log('=== addGymMarkers COMPLETED ===');
  }

  // Handle gym click
  viewGymDetails(gymId: string) {
    if (gymId) {
      this.router.navigate(['/coach/coach-gym-detail', gymId]);
    }
  }

  onGymClick(gym: Gym) {
    if (gym.id) {
      this.router.navigate(['/gym', gym.id]);
    }
  }

  // Method to reinitialize the map (for refresh scenarios)
  private async reinitializeMap() {
    console.log('Reinitializing map...');
    
    // Remove existing map if it exists
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    // Reset map state
    this.mapInitialized = false;
    this.isMapReady = false;
    this.userMarker = null;
    this.gymMarkers = [];
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reinitialize the map
    await this.initializeMap();
  }

  // Method to refresh map tiles and handle blank map issues
  private async refreshMapTiles() {
    if (!this.map) return;
    
    try {
      // Force map to reload all tiles
      this.map.resize();
      this.map.triggerRepaint();
      
      // Reload the map style to ensure tiles are fresh
      await this.map.setStyle(this.map.getStyle());
      
      // Wait a moment for tiles to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Map tiles refreshed successfully');
    } catch (error) {
      console.error('Error refreshing map tiles:', error);
      // If tile refresh fails, reinitialize the entire map
      await this.reinitializeMap();
    }
  }

  // Refresh location and reload gyms
  async refreshLocation() {
    this.isGymsLoading = true;
    this.error = '';
    try {
      // Get fresh location
      this.userLocation = await this.getCurrentLocation();
      if (this.userLocation) {
        this.showLocationModal = false;
        this.distanceLimit = null; // Clear distance limit for real location
        
        // Reload the map if it exists
        if (this.map && this.map.isStyleLoaded()) {
          // Force map to reload tiles and refresh
          await this.refreshMapTiles();
          
          // Recenter map to user location
          this.map.setCenter([this.userLocation.lng, this.userLocation.lat]);
          this.map.setZoom(15);
          
          // Clear existing markers
          if (this.userMarker) {
            this.userMarker.remove();
            this.userMarker = null;
          }
          this.gymMarkers.forEach(marker => marker.remove());
          this.gymMarkers = [];
          
          // Add fresh user marker
          this.addUserLocationMarker(this.userLocation.lng, this.userLocation.lat);
        } else {
          // If map doesn't exist or is not loaded, reinitialize it
          console.log('Map not available or not loaded, reinitializing...');
          await this.reinitializeMap();
        }
        
        // Reload gyms with fresh data
        await this.loadGyms();
      } else {
        this.showLocationModal = true;
      }
    } catch (error) {
      console.error('Error refreshing location:', error);
      this.error = 'Failed to refresh location.';
      
      // If map is blank or failed, try to reinitialize it
      if (!this.map || !this.map.isStyleLoaded()) {
        console.log('Map appears to be blank or failed, reinitializing...');
        await this.reinitializeMap();
      }
    } finally {
      this.isGymsLoading = false;
      this.isFetchingLocation = false;
    }
  }

  // Clean up when component is destroyed
  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    if (this.smallMap) {
      this.smallMap.remove();
    }
  }

  /**
   * Gets the logo URL from a gym object, handling both string and object formats
   */
  getGymLogo(gym: Gym | null | undefined): string {
    if (!gym || !gym.gym_logo) {
      return 'assets/icon/gym-placeholder.png';
    }

    if (typeof gym.gym_logo === 'string') {
      return gym.gym_logo;
    }

    return gym.gym_logo.data || 'assets/icon/gym-placeholder.png';
  }

  /**
   * Handles image loading errors by setting a default image
   */
  handleImageError(event: any, gym: Gym) {
    console.error('Error loading image for gym:', gym?.id, event);

    if (event?.target) {
      // Set the default image
      event.target.src = 'assets/icon/gym-placeholder.png';

      // Update the gym_logo to prevent repeated errors
      if (gym) {
        if (typeof gym.gym_logo === 'string') {
          gym.gym_logo = 'assets/icon/gym-placeholder.png';
        } else if (gym.gym_logo) {
          gym.gym_logo.data = 'assets/icon/gym-placeholder.png';
        } else {
          gym.gym_logo = { data: 'assets/icon/gym-placeholder.png' };
        }
      }
    }
  }

  // When user enables location, recenter the map and add marker
  async requestUserLocation() {
    this.isGymsLoading = true;
    try {
      const userLocation = await this.getCurrentLocation();
      if (userLocation) {
        this.userLocation = userLocation;
        this.showLocationModal = false;
        this.distanceLimit = null; // Clear distance limit for real location
        // Recenter map and add marker
        if (this.map) {
          this.map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 17, essential: true, duration: 1000 });
          this.addUserLocationMarker(userLocation.lng, userLocation.lat);
        }
        await this.loadGyms();
      }
    } catch (error) {
      this.error = 'Failed to get location. Please try again.';
    } finally {
      this.isGymsLoading = false;
    }
  }

  async openLocationSettings() {
    if (this.isNative) {
      // await AppSettings.open(); // Uncomment if using the plugin
    }
  }

  private filterGymsByDistance(gyms: Gym[], distanceLimit: number): Gym[] {
    return gyms.filter(gym => gym.distance && gym.distance <= distanceLimit);
  }

  // Clear distance limit and reload gyms
  async clearDistanceLimit() {
    this.distanceLimit = null;
    console.log('Distance limit cleared');
    await this.loadGyms();
  }

  getGymLocationBadge(gym: Gym) {
    return this.cityPolygonService.getLocationBadgeByCoords(gym.coordinates);
  }

  openDirections(gym: Gym) {
    const coords = gym.coordinates;
    let url = '';
    if (coords && coords.lat && coords.lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    } else if (gym.gym_address) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.gym_address)}`;
    } else {
      return;
    }
    window.open(url, '_blank');
  }

  // Swipe to dismiss functionality for gym details card
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.selectedGym) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.selectedGym && this.touchStartY) {
      const currentY = event.touches[0].clientY;
      const diff = currentY - this.touchStartY;
      
      if (diff > 50) { // Swipe down threshold
        this.closeGymCard();
        this.touchStartY = null;
      }
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    this.touchStartY = null;
  }

  // Method to handle smooth closing animation
  public closeGymCard() {
    if (this.selectedGym && !this.isClosingCard) {
      this.isClosingCard = true;
      
      // Wait for animation to complete before removing from DOM
      setTimeout(() => {
        this.selectedGym = null;
        this.isClosingCard = false;
      }, 300); // Match the CSS transition duration
    }
  }

  // Helper to truncate address to 4 words
  truncateAddress(address: string): string {
    if (!address) return '';
    const words = address.split(' ');
    if (words.length <= 4) return address;
    return words.slice(0, 4).join(' ') + '...';
  }

  // Small Map Methods
  private async initializeSmallMap() {
    if (!this.smallMapContainer || !this.smallMapContainer.nativeElement) {
      return;
    }

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      return;
    }

    // Destroy existing small map if it exists
    if (this.smallMap) {
      this.smallMap.remove();
      this.smallMap = null;
    }

    try {
      this.smallMap = new maplibregl.Map({
        container: this.smallMapContainer.nativeElement,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [121.061589, 14.625863], // Default center
        zoom: 13,
        interactive: false, // Disable interactions for small map
      });

      this.smallMap.on('load', () => {
        this.updateSmallMapMarkers();
      });
    } catch (error) {
      console.error('Error initializing small map:', error);
    }
  }

  private updateSmallMapMarkers() {
    if (!this.smallMap || !this.selectedGym || !this.userLocation) {
      return;
    }

    // Clear existing markers
    if (this.smallMapUserMarker) {
      this.smallMapUserMarker.remove();
      this.smallMapUserMarker = null;
    }
    if (this.smallMapGymMarker) {
      this.smallMapGymMarker.remove();
      this.smallMapGymMarker = null;
    }

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      return;
    }

    // Get gym coordinates
    let gymLat = 0;
    let gymLng = 0;

    if (this.selectedGym.coordinates) {
      gymLat = this.selectedGym.coordinates.lat;
      gymLng = this.selectedGym.coordinates.lng;
    } else if (this.selectedGym.latitude && this.selectedGym.longitude) {
      gymLat = this.selectedGym.latitude;
      gymLng = this.selectedGym.longitude;
    } else if (this.selectedGym.gymInfo?.latitude && this.selectedGym.gymInfo?.longitude) {
      gymLat = parseFloat(this.selectedGym.gymInfo.latitude);
      gymLng = parseFloat(this.selectedGym.gymInfo.longitude);
    } else {
      // If no coordinates, try to geocode the address
      this.geocodeAddress(this.selectedGym.gym_address || this.selectedGym.address || '')
        .then(result => {
          if (result) {
            this.updateSmallMapWithCoordinates(result.lat, result.lng);
          }
        });
      return;
    }

    // Add user marker (custom SVG)
    const userEl = document.createElement('div');
    userEl.className = 'custom-map-pin-marker user-location-marker';
    userEl.innerHTML = `
      <img src="assets/user-pin.svg" class="user-marker-img" width="32" height="32" alt="User Location" />
    `;
    this.smallMapUserMarker = new maplibregl.Marker({
      element: userEl,
    })
      .setLngLat([this.userLocation.lng, this.userLocation.lat])
      .addTo(this.smallMap);

    // Add gym marker (custom SVG)
    const gymEl = document.createElement('div');
    gymEl.className = 'custom-map-pin-marker gym-marker';
    gymEl.innerHTML = `
      <img src="assets/map-pin.svg" class="gym-marker-img" width="32" height="32" alt="Gym Location" />
    `;
    this.smallMapGymMarker = new maplibregl.Marker({
      element: gymEl,
    })
      .setLngLat([gymLng, gymLat])
      .addTo(this.smallMap);

    // Add dashed black outline line from user to gym
    try {
      if (this.smallMap.getSource('user-gym-line')) {
        if (this.smallMap.getLayer('user-gym-line-outline-layer')) this.smallMap.removeLayer('user-gym-line-outline-layer');
        if (this.smallMap.getLayer('user-gym-line-layer')) this.smallMap.removeLayer('user-gym-line-layer');
        this.smallMap.removeSource('user-gym-line');
      }
    } catch (e) {}
    this.smallMap.addSource('user-gym-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [this.userLocation.lng, this.userLocation.lat],
            [gymLng, gymLat]
          ]
        }
      }
    });
    // Black outline (thicker)
    this.smallMap.addLayer({
      id: 'user-gym-line-outline-layer',
      type: 'line',
      source: 'user-gym-line',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#222',
        'line-width': 6,
        'line-dasharray': [2, 2]
      }
    });
    // Yellow line (on top)
    this.smallMap.addLayer({
      id: 'user-gym-line-layer',
      type: 'line',
      source: 'user-gym-line',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#ffd600',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });

    // Calculate the distance between user and gym
    const latDiff = Math.abs(this.userLocation.lat - gymLat);
    const lngDiff = Math.abs(this.userLocation.lng - gymLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // If points are very close (same location), use a fixed zoom and offset center downward
    if (distance < 0.001) {
      // Offset center downward by a small amount to avoid overlay
      this.smallMap.setCenter([this.userLocation.lng, this.userLocation.lat - 0.001]);
      this.smallMap.setZoom(15);
      return;
    }

    // Calculate bounds to include both points with proper padding
    const bounds = new maplibregl.LngLatBounds()
      .extend([this.userLocation.lng, this.userLocation.lat])
      .extend([gymLng, gymLat]);

    // Add padding with extra top padding to ensure markers are visible below overlay
    this.smallMap.fitBounds(bounds, {
      padding: { top: 70, bottom: 30, left: 30, right: 30 },
      maxZoom: 16,
      minZoom: 10,
      duration: 500 // Smooth animation
    });
  }

  private updateSmallMapWithCoordinates(gymLat: number, gymLng: number) {
    if (!this.smallMap || !this.userLocation) {
      return;
    }

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      return;
    }

    // Add user marker (custom SVG)
    const userEl = document.createElement('div');
    userEl.className = 'custom-map-pin-marker user-location-marker';
    userEl.innerHTML = `
      <img src="assets/user-pin.svg" class="user-marker-img" width="32" height="32" alt="User Location" />
    `;
    this.smallMapUserMarker = new maplibregl.Marker({
      element: userEl,
    })
      .setLngLat([this.userLocation.lng, this.userLocation.lat])
      .addTo(this.smallMap);

    // Add gym marker (custom SVG)
    const gymEl = document.createElement('div');
    gymEl.className = 'custom-map-pin-marker gym-marker';
    gymEl.innerHTML = `
      <img src="assets/map-pin.svg" class="gym-marker-img" width="32" height="32" alt="Gym Location" />
    `;
    this.smallMapGymMarker = new maplibregl.Marker({
      element: gymEl,
    })
      .setLngLat([gymLng, gymLat])
      .addTo(this.smallMap);

    // Add dashed black outline line from user to gym
    try {
      if (this.smallMap.getSource('user-gym-line')) {
        if (this.smallMap.getLayer('user-gym-line-outline-layer')) this.smallMap.removeLayer('user-gym-line-outline-layer');
        if (this.smallMap.getLayer('user-gym-line-layer')) this.smallMap.removeLayer('user-gym-line-layer');
        this.smallMap.removeSource('user-gym-line');
      }
    } catch (e) {}
    this.smallMap.addSource('user-gym-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [this.userLocation.lng, this.userLocation.lat],
            [gymLng, gymLat]
          ]
        }
      }
    });
    // Black outline (thicker)
    this.smallMap.addLayer({
      id: 'user-gym-line-outline-layer',
      type: 'line',
      source: 'user-gym-line',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#222',
        'line-width': 6,
        'line-dasharray': [2, 2]
      }
    });
    // Yellow line (on top)
    this.smallMap.addLayer({
      id: 'user-gym-line-layer',
      type: 'line',
      source: 'user-gym-line',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': '#ffd600',
        'line-width': 3,
        'line-dasharray': [2, 2]
      }
    });

    // Calculate the distance between user and gym
    const latDiff = Math.abs(this.userLocation.lat - gymLat);
    const lngDiff = Math.abs(this.userLocation.lng - gymLng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // If points are very close (same location), use a fixed zoom and offset center downward
    if (distance < 0.001) {
      // Offset center downward by a small amount to avoid overlay
      this.smallMap.setCenter([this.userLocation.lng, this.userLocation.lat - 0.001]);
      this.smallMap.setZoom(15);
      return;
    }

    // Calculate bounds to include both points with proper padding
    const bounds = new maplibregl.LngLatBounds()
      .extend([this.userLocation.lng, this.userLocation.lat])
      .extend([gymLng, gymLat]);

    // Add padding with extra top padding to ensure markers are visible below overlay
    this.smallMap.fitBounds(bounds, {
      padding: { top: 70, bottom: 30, left: 30, right: 30 },
      maxZoom: 16,
      minZoom: 10,
      duration: 500 // Smooth animation
    });
  }

  goToProfile() {
    this.router.navigate(['/coach/coach-profile']);
  }
}

export default CoachExplorePage;
