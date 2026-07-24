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
import {
  AlertController,
  ModalController,
  IonicModule,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import { CommonModule, KeyValuePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { firstValueFrom } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';

import {
  GymService,
  Gym,
  Schedule as GymServiceSchedule,
} from '../../../../services/gym.service';
import { Database, ref, get } from '@angular/fire/database';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { doc as firestoreDoc } from 'firebase/firestore';
import { NotificationService } from 'src/app/services/notification.service';

// Add type for class type with min and max price
interface ClassTypeWithPrice {
  min_price?: number;
  max_price?: number;
  [key: string]: any;
}

interface ClassItem {
  time: string;
  className: string;
  day?: string;
}

interface ClassType {
  name: string;
  min_price: number;
  max_price: number;
  price_range?: string;
  price_display?: string;
}

type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

@Component({
  selector: 'app-session-booking',
  templateUrl: './session-booking.page.html',
  styleUrls: ['./session-booking.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    RouterModule,
    LucideIconsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
  ],
  providers: [NotificationService],
})
export class SessionBookingPage implements OnInit, OnDestroy {
  @ViewChild('termsContent', { static: false }) termsContent!: ElementRef;

  // Venue fee range for selected class
  minVenueFee: number = 0;
  maxVenueFee: number = 1000;
  selectedClassType: ClassType | null = null;
  isLoading = true; // Add missing isLoading property
  gym: any = null;

  bookingData = {
    selectedClassOption: '', // Add this line
    className: '',
    day: '',
    time: '',
    date: '',
    fee: null as number | null,
    maxStudents: null as number | null,
    venueFee: 500, // Default value
  };

  private readonly daysOfWeek: readonly DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  // Days of week with proper display names
  readonly dayDisplayNames: Record<DayOfWeek, string> = {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  };

  gymName: string = '';
  gymId: string = '';
  gcashAccountNumber: string = '';
  gcashAccountName: string = '';
  // Remove gcashAccountName since it doesn't exist in the interface
  currentUser: any = null;
  isSubmitting = false;

  // Private properties with getters/setters
  private _schedule: ClassItem[] = [];
  private _classTypes: ClassType[] = [];
  private _cachedClassOptions:
    | { name: string; day: string; time: string }[]
    | null = null;
  private _cachedVenueFee: { [key: string]: number } = {};
  private _lastClassTypesUpdate: number = 0;
  private _lastScheduleUpdate: number = 0;

  // Getters and setters
  get schedule(): ClassItem[] {
    return this._schedule;
  }

  set schedule(value: ClassItem[]) {
    this._schedule = value || [];
    this._cachedClassOptions = null; // Invalidate cache
  }

  get classTypes(): ClassType[] {
    return this._classTypes;
  }

  set classTypes(value: ClassType[]) {
    this._classTypes = value || [];
    this._lastClassTypesUpdate = Date.now();
    this._cachedVenueFee = {}; // Invalidate cache
  }

  // Get unique class names from schedule with day and time
  get classOptions(): { name: string; day: string; time: string }[] {
    // Return cached result if available (cache for 1 second)
    if (
      this._cachedClassOptions &&
      this._lastScheduleUpdate > Date.now() - 1000
    ) {
      return this._cachedClassOptions;
    }

    const uniqueClasses = new Map<
      string,
      { name: string; day: string; time: string }
    >();
    const schedule = this._schedule;

    // Process schedule in a single pass
    for (let i = 0; i < schedule.length; i++) {
      const classItem = schedule[i];
      if (classItem && classItem.className && classItem.day && classItem.time) {
        const dayLower = classItem.day.toLowerCase() as DayOfWeek;
        const key = `${classItem.className}|${dayLower}|${classItem.time}`;

        if (!uniqueClasses.has(key)) {
          uniqueClasses.set(key, {
            name: classItem.className,
            day: dayLower,
            time: classItem.time,
          });
        }
      }
    }

    // Convert to array and sort
    const result = Array.from(uniqueClasses.values()).sort((a, b) => {
      // Sort by day of week first
      const dayCompare =
        this.daysOfWeek.indexOf(a.day as DayOfWeek) -
        this.daysOfWeek.indexOf(b.day as DayOfWeek);
      return dayCompare !== 0
        ? dayCompare
        : (a.time || '').localeCompare(b.time || '');
    });

    // Update cache
    this._cachedClassOptions = result;
    this._lastScheduleUpdate = Date.now();

    return result;
  }

  // Date picker options
  private readonly today = new Date();
  minDate: string = new Date(
    this.today.getFullYear(),
    this.today.getMonth(),
    this.today.getDate() + 1 // Start from tomorrow
  )
    .toISOString()
    .split('T')[0];
  maxDate: string = new Date(
    this.today.getFullYear() + 1,
    this.today.getMonth(),
    this.today.getDate()
  )
    .toISOString()
    .split('T')[0];

  selectedDate: string = '';
  showDatePicker = false; // Control calendar visibility

  private readonly dayMap: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  isDateEnabled = (dateString: string): boolean => {
    if (!this.bookingData.day) return false;

    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const selectedDayNumber =
      this.dayMap[this.bookingData.day.toLowerCase() as DayOfWeek];

    // Check if it's the correct day of week AND not today
    const isCorrectDay = dayOfWeek === selectedDayNumber;
    const isNotToday = date.toDateString() !== this.today.toDateString();

    return isCorrectDay && isNotToday;
  };

  dateFilter = (date: Date | null): boolean => {
    if (!date || !this.bookingData.day) return false;
    const dayOfWeek = date.getDay();
    const targetDay =
      this.dayMap[this.bookingData.day.toLowerCase() as DayOfWeek];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Remove time part
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    const dateString = candidate.toISOString().split('T')[0];
    if (this.bookedDates.includes(dateString)) return false;
    // Only allow if date is today or in the future and matches the required day
    return dayOfWeek === targetDay && candidate >= today;
  };

  dateClass = (date: Date): string => {
    const dateString = date.toISOString().split('T')[0];
    if (this.bookedDates.includes(dateString)) {
      return 'blocked-date';
    }
    return '';
  };

  getDayValues(): number[] | undefined {
    if (!this.bookingData.day) return undefined;
    return [this.dayMap[this.bookingData.day.toLowerCase() as DayOfWeek]];
  }

  async onDateSelected(event: any) {
    const selectedDate = event.detail.value;
    if (selectedDate) {
      this.bookingData.date = selectedDate;
      this.showDatePicker = false; // Close the calendar after selection
      console.log('Selected date:', selectedDate);
    }
  }

  formatVenueFee(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  }

  getAvailableDates(): string[] {
    const dates: string[] = [];
    if (!this.bookingData.day) return dates;
    const today = new Date();
    let date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    const targetDay =
      this.dayMap[this.bookingData.day.toLowerCase() as DayOfWeek];
    while (dates.length < 10) {
      if (date.getDay() === targetDay) {
        dates.push(date.toISOString().split('T')[0]);
      }
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }

  // Dependency injection
  private database = inject(Database);
  private auth = inject(Auth);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private gymService: GymService,
    private firestore: Firestore,
    private notificationService: NotificationService
  ) {
    // Initialize component
  }

  async ngOnInit() {
    // Parallel initialization for faster loading
    const initPromises = [];

    // Get current user (non-blocking)
    const userPromise = firstValueFrom(authState(this.auth)).catch((error) => {
      console.error('Error getting current user:', error);
      return null;
    });
    initPromises.push(userPromise);

    // Get navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { gymData: any } | undefined;

    if (state?.gymData) {
      // Use pre-processed data from gym details page
      this.gym = state.gymData;
      this.gymId = state.gymData.gymId;
      this.gymName = state.gymData.gymName;
      this.gcashAccountNumber =
        state.gymData.paymentInfo?.gcashAccountNumber || '';
      this.gcashAccountName =
        state.gymData.paymentInfo?.gcashAccountName ||
        state.gymData.paymentInfo?.accountName ||
        state.gymData.paymentInfo?.gcashName ||
        state.gymData.paymentInfo?.ownerName ||
        state.gymData.paymentInfo?.name ||
        state.gymData.gymName ||
        '';

      // Use pre-processed class types and schedule
      this.classTypes = state.gymData.classTypes || [];
      this.schedule = state.gymData.schedule || [];

      // Set venue fee ranges if provided
      if (state.gymData.minVenueFee !== undefined) {
        this.minVenueFee = state.gymData.minVenueFee;
      }
      if (state.gymData.maxVenueFee !== undefined) {
        this.maxVenueFee = state.gymData.maxVenueFee;
      }

      // Mark as loaded immediately since data is pre-processed
      this.isLoading = false;
    } else {
      // Fallback: Load data from route parameters
      const gymId =
        this.route.snapshot.paramMap.get('gymId') ||
        this.route.snapshot.paramMap.get('id');
      if (gymId) {
        this.gymId = gymId;
        const loadDataPromise = this.loadGymData();
        initPromises.push(loadDataPromise);
      } else {
        this.goBack();
        return;
      }
    }

    // Wait for all initialization to complete
    try {
      const [user] = await Promise.all(initPromises);
      this.currentUser = user;
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  ngOnDestroy() {
    // Cleanup logic
  }

  private async loadGymData() {
    try {
      // Load gym details
      const gym = await this.gymService.getGymById(this.gymId);
      if (gym) {
        this.gymName = gym.gymInfo?.name || '';
        this.gcashAccountNumber =
          gym.gymInfo?.paymentInfo?.gcashAccountNumber || '';
        // Fallback logic for account name:
        const paymentInfo = (gym.gymInfo?.paymentInfo as any) || {};
        this.gcashAccountName =
          paymentInfo.gcashAccountName ||
          paymentInfo.accountName ||
          paymentInfo.gcashName ||
          paymentInfo.ownerName ||
          paymentInfo.name ||
          gym.gymInfo?.name ||
          '';
        // Remove gcashAccountName assignment

        // Load class types and schedule
        await this.loadGymClassTypes();
      }
    } catch (error) {
      console.error('Error loading gym data:', error);
    }
  }

  private async loadGymClassTypes() {
    try {
      const gym = await this.gymService.getGymById(this.gymId);
      if (gym) {
        // Extract class types from gym data and map to local interface
        this.classTypes = (gym.gymInfo?.classTypes || []).map((ct) => ({
          name: ct.name,
          min_price: ct.min_price,
          max_price: ct.max_price,
          price_range: ct.price_range,
          price_display: ct.price_display,
        }));

        // Extract schedule from gym data
        const schedule = gym.gymInfo?.schedule;
        if (schedule) {
          this.schedule = this.processSchedule(schedule);
        }
      }
    } catch (error) {
      console.error('Error loading class types:', error);
    }
  }

  private processSchedule(schedule: any): ClassItem[] {
    const result: ClassItem[] = [];

    if (Array.isArray(schedule)) {
      schedule.forEach((item) => {
        if (item && item.className && item.time) {
          result.push({
            className: item.className,
            time: item.time,
            day: item.day || '',
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
            });
          }
        }
      });
    }

    return result;
  }

  async fetchBookedDates() {
    if (
      !this.gymId ||
      !this.bookingData.className ||
      !this.bookingData.day ||
      !this.bookingData.time
    ) {
      this.bookedDates = [];
      return;
    }
    const applicationsRef = collection(this.firestore, 'coachApplications');
    const q = query(
      applicationsRef,
      where('gymId', '==', this.gymId),
      where('className', '==', this.bookingData.className),
      where('day', '==', this.bookingData.day),
      where('time', '==', this.bookingData.time),
      where('status', 'in', ['pending', 'approved'])
    );
    const snapshot = await getDocs(q);
    this.bookedDates = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return data['date'] ? data['date'].split('T')[0] : '';
      })
      .filter((date) => !!date);
  }

  onClassSelected(event: any) {
    let value = '';
    if (event && event.target) {
      value = (event.target as HTMLSelectElement).value || '';
    } else if (typeof event === 'string') {
      value = event;
    }
    this.bookingData.selectedClassOption = value;
    if (!value) {
      this.bookingData.className = '';
      this.bookingData.day = '';
      this.bookingData.time = '';
      this.bookingData.date = '';
      this.bookedDates = [];
      return;
    }
    const [name, day, time] = value.split('|');
    this.bookingData.className = name;
    this.bookingData.day = day;
    this.bookingData.time = time;
    this.bookingData.date = '';
    this.updateVenueFeeForClass(name);
    this.fetchBookedDates();
  }

  private updateVenueFeeForClass(className: string) {
    const classType = this.classTypes.find((ct) => ct.name === className);
    if (classType) {
      this.bookingData.venueFee = classType.min_price || 500;
      this.selectedClassType = classType;
    }
  }

  goBack() {
    this.location.back();
  }

  async submitBooking() {
    // Check if user is authenticated
    if (!this.currentUser) {
      await this.showErrorAlert(
        'You need to be logged in to submit an application.'
      );
      return;
    }

    // NEW: Check for any active session for this coach in this gym
    const applicationsRef = collection(this.firestore, 'coachApplications');
    const activeSessionQuery = query(
      applicationsRef,
      where('coachId', '==', this.currentUser.uid),
      where('gymId', '==', this.gymId),
      where('status', 'in', ['pending', 'approved'])
    );
    const activeSessionSnapshot = await getDocs(activeSessionQuery);
    if (!activeSessionSnapshot.empty) {
      await this.showErrorAlert(
        'You have an ongoing class session. Please complete or finalize the session before proceeding.'
      );
      return;
    }

    // Validate fields one by one for debugging
    if (!this.bookingData.selectedClassOption) {
      await this.showErrorAlert('Please select a class.');
      return;
    }
    // Safety check for bookingData.date
    let selectedDate: Date | null = null;
    if (typeof this.bookingData.date === 'string') {
      selectedDate = new Date(this.bookingData.date);
    } else if (
      Object.prototype.toString.call(this.bookingData.date) === '[object Date]'
    ) {
      selectedDate = this.bookingData.date as Date;
    }
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      await this.showErrorAlert('Please select a valid class date.');
      return;
    }
    if (!this.bookingData.maxStudents || this.bookingData.maxStudents < 1) {
      await this.showErrorAlert('Please enter a valid number of participants.');
      return;
    }
    const fee = Number(this.bookingData.fee);
    if (this.bookingData.fee === null || isNaN(fee)) {
      await this.showErrorAlert('Please enter a valid fee.');
      return;
    }
    if (!this.agreedToTerms) {
      await this.showErrorAlert('Please agree to the terms and conditions.');
      return;
    }
    if (this.isSubmitting) {
      await this.showErrorAlert('Submission is already in progress.');
      return;
    }
    // If all fields are valid, proceed as normal
    // Confirm submission
    const confirm = await this.alertCtrl.create({
      header: 'Submit Application',
      message: 'Are you sure you want to submit this application?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Submit',
          handler: async () => {
            await this.processApplication();
          },
        },
      ],
    });

    await confirm.present();
  }

  private async processApplication() {
    this.isSubmitting = true;

    try {
      // Show loading
      const loading = await this.loadingCtrl.create({
        message: 'Submitting application...',
        spinner: 'crescent',
        backdropDismiss: false,
      });
      await loading.present();

      // Process the application
      await this.processBooking();

      await loading.dismiss();
      await this.showSuccessAlert(
        'You have successfully joined the class. The gym owner has been notified.'
      );
      this.isBooked = true;
      setTimeout(() => {
        this.isBooked = false;
      }, 2000);
    } catch (error) {
      console.error('Error submitting application:', error);
      await this.showErrorAlert(
        'Failed to submit application. Please try again.'
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  private async processBooking() {
    // Double-check user authentication
    if (!this.currentUser) {
      try {
        this.currentUser = await firstValueFrom(authState(this.auth));
      } catch (error) {
        throw new Error('User not authenticated');
      }
    }
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }
    if (!this.gymId) {
      throw new Error('Gym ID not available');
    }
    // First check: Prevent the same coach from booking the same time slot
    const applicationsRef = collection(this.firestore, 'coachApplications');
    const dupeQuery = query(
      applicationsRef,
      where('coachId', '==', this.currentUser.uid),
      where('gymId', '==', this.gymId),
      where('day', '==', this.bookingData.day),
      where('time', '==', this.bookingData.time),
      where('status', 'in', ['pending', 'approved'])
    );
    const dupeSnapshot = await getDocs(dupeQuery);
    if (!dupeSnapshot.empty) {
      throw new Error(
        'You have already booked this gym schedule. Please wait for approval or choose another slot.'
      );
    }
    // Second check: Prevent any coach from booking a time slot that's already taken
    const conflictQuery = query(
      applicationsRef,
      where('gymId', '==', this.gymId),
      where('className', '==', this.bookingData.className),
      where('day', '==', this.bookingData.day),
      where('time', '==', this.bookingData.time),
      where('date', '==', this.bookingData.date),
      where('status', 'in', ['pending', 'approved'])
    );
    const conflictSnapshot = await getDocs(conflictQuery);
    if (!conflictSnapshot.empty) {
      throw new Error(
        'This time slot has already been booked. Please choose a different time or date.'
      );
    }
    // Get coach profile
    const userDoc = await getDoc(
      doc(this.firestore, 'users', this.currentUser.uid)
    );
    const userData = userDoc.data();
    const coachName = userData
      ? userData['name'] || this.currentUser.displayName || 'Unknown Coach'
      : 'Unknown Coach';
    // Format the date to store as local date string (YYYY-MM-DD format)
    let formattedDate: string | undefined;
    if (this.bookingData.date) {
      try {
        let dateString: string;
        const rawDate: any = this.bookingData.date;

        if (
          typeof rawDate === 'object' &&
          rawDate !== null &&
          typeof rawDate.toISOString === 'function'
        ) {
          // If it's a Date object, convert to local date string
          const localDate = new Date(
            rawDate.getTime() - rawDate.getTimezoneOffset() * 60000
          );
          formattedDate = localDate.toISOString().split('T')[0];
        } else {
          // If it's already a string, ensure it's in YYYY-MM-DD format
          dateString = String(rawDate);
          if (dateString.includes('T')) {
            // If it has time, extract just the date part
            const dateObj = new Date(dateString);
            const localDate = new Date(
              dateObj.getTime() - dateObj.getTimezoneOffset() * 60000
            );
            formattedDate = localDate.toISOString().split('T')[0];
          } else {
            // If it's already just a date string, use it as is
            formattedDate = dateString;
          }
        }

        // Validate the date format
        if (!formattedDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          throw new Error('Invalid date format');
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        throw new Error('Invalid date format');
      }
    }
    // Calculate total fee (venue fee only, exclude coach fee)
    const venueFee = Number(this.bookingData.venueFee || 0);
    const totalFee = venueFee;
    // Generate a unique session ID for this application
    const sessionId = doc(collection(this.firestore, 'sessions')).id;
    // Generate compositeKey for uniqueness
    const compositeKey = `${this.gymId}_${this.bookingData.className}_${this.bookingData.day}_${this.bookingData.time}`;
    // Create application data structure
    const application = {
      sessionId: sessionId,
      compositeKey: compositeKey,
      coachId: this.currentUser.uid,
      coachName: coachName,
      coachEmail: this.currentUser.email || '',
      gymId: this.gymId,
      gymName: this.gymName,
      className: this.bookingData.className,
      day: this.bookingData.day,
      time: this.bookingData.time,
      date: formattedDate,
      fee: totalFee,
      venueFee: venueFee,
      coachFee: Number(this.bookingData.fee || 0),
      maxStudents: Number(this.bookingData.maxStudents || 0),
      gcashAccountNumber: this.gcashAccountNumber,
      gcashAccountName: this.gcashAccountName,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // compositeKey is already included
    };
    await addDoc(collection(this.firestore, 'coachApplications'), application);
    // Get gym owner ID from gym document
    const gymRef = doc(this.firestore, 'gyms', this.gymId);
    const gymSnap = await getDoc(gymRef);
    const ownerId = gymSnap.exists()
      ? gymSnap.data()['ownerId'] || 'admin'
      : 'admin';
    // Create notification in Firestore for gym owner ONLY
    if (ownerId) {
      const gymBookingNotification = {
        type: 'booking',
        title: 'New Coach Joined',
        message: `Coach "${coachName}" has joined your class '${this.bookingData.className}' on ${this.bookingData.date} at ${this.bookingData.time}.`,
        userId: ownerId,
        data: {
          sessionId: sessionId,
          compositeKey: compositeKey,
          coachId: this.currentUser.uid,
          coachName: coachName,
          className: this.bookingData.className,
          day: this.bookingData.day,
          time: this.bookingData.time,
          date: formattedDate,
          gymId: this.gymId,
          gymName: this.gymName,
          status: 'approved',
          action: 'coach_joined',
        },
        status: 'unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(
        collection(this.firestore, 'notifications'),
        gymBookingNotification
      );
    }
    return sessionId;
  }

  private validateForm(): { valid: boolean; message?: string } {
    if (!this.bookingData.className) {
      return { valid: false, message: 'Please select a class' };
    }
    if (!this.bookingData.date) {
      return { valid: false, message: 'Please select a date' };
    }
    if (!this.bookingData.maxStudents || this.bookingData.maxStudents < 1) {
      return {
        valid: false,
        message: 'Please enter a valid number of participants',
      };
    }
    if (!this.bookingData.fee || this.bookingData.fee < 0) {
      return { valid: false, message: 'Please enter a valid fee' };
    }

    return { valid: true };
  }

  private async showSuccessAlert(message?: string) {
    const alert = await this.alertCtrl.create({
      header: 'Application Submitted',
      message:
        message ||
        'You have successfully joined the class. The gym owner has been notified. What would you like to do next?',
      buttons: [
        {
          text: 'View My Classes',
          handler: () => {
            // Navigate to coach class page
            this.navigateToClassDetail();
          },
        },
        {
          text: 'Back to Gym',
          handler: () => {
            // Go back to gym detail page
            this.goBack();
          },
        },
      ],
    });
    await alert.present();
  }

  private navigateToClassDetail() {
    if (this.gymId) {
      // Navigate to the coach class page for this gym
      this.router.navigate(['/coach/coach-class', this.gymId]);
    } else {
      // Fallback: go back to gym detail page
      this.goBack();
    }
  }

  private async showErrorAlert(
    message: string = 'An error occurred. Please try again.'
  ) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2500,
      position: 'bottom',
      color: 'danger',
      cssClass: 'simple-error-toast',
    });
    await toast.present();
  }

  // Placeholder method for future functionality
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default-gym.png';
  }

  isAccordionOpen = false;
  agreedToTerms = false;
  isBooked = false;
  coachName: string = '';
  bookedDates: string[] = [];

  toggleAccordion() {
    this.isAccordionOpen = !this.isAccordionOpen;
    // Do not reset agreedToTerms when closing the accordion
  }
}
