import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  ModalController,
  LoadingController,
  NavParams,
  AlertController,
} from '@ionic/angular';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { doc as firestoreDoc } from 'firebase/firestore';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
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
  type: string;
  min_price: number;
  max_price: number;
  price_range?: string;
  price_display?: string; // Added to fix TS error
  day?: string; // Add day property to ClassType
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
  selector: 'app-apply-modal',
  templateUrl: './apply-modal.component.html',
  styleUrls: ['./apply-modal.component.scss'],
  host: {
    class: 'apply-modal-host',
  },
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideIconsModule],
  providers: [NotificationService],
})
export class ApplyModalComponent implements OnInit {
  // Venue fee range for selected class
  minVenueFee: number = 0;
  maxVenueFee: number = 1000;
  selectedClassType: ClassType | null = null;

  applicationData = {
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
  gcashAccountNumber: string = ''; // Add GCash account number property
  gcashAccountName: string = ''; // Add GCash account name property
  currentUser: User | null = null;
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
      if (classItem.className && classItem.day && classItem.time) {
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
  minDate: string = this.today.toISOString().split('T')[0];
  maxDate: string = new Date(
    this.today.getFullYear() + 1,
    this.today.getMonth(),
    this.today.getDate()
  )
    .toISOString()
    .split('T')[0];
  selectedDate: string = '';

  // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
  private readonly dayMap: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Filter function for date picker to only allow selecting dates that match the selected class's day
  isDateEnabled = (dateString: string): boolean => {
    if (!this.applicationData.day) return false; // Don't allow any dates if no day is selected

    try {
      const date = new Date(dateString);
      const dayLower = this.applicationData.day.toLowerCase() as DayOfWeek;
      const selectedDay = this.dayMap[dayLower];

      // Check if the date is today or in the future and matches the selected day of week
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      // Only allow dates that match the selected day of week and are today or in the future
      return date.getDay() === selectedDay && selectedDate >= today;
    } catch (error) {
      console.error('Error checking if date is enabled:', error);
      return false;
    }
  };

  // Get day values for the date picker (0-6 for Sunday-Saturday)
  getDayValues(): number[] | undefined {
    if (!this.applicationData.day) return undefined;

    try {
      const dayLower = this.applicationData.day.toLowerCase() as DayOfWeek;
      if (!this.daysOfWeek.includes(dayLower)) return undefined;

      const selectedDay = this.dayMap[dayLower];
      // Return an array with just the selected day's number (0-6)
      // The datetime component will use this to show only this day as selectable
      return [selectedDay];
    } catch (error) {
      console.error('Error getting day values:', error);
      return undefined;
    }
  }

  // Handle date selection from the date picker
  async onDateSelected(event: any) {
    // Prevent the modal from closing when selecting a date
    event?.stopPropagation();

    if (event?.detail?.value) {
      this.applicationData.date = event.detail.value;

      // Close the date picker after selection
      const modal = await this.modalCtrl.getTop();
      if (modal) {
        await modal.dismiss();
      }
    }
  }

  // Format venue fee for display
  formatVenueFee(value: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  }

  constructor(
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private firestore: Firestore,
    private navParams: NavParams,
    private auth: Auth,
    private notificationService: NotificationService
  ) {
    this.gymName = this.navParams.get('gymName') || '';
    this.gymId = this.navParams.get('gymId') || '';
    this.schedule = this.navParams.get('schedule') || [];
    this.classTypes = this.navParams.get('classTypes') || [];
    this.minVenueFee = this.navParams.get('minVenueFee') || 0;
    this.maxVenueFee = this.navParams.get('maxVenueFee') || 1000;
    this.gcashAccountNumber = this.navParams.get('gcashAccountNumber') || ''; // Get from parent
    this.gcashAccountName = this.navParams.get('gcashAccountName') || ''; // Get from parent
    this.applicationData.venueFee = this.minVenueFee; // Set default venue fee to minimum
  }

  async ngOnInit() {
    // Set min and max dates
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1);
    this.maxDate = maxDate.toISOString()[0];

    // Load current user
    onAuthStateChanged(this.auth, async (user: User | null) => {
      if (!user) {
        this.dismiss('error');
        return;
      }
      this.currentUser = user;

      // Load gym class types
      await this.loadGymClassTypes();
    });
  }

  private async loadGymClassTypes() {
    try {
      // Class types are already passed from the parent component
      console.log('Class types from parent:', this.classTypes);
      console.log('GCash account number from parent:', this.gcashAccountNumber);
      console.log('GCash account name from parent:', this.gcashAccountName);

      // If no class types were passed, try to fetch them from Firestore
      if ((!this.classTypes || this.classTypes.length === 0) && this.gymId) {
        console.log('No class types passed, trying to fetch from Firestore');
        const gymRef = doc(this.firestore, 'gyms', this.gymId);
        const gymSnap = await getDoc(gymRef);

        if (gymSnap.exists()) {
          const gymData = gymSnap.data() as any;
          this.classTypes = gymData?.gymInfo?.classTypes || [];
          console.log('Fetched class types from Firestore:', this.classTypes);

          // Also fetch payment information if not already provided
          if (!this.gcashAccountNumber || !this.gcashAccountName) {
            const paymentInfo = gymData?.['gymInfo']?.['paymentInfo'];
            if (paymentInfo) {
              if (!this.gcashAccountNumber) {
                this.gcashAccountNumber =
                  paymentInfo['gcashAccountNumber'] || '';
              }
              if (!this.gcashAccountName) {
                this.gcashAccountName =
                  paymentInfo['gcashAccountName'] ||
                  paymentInfo['accountName'] ||
                  paymentInfo['gcashName'] ||
                  paymentInfo['ownerName'] ||
                  paymentInfo['name'] ||
                  gymData?.['ownerName'] ||
                  gymData?.['owner_name'] ||
                  gymData?.['gymInfo']?.['ownerName'] ||
                  gymData?.['gymInfo']?.['owner_name'] ||
                  gymData?.['gymInfo']?.['name'] ||
                  '';
              }
              console.log('Fetched payment info from Firestore:', {
                gcashAccountNumber: this.gcashAccountNumber,
                gcashAccountName: this.gcashAccountName,
              });
            }
          }
        }
      }

      // Update venue fee range based on class types
      this.updateVenueFeeRange();
    } catch (error) {
      console.error('Error loading gym class types:', error);
    }
  }

  private updateVenueFeeRange() {
    console.log('Updating venue fee range with class types:', this.classTypes);

    if (this.classTypes && this.classTypes.length > 0) {
      // Use the first class type's price_display as fixed venue fee
      const firstClassType = this.classTypes[0];
      let fixedVenueFee = 0;

      if (firstClassType.price_display) {
        // Remove any non-numeric characters like currency symbols and commas
        const numericString = firstClassType.price_display.replace(
          /[^0-9.]/g,
          ''
        );
        fixedVenueFee = parseFloat(numericString);
      }

      if (isNaN(fixedVenueFee)) {
        fixedVenueFee = 0;
      }

      this.minVenueFee = fixedVenueFee;
      this.maxVenueFee = fixedVenueFee;
      this.applicationData.venueFee = fixedVenueFee;

      console.log('Set fixed venue fee from price_display:', fixedVenueFee);
    } else {
      // Default fixed venue fee if no class types found
      this.minVenueFee = 0;
      this.maxVenueFee = 0;
      this.applicationData.venueFee = 0;
    }
  }

  private updateVenueFeeRangeForClass() {
    if (this.selectedClassType) {
      // Use the selected class type's price_display as fixed venue fee
      let fixedVenueFee = 0;

      if (this.selectedClassType.price_display) {
        const numericString = this.selectedClassType.price_display.replace(
          /[^0-9.]/g,
          ''
        );
        fixedVenueFee = parseFloat(numericString);
      }

      if (isNaN(fixedVenueFee)) {
        fixedVenueFee = 0;
      }

      this.minVenueFee = fixedVenueFee;
      this.maxVenueFee = fixedVenueFee;
      this.applicationData.venueFee = fixedVenueFee;

      console.log('Updated fixed venue fee for selected class:', {
        class: this.selectedClassType.name,
        fixedVenueFee: fixedVenueFee,
      });
    } else {
      // Fallback to default fixed venue fee if no class is selected
      this.minVenueFee = 0;
      this.maxVenueFee = 0;
      this.applicationData.venueFee = 0;
    }
  }

  // Handle venue fee change
  onVenueFeeChange(event: any) {
    if (event.detail && event.detail.value !== undefined) {
      this.applicationData.venueFee = Math.round(event.detail.value / 50) * 50; // Round to nearest 50
    }
  }

  dismiss(role: string = 'cancel') {
    this.modalCtrl.dismiss(null, role);
  }

  onClassSelected(event: any) {
    const value = event.detail.value;
    if (value) {
      const [className, day, time] = value.split('|');
      this.applicationData.className = className;
      this.applicationData.day = day;
      this.applicationData.time = time;

      // Find the selected class type to get its pricing
      this.selectedClassType =
        this.classTypes.find((ct) => ct.name === className) || null;

      // Update venue fee range based on selected class
      this.updateVenueFeeRangeForClass();

      // Set default date to next occurrence of the selected day
      const nextDate = this.getNextDayOfWeek();
      if (nextDate) {
        // Format date as YYYY-MM-DD to ensure consistent format
        const year = nextDate.getFullYear();
        const month = String(nextDate.getMonth() + 1).padStart(2, '0');
        const day = String(nextDate.getDate()).padStart(2, '0');
        this.applicationData.date = `${year}-${month}-${day}`;
      } else {
        this.applicationData.date = '';
      }
    }
  }

  // Get the next occurrence of the selected day of week
  getNextDayOfWeek(): Date | null {
    if (!this.applicationData.day) return null;

    try {
      const dayLower = this.applicationData.day.toLowerCase() as DayOfWeek;
      const selectedDay = this.dayMap[dayLower];
      const today = new Date();
      const result = new Date(today);

      // Calculate days until next occurrence of the selected day
      let daysUntilNext = selectedDay - today.getDay();
      if (
        daysUntilNext < 0 ||
        (daysUntilNext === 0 && today.getHours() >= 23)
      ) {
        daysUntilNext += 7; // Move to next week if today's class has already passed
      }

      result.setDate(today.getDate() + daysUntilNext);
      result.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

      return result;
    } catch (error) {
      console.error('Error calculating next day of week:', error);
      return null;
    }
  }

  // Validate the application form
  validateForm(): { valid: boolean; message?: string } {
    if (!this.applicationData.className) {
      return { valid: false, message: 'Please select a class' };
    }
    if (!this.applicationData.day || !this.applicationData.time) {
      return {
        valid: false,
        message: 'Please select a class with a valid schedule',
      };
    }
    if (!this.applicationData.date) {
      return { valid: false, message: 'Please select a date' };
    }
    if (!this.applicationData.venueFee || this.applicationData.venueFee < 0) {
      return { valid: false, message: 'Please set a valid venue fee' };
    }
    if (
      !this.applicationData.maxStudents ||
      this.applicationData.maxStudents < 1
    ) {
      return {
        valid: false,
        message: 'Please enter the maximum number of students',
      };
    }
    return { valid: true };
  }

  async submitApplication() {
    // Validate form
    const validation = this.validateForm();
    if (!validation.valid) {
      const alert = await this.alertCtrl.create({
        header: 'Incomplete Information',
        message: validation.message || 'Please fill in all required fields.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    if (!this.currentUser?.uid || !this.gymId) {
      this.dismiss('error');
      return;
    }

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
    if (!this.currentUser?.uid || !this.gymId) {
      this.dismiss('error');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingCtrl.create({
      message: 'Submitting application...',
      spinner: 'crescent',
      backdropDismiss: false,
    });

    try {
      await loading.present();

      // First check: Prevent the same coach from booking the same time slot
      const applicationsRef = collection(this.firestore, 'coachApplications');
      const dupeQuery = query(
        applicationsRef,
        where('coachId', '==', this.currentUser.uid),
        where('gymId', '==', this.gymId),
        where('day', '==', this.applicationData.day),
        where('time', '==', this.applicationData.time),
        where('status', 'in', ['pending', 'approved'])
      );
      const dupeSnapshot = await getDocs(dupeQuery);
      if (!dupeSnapshot.empty) {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Already Booked',
          message:
            'You have already booked this gym schedule. Please wait for approval or choose another slot.',
          buttons: ['OK'],
        });
        await alert.present();
        this.isSubmitting = false;
        return;
      }

      // Second check: Prevent any coach from booking a time slot that's already taken
      const conflictQuery = query(
        applicationsRef,
        where('gymId', '==', this.gymId),
        where('className', '==', this.applicationData.className),
        where('day', '==', this.applicationData.day),
        where('time', '==', this.applicationData.time),
        where('date', '==', this.applicationData.date),
        where('status', 'in', ['pending', 'approved'])
      );
      const conflictSnapshot = await getDocs(conflictQuery);
      if (!conflictSnapshot.empty) {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: 'Time Slot Unavailable',
          message:
            'This time slot has already been booked by another coach. Please choose a different time or date.',
          buttons: ['OK'],
        });
        await alert.present();
        this.isSubmitting = false;
        return;
      }

      // Get coach profile
      const userDoc = await getDoc(
        doc(this.firestore, 'users', this.currentUser.uid)
      );
      const userData = userDoc.data();
      const coachName = userData
        ? userData['name'] || this.currentUser.displayName || 'Unknown Coach'
        : 'Unknown Coach';

      // Format the date to ensure it's in the correct format
      let formattedDate = this.applicationData.date;
      if (formattedDate) {
        try {
          // If the date doesn't include time, add noon to avoid timezone issues
          if (!formattedDate.includes('T')) {
            formattedDate = `${formattedDate}T12:00:00`;
          }
          // Convert to Date object and back to ISO string to ensure valid format
          const dateObj = new Date(formattedDate);
          if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date');
          }
          formattedDate = dateObj.toISOString();
        } catch (error) {
          console.error('Error formatting date:', error);
          throw new Error('Invalid date format');
        }
      }

      // Calculate total fee (venue fee only, exclude coach fee)
      const venueFee = Number(this.applicationData.venueFee || 0);
      const totalFee = venueFee;

      // Generate a unique session ID for this application
      const sessionId = doc(collection(this.firestore, 'sessions')).id;

      // Format the application data
      const application = {
        sessionId: sessionId, // Add the unique session ID
        coachId: this.currentUser.uid,
        coachName: coachName,
        coachEmail: this.currentUser.email || '',
        gymId: this.gymId,
        gymName: this.gymName,
        className: this.applicationData.className,
        day: this.applicationData.day,
        time: this.applicationData.time,
        date: formattedDate,
        fee: totalFee, // Total fee (venue fee only)
        venueFee: venueFee, // Just the venue fee
        coachFee: Number(this.applicationData.fee || 0), // Coach fee still stored but not included in total
        maxStudents: Number(this.applicationData.maxStudents || 0),
        currentAttendees: 0, // Initialize current attendees to 0
        gcashAccountNumber: this.gcashAccountNumber, // Add GCash account number
        gcashAccountName: this.gcashAccountName, // Add GCash account name
        status: 'pending', // Set to pending until payment and approval
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add a composite key for easier querying
        compositeKey: `${this.gymId}_${this.applicationData.className}_${this.applicationData.day}_${this.applicationData.time}`,
      };

      console.log('Submitting application:', application);

      // Write the application to coachApplications
      await addDoc(
        collection(this.firestore, 'coachApplications'),
        application
      );

      // Get gym owner ID from gym document
      const gymRef = doc(this.firestore, 'gyms', this.gymId);
      const gymSnap = await getDoc(gymRef);
      const ownerId = gymSnap.exists()
        ? gymSnap.data()['ownerId'] || 'admin'
        : 'admin';

      console.log('Gym owner ID:', ownerId);

      // Create notification in Firestore for gym owner ONLY
      if (ownerId) {
        const gymBookingNotification = {
          type: 'booking',
          title: 'New Coach Joined',
          message: `Coach "${coachName}" has joined your class '${this.applicationData.className}' on ${this.applicationData.date} at ${this.applicationData.time}.`,
          userId: ownerId,
          data: {
            sessionId: sessionId,
            coachId: this.currentUser.uid,
            coachName: coachName,
            className: this.applicationData.className,
            date: this.applicationData.date,
            day: this.applicationData.day,
            time: this.applicationData.time,
            gymId: this.gymId,
            gymName: this.gymName,
            status: 'approved',
            action: 'coach_joined',
          },
          status: 'unread',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addDoc(
          collection(this.firestore, 'notifications'),
          gymBookingNotification
        );
      }

      await loading.dismiss();
      this.showSuccessAlert(
        'You have successfully joined the class. The gym owner has been notified.'
      );
      this.dismiss('success');
    } catch (error) {
      console.error('Error submitting application:', error);
      if (loading) await loading.dismiss();
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to submit application. Please try again later.';
      this.showErrorAlert(errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }

  private async showSuccessAlert(message?: string) {
    const alert = await this.alertCtrl.create({
      header: 'Application Submitted',
      message:
        message ||
        'Your application has been submitted successfully! The gym owner will review it shortly.',
      buttons: [
        {
          text: 'OK',
          handler: () => this.dismiss('success'),
        },
      ],
    });
    await alert.present();
  }

  private async showErrorAlert(
    message: string = 'An error occurred. Please try again.'
  ) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}
