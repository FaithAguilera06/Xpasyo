import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule, KeyValuePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';

import {
  GymService,
  Gym,
  Schedule as GymServiceSchedule,
} from '../../../services/gym.service';
import { ApplyModalComponent } from './apply-modal/apply-modal.component';
import { Database, ref, get } from '@angular/fire/database';

// Class schedule interfaces
interface ClassItem {
  time: string;
  className: string;
  day?: string;
  classes?: ClassItem[];
  createdAt?: number;
  updatedAt?: number;
}

interface ScheduleDay {
  isOpen: boolean;
  open?: string;
  close?: string;
  classes?: ClassItem[];
}

type DaySchedule = ClassItem[] | ScheduleDay | ClassItem;

interface GymSchedule {
  [key: string]: ClassItem | ScheduleDay;
}

// Type guard for ScheduleDay
function isScheduleDay(schedule: any): schedule is ScheduleDay {
  return schedule && typeof schedule === 'object' && 'isOpen' in schedule;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface GymInfo {
  name: string;
  // Address has been moved to root level as gym_address
  district: string;
  businessHours: string;
  description?: string;
  gym_description?: string;
  schedule?: GymServiceSchedule | GymSchedule;
  fitnessType?: string;
  classTypes?: any[];
  status?: string;
  image?: string;
  paymentInfo?: {
    gcashAccountNumber?: string;
  };
}

interface GymDetail {
  id: string;
  gymInfo: Omit<GymInfo, 'address'>; // Address is now at root level
  gym_address?: string; // New root level address field
  coordinates?: Coordinates;
  gym_logo?: {
    data?: string;
  };
  gym_description?: string;
  schedule?: GymServiceSchedule | GymSchedule;
  [key: string]: any;
}

@Component({
  selector: 'app-coach-gym-detail',
  templateUrl: './coach-gym-detail.page.html',
  styleUrls: ['./coach-gym-detail.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    RouterModule,
    LucideIconsModule
  ],
})
export class CoachGymDetailPage implements OnInit, OnDestroy {
  // Application state
  currentUser: any = null;
  // Removed map-related variables
  private defaultLat = 14.5995; // Default to Manila coordinates
  private defaultLng = 120.9842;
  private defaultZoom = 15;
  private marker: any = null;
  // Removed @ViewChild('mapContainer')

  // Component properties with explicit types
  gym: GymDetail | null = null;
  isLoading = true;
  isNavigating = false;
  currentDay: string;
  // Define days as a readonly array of string literals for type safety
  readonly daysOfWeek = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  // onImageError is defined later in the file

  // Helper method to safely get day name
  private getDayName(day: string): string {
    return (this.daysOfWeek as readonly string[]).includes(day)
      ? day
      : 'monday';
  }

  // Helper method to check if schedule is an array of classes
  isScheduleArray(schedule: any): boolean {
    return (
      Array.isArray(schedule) &&
      schedule.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          'className' in item &&
          'time' in item
      )
    );
  }

  // Get schedule as array of classes (robust, matches client page)
  getScheduleArray(): ClassItem[] {
    if (!this.gym?.gymInfo?.schedule) return [];

    const schedule = this.gym.gymInfo.schedule;
    const result: ClassItem[] = [];

    // Handle different schedule formats
    if (Array.isArray(schedule)) {
      schedule.forEach((item) => {
        if (item && item.className && item.time) {
          result.push({
            className: item.className,
            time: item.time,
            day: item.day || '',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          });
        }
      });
    } else if (typeof schedule === 'object') {
      Object.entries(schedule).forEach(([day, daySchedule]) => {
        if (Array.isArray(daySchedule)) {
          daySchedule.forEach((item) => {
            if (item && item.className && item.time) {
              result.push({
                className: item.className,
                time: item.time,
                day: item.day || day,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              });
            }
          });
        } else if (daySchedule && typeof daySchedule === 'object') {
          const item = daySchedule as any;
          if (item.className && item.time) {
            result.push({
              className: item.className,
              time: item.time,
              day: item.day || day,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            });
          }
        }
      });
    }
    return result;
  }

  // Get schedule grouped by day (matches client page)
  getScheduleByDay() {
    if (!this.gym?.gymInfo?.schedule) return {};

    const schedule = this.gym.gymInfo.schedule as any;
    const scheduleByDay: { [day: string]: any[] } = {};

    // Process each class in the schedule
    Object.values(schedule).forEach((classItem: any) => {
      if (!classItem || !classItem.day) return;

      const day = classItem.day.toLowerCase();
      if (!scheduleByDay[day]) {
        scheduleByDay[day] = [];
      }
      scheduleByDay[day].push({
        name: classItem.className,
        time: classItem.time,
      });
    });

    // Sort days in order
    const orderedDays: { [day: string]: any[] } = {};
    this.daysOfWeek.forEach((day) => {
      if (scheduleByDay[day]) {
        orderedDays[day] = scheduleByDay[day];
      }
    });

    return orderedDays;
  }

  // Check if there are any classes scheduled
  hasClasses(): boolean {
    return this.getScheduleArray().length > 0;
  }

  // Slide options for the image carousel
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    spaceBetween: 10,
    slidesPerView: 1.2,
    centeredSlides: true,
    autoplay: {
      delay: 3000,
    },
    loop: true,
  };

  private database = inject(Database);
  private auth = inject(Auth);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private gymService: GymService
  ) {
    const today = new Date().getDay();
    this.currentDay = this.daysOfWeek[today] || 'monday';
  }

  async ngOnInit() {
    // Get current user
    authState(this.auth).subscribe((user) => {
      this.currentUser = user;
    });
    // Always get the gym ID from route params
    const gymId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('gymId');
    if (!gymId) {
      this.goBack();
      return;
    }
    // Always fetch the gym details by ID, regardless of navigation state
    await this.loadGymDetails(gymId);
  }

  ngOnDestroy() {
    try {
      // Clean up the marker
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
    } catch (error) {
      console.error('Error cleaning up marker:', error);
    }
  }

  /**
   * Verifies if the geocoding result matches the expected location
   * @param result The geocoding result from Nominatim
   * @param originalAddress The original address that was searched for
   * @returns boolean indicating if the result is a good match
   */
  private verifyLocationMatch(result: any, originalAddress: string): boolean {
    if (!result || !result.address) return false;

    const address = result.address;
    const searchTerms = originalAddress
      .split(/[\s,]+/)
      .filter((term: string) => term.length > 2)
      .map((term: string) => term.toLowerCase());

    // Check if any of the important address components match
    const componentsToCheck = [
      address.road,
      address.city_district,
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.county,
      address.state,
      address.country,
    ]
      .filter(Boolean)
      .map((c: any) => String(c).toLowerCase());

    // Count how many search terms appear in the address components
    const matchCount = searchTerms.reduce((count: number, term: string) => {
      return (
        count +
        (componentsToCheck.some((comp: string) => comp.includes(term)) ? 1 : 0)
      );
    }, 0);

    // Consider it a match if at least half of the search terms are found
    const matchThreshold = Math.max(1, searchTerms.length / 2);
    const isGoodMatch = matchCount >= matchThreshold;

    console.log('Location match verification:', {
      originalAddress,
      foundAddress: result.display_name,
      searchTerms,
      componentsToCheck,
      matchCount,
      matchThreshold,
      isGoodMatch,
    });

    return isGoodMatch;
  }

  // Coordinates for Malabon City, Philippines
  private readonly malabonCoords = {
    lat: 14.6673,
    lng: 120.9605,
  };

  private async geocodeAddress(
    query: string,
    countryCode: string = 'ph'
  ): Promise<{ lat: number; lng: number; display_name: string } | null> {
    if (!query) return null;

    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&countrycodes=${countryCode}&limit=1&email=contact@xpasyo.com`;

      const response = await fetch(
        proxyUrl + encodeURIComponent(nominatimUrl),
        {
          headers: {
            'User-Agent':
              'XpasyoApp/1.0 (contact@xpasyo.com; https://xpasyo.com)',
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://xpasyo.com',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  async loadGymDetails(gymId: string) {
    try {
      // Fetch only the gym you need
      const foundGym = await this.gymService.getGymById(gymId);

      if (foundGym) {
        this.gym = foundGym;
        this.isLoading = false;
      } else {
        console.error('Gym not found with ID:', gymId);
        this.goBack();
      }
    } catch (error) {
      console.error('Error loading gym details:', error);
      this.goBack();
    }
  }

  /**
   * Check if the schedule is in the class format (array of classes)
   * @param schedule - The schedule to check
   * @returns True if the schedule is in class format
   */
  private isClassSchedule(schedule: unknown): schedule is GymSchedule {
    if (!schedule || typeof schedule !== 'object') return false;

    const values = Object.values(schedule);
    if (values.length === 0) return false;

    const firstDay = values[0];
    if (!Array.isArray(firstDay)) return false;

    return firstDay.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        'time' in item &&
        'className' in item
    );
  }

  /**
   * Check if there are any classes scheduled
   * @returns True if there are any classes scheduled
   */
  hasClassSchedule(): boolean {
    try {
      const schedule = this.gym?.gymInfo?.schedule;
      if (!schedule) return false;

      return Object.values(schedule).some((daySchedule) => {
        if (!daySchedule) return false;

        // Handle array of classes
        if (Array.isArray(daySchedule)) {
          return daySchedule.length > 0;
        }

        // Handle ScheduleDay format
        if (isScheduleDay(daySchedule)) {
          return (
            daySchedule.isOpen &&
            typeof daySchedule.open === 'string' &&
            typeof daySchedule.close === 'string'
          );
        }

        return false;
      });
    } catch (error) {
      console.error('Error checking class schedule:', error);
      return false;
    }
  }

  /**
   * Check if there are any classes scheduled across all days
   * @returns True if any day has scheduled classes
   */
  hasAnyClasses(): boolean {
    try {
      if (!this.gym?.gymInfo?.schedule) return false;

      const schedule = this.gym.gymInfo.schedule;

      // Check if schedule is an array
      if (Array.isArray(schedule)) {
        return (
          schedule.length > 0 &&
          schedule.some((item) => item && item.className && item.time)
        );
      }

      // Check if schedule is an object with days
      if (typeof schedule === 'object') {
        return Object.values(schedule).some((daySchedule) => {
          if (!daySchedule) return false;
          if (Array.isArray(daySchedule)) {
            return (
              daySchedule.length > 0 &&
              daySchedule.some((item) => item && item.className && item.time)
            );
          }
          return daySchedule.className && daySchedule.time;
        });
      }

      return false;
    } catch (error) {
      console.error('Error checking for any classes:', error);
      return false;
    }
  }

  /**
   * Get classes for a specific day
   * @param day - The day of the week in lowercase (e.g., 'monday', 'tuesday')
   * @returns Array of class items with time, className, and day
   */
  getClassesForDay(
    day: string
  ): Array<{ time: string; className: string; day: string }> {
    try {
      if (!this.gym?.gymInfo?.schedule) return [];

      const schedule = this.gym.gymInfo.schedule;
      const result: Array<{ time: string; className: string; day: string }> =
        [];

      // If schedule is an array, return all items
      if (Array.isArray(schedule)) {
        schedule.forEach((item) => {
          if (item && item.className && item.time) {
            result.push({
              time: item.time,
              className: item.className,
              day: item.day || day,
            });
          }
        });
        return result;
      }

      // If schedule is an object with days
      if (typeof schedule === 'object') {
        const daySchedule = (schedule as any)[day.toLowerCase()];
        if (!daySchedule) return [];

        if (Array.isArray(daySchedule)) {
          daySchedule.forEach((item) => {
            if (item && item.className && item.time) {
              result.push({
                time: item.time,
                className: item.className,
                day: item.day || day,
              });
            }
          });
        } else if (daySchedule.className && daySchedule.time) {
          result.push({
            time: daySchedule.time,
            className: daySchedule.className,
            day: daySchedule.day || day,
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting classes for day:', error);
      return [];
    }
  }

  /**
   * Navigate to the next day in the week
   */
  nextDay(): void {
    const currentIndex = (this.daysOfWeek as readonly string[]).indexOf(
      this.currentDay
    );
    const nextIndex = (currentIndex + 1) % this.daysOfWeek.length;
    this.currentDay =
      (this.daysOfWeek as readonly string[])[nextIndex] || 'monday';
  }

  /**
   * Navigate to the previous day in the week
   */
  previousDay(): void {
    const currentIndex = (this.daysOfWeek as readonly string[]).indexOf(
      this.currentDay
    );
    const prevIndex =
      (currentIndex - 1 + this.daysOfWeek.length) % this.daysOfWeek.length;
    this.currentDay =
      (this.daysOfWeek as readonly string[])[prevIndex] || 'monday';
  }

  updateGymData(propertyData: Partial<GymDetail>): void {
    if (!propertyData || !this.gym) return;

    // Update gym data with new property data
    this.gym = {
      ...this.gym,
      ...propertyData,
      gymInfo: {
        ...this.gym.gymInfo,
        ...(propertyData.gymInfo || {}),
      },
    };
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/default-gym.png';
    }
  }

  // Always navigate back to coach's home page
  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/coach/coach-home']);
    }
  }

  showSafetyGuidelines(): void {
    // Implement safety guidelines modal
    console.log('Show safety guidelines');
  }

  /**
   * Get abbreviated day name for better visual appeal
   * @param day - The full day name
   * @returns Abbreviated day name
   */
  getAbbreviatedDay(day: string): string {
    if (!day || typeof day !== 'string') return 'Day';
    
    const dayLower = day.toLowerCase().trim();
    const abbreviations: { [key: string]: string } = {
      'monday': 'Mon',
      'tuesday': 'Tue', 
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun'
    };
    
    return abbreviations[dayLower] || (day.length >= 3 ? day.substring(0, 3) : day);
  }

  // Application methods
  async openApplyModal() {
    if (!this.currentUser) {
      this.showLoginAlert();
      return;
    }

    if (!this.gym?.id) {
      console.error('No gym selected or gym data not loaded');
      return;
    }

    try {
      // Get the latest gym data using the gym service
      const gym = await this.gymService.getGymById(this.gym.id);

      if (!gym) {
        console.error('Gym not found');
        return;
      }

      const gymClassTypes = gym?.gymInfo?.classTypes || [];
      const scheduleArray = this.getScheduleArray();

      // Get GCash account number from gym data
      const gcashAccountNumber = (gym as any)?.gymInfo?.paymentInfo?.gcashAccountNumber || '';
      
      // Get GCash account name from gym data
      const gcashAccountName = (gym as any)?.gymInfo?.paymentInfo?.gcashAccountName || 
                               (gym as any)?.gymInfo?.paymentInfo?.accountName ||
                               (gym as any)?.gymInfo?.paymentInfo?.gcashName ||
                               (gym as any)?.gymInfo?.paymentInfo?.ownerName ||
                               (gym as any)?.gymInfo?.paymentInfo?.name ||
                               (gym as any)?.ownerName ||
                               (gym as any)?.owner_name ||
                               (gym as any)?.gymInfo?.ownerName ||
                               (gym as any)?.gymInfo?.owner_name ||
                               (gym as any)?.gymInfo?.name ||
                               '';

      // Calculate min and max venue fees from class types
      let minVenueFee = 0;
      let maxVenueFee = 1000; // Default max fee

      if (gymClassTypes && Object.keys(gymClassTypes).length > 0) {
        // Get all min and max prices from class types
        const prices = Object.values(gymClassTypes).reduce(
          (acc: number[], ct: any) => {
            if (ct?.min_price !== undefined) acc.push(ct.min_price);
            if (ct?.max_price !== undefined) acc.push(ct.max_price);
            return acc;
          },
          [] as number[]
        );

        if (prices.length > 0) {
          minVenueFee = Math.min(...prices);
          maxVenueFee = Math.max(...prices);
        }
      }

      const modal = await this.modalCtrl.create({
        component: ApplyModalComponent,
        componentProps: {
          gymName: this.gym.gymInfo.name,
          gymId: this.gym.id,
          schedule: scheduleArray,
          classTypes: gymClassTypes,
          minVenueFee: minVenueFee,
          maxVenueFee: maxVenueFee,
          gcashAccountNumber: gcashAccountNumber, // Pass GCash account number
          gcashAccountName: gcashAccountName, // Pass GCash account name
        },
        cssClass: 'apply-modal',
      });

      await modal.present();

      const { data } = await modal.onWillDismiss();
      if (data === 'success') {
        this.showSuccessAlert();
      } else if (data === 'error') {
        this.showErrorAlert();
      }
    } catch (error) {
      console.error('Error opening apply modal:', error);
      this.showErrorAlert();
    }
  }

  private async showSuccessAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Application Submitted',
      message:
        'Your application has been submitted successfully! The gym will review your application and get back to you soon.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showErrorAlert(message: string = 'Failed to submit application. Please try again later.') {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showLoginAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Login Required',
      message: 'You need to be logged in to apply as a coach.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Login',
          handler: () => {
            this.router.navigate(['/login']);
          },
        },
      ],
    });
    await alert.present();
  }

  // Add description toggle logic (copied from client page)
  showFullDescription = false;

  get descriptionText(): string {
    return (
      this.gym?.['description'] ||
      this.gym?.gym_description ||
      this.gym?.gymInfo?.gym_description ||
      ''
    );
  }

  get truncatedDescription(): string {
    const desc = this.descriptionText;
    return desc.length > 150 ? desc.slice(0, 150) + '...' : desc;
  }

  get hasLongDescription(): boolean {
    return this.descriptionText.length > 150;
  }

  toggleDescription() {
    this.showFullDescription = !this.showFullDescription;
  }

  // Navigate to session booking with gym data
  async navigateToSessionBooking() {
    if (!this.gym?.id) {
      console.error('No gym data available');
      this.showErrorAlert('Gym data not available. Please try again.');
      return;
    }

    this.isNavigating = true;

    try {
      // Pre-process data for faster loading
      const processedSchedule = this.getScheduleArray();
      const processedClassTypes = (this.gym.gymInfo?.classTypes || []).map((ct: any) => ({
        name: ct.name,
        min_price: ct.min_price,
        max_price: ct.max_price,
        price_range: ct.price_range,
        price_display: ct.price_display
      }));

      // Prepare optimized data structure
      const sessionBookingData = {
        gymId: this.gym.id,
        gymName: this.gym.gymInfo?.name || '',
        gymAddress: this.gym.gym_address || '',
        gymImage: this.gym.gymInfo?.image || '',
        schedule: processedSchedule,
        classTypes: processedClassTypes,
        paymentInfo: this.gym.gymInfo?.paymentInfo || {},
        businessHours: this.gym.gymInfo?.businessHours || '',
        description: this.gym.gymInfo?.description || this.gym.gym_description || '',
        // Pre-calculate venue fee ranges
        minVenueFee: Math.min(...processedClassTypes.map(ct => ct.min_price || 0)),
        maxVenueFee: Math.max(...processedClassTypes.map(ct => ct.max_price || 1000))
      };

      // Navigate with pre-processed data
      await this.router.navigate(['/coach/gym', this.gym.id, 'session-booking'], {
        state: { gymData: sessionBookingData }
      });
    } catch (error) {
      console.error('Error navigating to session booking:', error);
      this.showErrorAlert('Failed to open session booking. Please try again.');
    } finally {
      this.isNavigating = false;
    }
  }
}
