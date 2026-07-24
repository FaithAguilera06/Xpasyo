import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {
  IonicModule,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { RouterModule } from '@angular/router';
import {
  GymService,
  Gym,
  Schedule as GymServiceSchedule,
} from '../../../services/gym.service';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  runTransaction,
  writeBatch,
  increment,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { NotificationService } from 'src/app/services/notification.service';
import { TermsModalComponent } from '../../components/terms-modal/terms-modal.component';

// Class schedule interfaces
// Define interfaces for schedule data
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
  [key: string]: DaySchedule;
}

// Type guard for ScheduleDay
function isScheduleDay(schedule: unknown): schedule is ScheduleDay {
  return (
    !!schedule &&
    typeof schedule === 'object' &&
    'isOpen' in schedule &&
    typeof (schedule as ScheduleDay).isOpen === 'boolean'
  );
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface GymInfo {
  name: string;
  address: string;
  district: string;
  businessHours: string;
  description?: string;
  gym_description?: string;
  schedule?: GymServiceSchedule | GymSchedule;
  fitnessType?: string;
  classTypes?: any[];
  status?: string;
  image?: string;
  size?: string;
}

interface GymDetail {
  id: string;
  gymInfo: Omit<GymInfo, 'address'>;
  gym_address?: string; // Address is now at root level
  coordinates?: Coordinates;
  gym_logo?: {
    data?: string;
  };
  gym_description?: string;
  schedule?: GymServiceSchedule | GymSchedule;
  [key: string]: any;
}

@Component({
  selector: 'app-gym-detail',
  templateUrl: './gym-detail.page.html',
  styleUrls: ['./gym-detail.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    LucideIconsModule,
    RouterModule,
  ],
})
export class GymDetailPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false })
  private mapContainerElement!: ElementRef<HTMLDivElement>;
  private map: any = null;
  private gymMarker: any = null;
  private mapInitialized = false;

  // Component properties with explicit types
  gym: GymDetail | null = null;
  isLoading = true;
  isRefreshing = false;
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

  // Booking modal state
  isBookingModalOpen = false;

  // Session data
  coachApplications: Array<{
    id: string;
    className: string;
    time: string;
    day: string;
    coachName: string;
    fee: number;
    maxStudents: number;
    currentAttendees: number;
    [key: string]: any;
  }> = [];

  isLoadingApplications = false;
  userBookings: Set<string> = new Set(); // Track user's booked sessions

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

  // Load coach applications for this gym
  async loadCoachApplications(): Promise<void> {
    if (!this.firestore) {
      console.error('Firestore not initialized');
      return;
    }
    if (!this.gym?.id) {
      console.error('No gym ID available');
      return;
    }

    this.isLoadingApplications = true;
    this.coachApplications = [];

    try {
      // Query only active coach applications for this gym (coach has paid and class is confirmed)
      const applicationsRef = collection(this.firestore, 'coachApplications');
      const q = query(
        applicationsRef,
        where('gymId', '==', this.gym.id),
        where('status', '==', 'active')
      );

      console.log('Fetching coach applications for gym:', this.gym.id);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No coach applications found for this gym');
        return;
      }

      console.log(`Found ${querySnapshot.size} coach applications`);

      // Process each application to get current attendees
      for (const doc of querySnapshot.docs) {
        try {
          const sessionData = doc.data() as Record<string, any>;
          if (!sessionData) continue;
          if (
            !sessionData['className'] ||
            !sessionData['time'] ||
            !sessionData['day']
          )
            continue;
          const session = {
            id: doc.id,
            className: sessionData['className'] as string,
            time: sessionData['time'] as string,
            day: sessionData['day'] as string,
            coachName: (sessionData['coachName'] as string) || 'Coach',
            fee: Number(sessionData['fee']) || 0,
            maxStudents: Number(sessionData['maxStudents']) || 10,
            currentAttendees: Number(sessionData['currentAttendees']) || 0,
            ...sessionData,
          };
          this.coachApplications.push(session);
        } catch (sessionError) {
          console.error(`Error processing session ${doc.id}:`, sessionError);
        }
      }

      console.log(`Loaded ${this.coachApplications.length} sessions`);

      // Load user's existing bookings for this gym
      await this.loadUserBookings();
    } catch (error) {
      console.error('Error fetching coach applications:', error);
    } finally {
      this.isLoadingApplications = false;
    }
  }

  // Open booking modal and load coach applications
  async bookNow(): Promise<void> {
    console.log('Opening booking modal');
    this.isBookingModalOpen = true;
    await this.loadCoachApplications();
  }

  // Close booking modal
  closeBookingModal() {
    console.log('Closing booking modal');
    this.isBookingModalOpen = false;
  }

  // Handle booking a session (only available for active coach applications)
  async bookSessionWithRetry(
    session: {
      id: string;
      className: string;
      time: string;
      day: string;
      coachName?: string;
      fee?: number;
      maxStudents?: number;
      currentAttendees?: number;
      [key: string]: any;
    },
    maxRetries = 3
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const loadingAlert = await this.alertController.create({
      message: 'Processing your booking...',
      backdropDismiss: false,
    });
    await loadingAlert.present();

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        // Verify the session is still active before booking
        const sessionRef = doc(this.firestore, 'coachApplications', session.id);
        const sessionDoc = await getDoc(sessionRef);
        if (
          !sessionDoc.exists() ||
          sessionDoc.data()?.['status'] !== 'active'
        ) {
          await loadingAlert.dismiss();
          const alert = await this.alertController.create({
            header: 'Session Not Available',
            message:
              'This session is no longer available for booking. Please check for other available sessions.',
            buttons: ['OK'],
          });
          await alert.present();
          return;
        }

        // Check for existing active booking
        const existingBookingQuery = query(
          collection(this.firestore, 'sessionBookings'),
          where('applicationId', '==', session.id),
          where('clientId', '==', user.uid),
          where('status', 'in', ['pending', 'approved', 'active'])
        );
        const existingBookingSnapshot = await getDocs(existingBookingQuery);
        if (!existingBookingSnapshot.empty) {
          await loadingAlert.dismiss();
          const alert = await this.alertController.create({
            header: 'Already Booked',
            message: 'You have already booked this session.',
            buttons: ['OK'],
          });
          await alert.present();
          return;
        }
        const bookingRef = collection(this.firestore, 'sessionBookings');

        await runTransaction(this.firestore, async (transaction) => {
          // Get the current session data
          const sessionDoc = await transaction.get(sessionRef);
          if (!sessionDoc.exists()) {
            throw new Error('Session not found');
          }

          const sessionData = sessionDoc.data() as Record<string, any>;

          // Ensure we have a valid sessionId from coachApplication
          if (!sessionData['sessionId']) {
            console.warn(
              'No sessionId found in coachApplication, using application ID as fallback'
            );
          }

          const maxStudents =
            session['maxStudents'] || sessionData['maxStudents'] || 0;

          // Check for existing booking INSIDE the transaction
          const bookingDocId = `${session.id}_${user.uid}`;
          const bookingDocRef = doc(bookingRef, bookingDocId);
          const existingBookingDoc = await transaction.get(bookingDocRef);
          if (existingBookingDoc.exists()) {
            throw new Error('ALREADY_BOOKED');
          }

          // Check current active attendees
          const currentAttendees = sessionData['currentAttendees'] || 0;

          // Check if session is full
          if (maxStudents > 0 && currentAttendees >= maxStudents) {
            throw new Error('CLASS_FULL');
          }

          // Get user profile
          const userDoc = await transaction.get(
            doc(this.firestore, 'users', user.uid)
          );
          const userData = userDoc.exists() ? userDoc.data() : {};
          const displayName =
            userData['name'] || user.email?.split('@')[0] || 'User';

          const gcashNumber = userData['gcashNumber'] || '';

          // Create booking data - using the sessionId from coachApplication
          const bookingData = {
            id: bookingDocId, // Use composite ID
            sessionId: sessionData['sessionId'] || session.id,
            applicationId: session.id,
            className: session.className,
            coachId: session['coachId'] || sessionData['coachId'] || '',
            coachName:
              session['coachName'] || sessionData['coachName'] || 'Coach',
            gymId: this.gym?.id,
            gymName: this.gym?.gymInfo?.name || 'Unknown Gym',
            clientId: user.uid,
            clientName: displayName,
            clientEmail: user.email || '',
            gcashNumber: gcashNumber,
            date: session['date'] || new Date().toISOString().split('T')[0],
            time: session.time,
            day: session.day,
            fee: session.fee || 0,
            status: 'booked',
            bookedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            maxStudents: maxStudents,
            currentAttendees: currentAttendees + 1,
          };

          // Create booking and update session
          transaction.set(bookingDocRef, bookingData);

          // Update the session's currentAttendees count
          const sessionDocRef = doc(
            this.firestore,
            'coachApplications',
            session.id
          );
          transaction.update(sessionDocRef, { currentAttendees: increment(1) });

          // After booking is created, notify the coach
          if (session['coachId']) {
            // Deduplication check: only create notification if not already present
            const notificationsRef = collection(
              this.firestore,
              'notifications'
            );
            const dupeQuery = query(
              notificationsRef,
              where('userId', '==', session['coachId']),
              where('type', '==', 'booking'),
              where('sessionId', '==', session.id),
              where('clientId', '==', user.uid)
            );
            const dupeSnapshot = await getDocs(dupeQuery);
            if (dupeSnapshot.empty) {
              await this.notificationService.createNotification({
                userId: session['coachId'],
                type: 'booking',
                title: 'New Class Booking',
                message: `${displayName} has booked your class: ${session.className} on ${session.day} at ${session.time}`,
                data: {
                  clientId: user.uid,
                  clientName: displayName,
                  className: session.className,
                  sessionId: session.id,
                  bookingId: bookingDocId,
                  date: session.day,
                  time: session.time,
                  gymName: this.gym?.gymInfo?.name,
                },
              });
            }
          }

          return true;
        });

        // Dismiss loading and show success
        await loadingAlert.dismiss();
        const successAlert = await this.alertController.create({
          header: 'Booking Successful!',
          message: `You have successfully booked ${session['className']} on ${session['date']} at ${session['time']}.`,
          buttons: [
            {
              text: 'OK',
              handler: () => {
                this.closeBookingModal();
                // Refresh coach applications to update slot counts
                this.loadCoachApplications();
              },
            },
          ],
        });
        await successAlert.present();
        return;
      } catch (error: any) {
        // Handle transaction conflicts and errors
        if (error.message === 'CLASS_FULL') {
          await loadingAlert.dismiss();
          const alert = await this.alertController.create({
            header: 'Class Full',
            message: 'Sorry, this class is already full.',
            buttons: ['OK'],
          });
          await alert.present();
          return;
        }
        if (error.message === 'ALREADY_BOOKED') {
          await loadingAlert.dismiss();
          const alert = await this.alertController.create({
            header: 'Already Booked',
            message: 'You have already booked this session.',
            buttons: ['OK'],
          });
          await alert.present();
          return;
        }
        if (
          error.code === 'aborted' ||
          (error.message && error.message.includes('aborted'))
        ) {
          attempt++;
          if (attempt < maxRetries) {
            // Optionally, add a small delay before retrying
            await new Promise((res) =>
              setTimeout(res, 200 + Math.random() * 300)
            );
            continue;
          } else {
            await loadingAlert.dismiss();
            const alert = await this.alertController.create({
              header: 'High Demand',
              message:
                'Could not complete booking due to high demand. Please try again.',
              buttons: ['OK'],
            });
            await alert.present();
            return;
          }
        }
        // Other errors
        await loadingAlert.dismiss();
        const alert = await this.alertController.create({
          header: 'Booking Failed',
          message: 'Booking failed. Please try again later.',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }
    }
  }

  // Add a method to present the terms modal
  async presentTermsAndConditions(): Promise<boolean> {
    const modal = await this.modalController.create({
      component: TermsModalComponent,
      componentProps: {
        termsText: `XPASYO – Terms and Conditions (Client Version)

By using the XPASYO application and participating in any class or group activity as a Client, you agree to the following terms and conditions:

1. Fee Structure
1.1. When you join a class or activity, the initial fee displayed is an estimate. This estimate is calculated by dividing the total class fee by the projected number of participants.

1.2. You will receive an official in-app notification with the final, exact amount due once enrollment for the class is complete. This final amount is based on the actual number of enrollees.

1.3. Minimum Participant Fee Adjustment: If a class does not meet its projected total number of participants, the existing clients within that class may be required to pay an additional amount. This adjustment ensures that the coach's total required fee for the class is fulfilled. The specific additional amount will be communicated to you in the final fee notification.

2. Payment Requirements & Deadline
2.1. All users are required to pay the full and exact amount specified in the final notification. Overpayments and underpayments are not permitted. XPASYO is committed to maintaining fairness and transparency for all users.

2.2. Deadline of Payment: Payment for a confirmed class enrollment must be completed at least two (2) days before the scheduled class date. You will receive an in-app notification confirming receipt of your payment or if your payment has been rejected. Failure to meet this payment deadline may result in the cancellation of your enrollment.

2.3. Payment Details: All necessary payment details will be made visible within the XPASYO app when you proceed with the payment process.

3. Cancellation and Refund Policy (Client)
3.1. Payment Verification for Refunds: All refund requests are subject to verification of the submitted payment receipt. If the provided receipt is deemed illegitimate or if the Coach/XPASYO has not received the corresponding payment for the class, your refund request may be rejected, and your participation in the class may be revoked, even if you previously joined in the app. You must submit a legitimate picture of your official receipt for all payment-related inquiries, including refund requests.

3.2. Client-Initiated Cancellation:
* Prior to Class Start: If you cancel your enrollment before the official start date of the class and a significant percentage of class slots are still open (as determined by XPASYO's policy), you may be eligible for a full refund.
* Within 24 Hours of Class Start: Cancellations made within 24 hours of the scheduled class start time, or after the class has officially begun, are generally non-refundable.
* All cancellation requests must be submitted through the XPASYO app's designated cancellation feature.

3.3. XPASYO or Coach-Initiated Cancellation:
* In the event that XPASYO or the Coach cancels a class (e.g., due to insufficient enrollment, coach unavailability, unforeseen circumstances, or a venue issue), registered clients will receive a full refund for the fees paid for that specific class.
* Refunds for such cancellations will be processed automatically within [Insert Number] business days.

3.4. Refund Processing: Approved refunds will be processed via your original payment method. Please allow [Insert Number] business days for the refund to reflect in your account, depending on your bank or payment provider.

4. Client Journey (Process)
4.1. Selecting a Class: As a client, you'll first browse available gyms and classes within the XPASYO app based on your preferences.

4.2. Joining and Payment: After selecting a class, you'll join it within the app and be required to pay the class fee. Remember that payment is due at least two (2) days before the scheduled class. You'll receive notifications confirming if your payment is accepted or rejected.

4.3. Class Day: On the day of the class, you must bring your XPASYO app and present your class confirmation to the Coach and/or the facility owner to verify your participation. Then, you can enjoy the class and stay fit!

5. Prohibited Conduct
5.1. XPASYO has a zero-tolerance policy for fraud. Scamming, using dummy accounts, or engaging in any fraudulent behavior (including but not limited to misrepresenting payment, submitting illegitimate receipts, false refund claims, or disrupting class activities) will result in immediate suspension or permanent banning from the application.

6. Governing Law & Dispute Resolution (Ruling)
6.1. These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines.

6.2. Any dispute, controversy, or claim arising out of or relating to these Terms and Conditions, or the breach, termination, or invalidity thereof, shall first be attempted to be settled amicably between the parties. If an amicable resolution cannot be reached within thirty (30) days, the dispute shall be submitted to the competent courts of Metro Manila, Philippines, to the exclusion of all other courts.`,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    return data === true;
  }

  // Update bookSpecificSession to show the modal before booking
  async bookSpecificSession(session: any): Promise<void> {
    if (!session) {
      this.bookNow(); // fallback to open modal
      return;
    }
    // Show terms modal first
    const accepted = await this.presentTermsAndConditions();
    if (!accepted) return; // User did not accept terms

    // Check if user is logged in
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    // Use the retryable booking method
    await this.bookSessionWithRetry(session);
    // Refresh user bookings and coach applications to update UI
    await this.loadUserBookings();
    await this.loadCoachApplications();
  }

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

  // Get schedule grouped by day
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

  // Get schedule as array of classes
  getScheduleArray(): ClassItem[] {
    if (!this.gym?.gymInfo?.schedule) return [];

    const schedule = this.gym.gymInfo.schedule;
    const result: ClassItem[] = [];

    // Handle different schedule formats
    if (Array.isArray(schedule)) {
      // If schedule is already an array, use it directly
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
      // Handle object with days as keys
      Object.entries(schedule).forEach(([day, daySchedule]) => {
        if (Array.isArray(daySchedule)) {
          // Handle array of classes for a day
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
          // Handle single class object for a day
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

  // Check if there are any classes scheduled
  hasClasses(): boolean {
    try {
      const schedule = this.gym?.gymInfo?.schedule;
      if (!schedule) return false;

      // If schedule is an array, check if it has any valid classes
      if (Array.isArray(schedule)) {
        return schedule.some((item) => item && item.className && item.time);
      }

      // If schedule is an object, check if it has any valid classes
      if (typeof schedule === 'object') {
        return Object.values(schedule).some((daySchedule) => {
          if (!daySchedule) return false;
          if (Array.isArray(daySchedule)) {
            return daySchedule.some(
              (item) => item && item.className && item.time
            );
          }
          return daySchedule.className && daySchedule.time;
        });
      }

      return false;
    } catch (error) {
      console.error('Error checking for classes:', error);
      return false;
    }
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private gymService: GymService,
    private firestore: Firestore,
    private auth: Auth,
    private alertController: AlertController,
    private toastController: ToastController,
    private notificationService: NotificationService,
    private modalController: ModalController
  ) {
    const today = new Date().getDay();
    this.currentDay = this.daysOfWeek[today] || 'monday';
  }

  ngOnInit() {
    // Check for state data (passed from the explore page)
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as
      | { propertyData: GymDetail }
      | undefined;

    if (state?.propertyData) {
      this.gym = state.propertyData;
      this.isLoading = false;
      // Load coach applications and user bookings after gym data is set
      this.loadCoachApplications();
      this.loadUserBookings();
      setTimeout(() => {
        if (this.gym && this.gym.coordinates) {
          this.initializeMap(
            this.gym.coordinates.lat,
            this.gym.coordinates.lng
          ).catch((error: Error) => {
            console.warn('Failed to update map with address:', error);
          });
        } else if (this.gym && this.gym.gym_address) {
          this.geocodeAddress(this.gym.gym_address).then((coords) => {
            if (coords) {
              this.initializeMap(coords.lat, coords.lng).catch(
                (error: Error) => {
                  console.warn(
                    'Failed to update map with geocoded address:',
                    error
                  );
                }
              );
            }
          });
        }
      }, 0);
    } else {
      // If no state data, try to load from route params
      const gymId = this.route.snapshot.paramMap.get('id');
      if (gymId) {
        this.loadGymDetails(gymId);
      } else {
        // Go back to previous page or home if no history
        this.goBack();
      }
    }
  }

  async ngAfterViewInit() {
    if (this.gym && this.gym.coordinates) {
      this.initializeMap(
        this.gym.coordinates.lat,
        this.gym.coordinates.lng
      ).catch((error: Error) => {
        console.warn('Failed to update map with address:', error);
      });
    } else if (this.gym && this.gym.gym_address) {
      this.geocodeAddress(this.gym.gym_address).then((coords) => {
        if (coords) {
          this.initializeMap(coords.lat, coords.lng).catch((error: Error) => {
            console.warn('Failed to update map with geocoded address:', error);
          });
        }
      });
    }
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

  private async initializeMap(lat: number, lng: number) {
    await this.loadMapLibreScript();
    const maplibregl = (window as any).maplibregl;
    if (!this.mapContainerElement?.nativeElement) return;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.map = new maplibregl.Map({
      container: this.mapContainerElement.nativeElement,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
      center: [lng, lat],
      zoom: 15,
    });
    this.map.addControl(new maplibregl.NavigationControl());
    // Add marker
    this.addGymMarker(lng, lat);
    this.mapInitialized = true;
  }

  private addGymMarker(lng: number, lat: number) {
    const maplibregl = (window as any).maplibregl;
    if (!this.map) return;
    if (this.gymMarker) {
      this.gymMarker.remove();
      this.gymMarker = null;
    }
    // Custom marker element
    const el = document.createElement('div');
    el.className = 'custom-map-pin-marker gym-marker';
    el.innerHTML = `
      <div class="icon-circle">
        <img src="assets/map-pin.svg" class="gym-marker-img" width="40" height="40" alt="Gym Marker"/>
      </div>
    `;
    this.gymMarker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  // Helper for geocoding (Nominatim, similar to explore page)
  private async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lng: number } | null> {
    if (!address) return null;
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      address
    )}&format=json&countrycodes=ph&limit=1&email=contact@xpasyo.com`;
    try {
      const response = await fetch(proxyUrl + encodeURIComponent(nominatimUrl));
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async loadGymDetails(gymId: string) {
    try {
      // Fetch the gym data directly from the Realtime Database
      const foundGym = await this.gymService.getGymById(gymId);

      if (foundGym) {
        this.gym = foundGym;
        // Map description to gym_description if needed
        if (this.gym && this.gym['description'] && !this.gym.gym_description) {
          this.gym.gym_description = this.gym['description'];
        }
        console.log('Loaded gym data:', this.gym);

        // Load coach applications and user bookings after gym data is loaded
        this.loadCoachApplications();
        this.loadUserBookings();

        // Type assertion to access potential dynamic properties
        type GymWithDynamicProperties = GymDetail & {
          [key: string]: any;
          address?: string;
          location?: string;
        };

        const gym = this.gym as GymWithDynamicProperties;

        // Always use the gym address if available, but don't await it
        if (gym.gym_address) {
          console.log('Using gym address from database:', gym.gym_address);
          this.initializeMap(
            gym.coordinates?.lat || 0,
            gym.coordinates?.lng || 0
          ).catch((error: Error) => {
            console.warn('Failed to update map with gym address:', error);
          });
        } else {
          console.warn(
            'No gym_address found, checking for alternative address fields...'
          );
          // Check for any other possible address fields
          const possibleAddress =
            gym.address || gym.location || (gym.gymInfo as any)?.address;

          if (possibleAddress) {
            console.log('Found alternative address field:', possibleAddress);
            this.initializeMap(0, 0).catch((error: Error) => {
              console.warn(
                'Failed to update map with alternative address:',
                error
              );
            });
          } else {
            console.warn('No address found, keeping default location');
            // No need to update the map as it's already showing the default location
          }
        }
      } else {
        console.warn(`No gym found with ID: ${gymId}`);
        // Go back to previous page or home if no history
        this.goBack();
      }
    } catch (error) {
      console.error('Error loading gym details:', error);
      this.goBack();
    } finally {
      this.isLoading = false;
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

    // Reinitialize the map with updated data if address is available
    if (this.gym && this.gym.gym_address) {
      this.initializeMap(
        this.gym.coordinates?.lat || 0,
        this.gym.coordinates?.lng || 0
      ).catch((error: Error) => {
        console.warn('Failed to update map with address:', error);
      });
    } else {
      this.initializeMap(0, 0);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/default-gym.png';
    }
  }

  // Go back to previous page or client home if no history
  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/client/home']);
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
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun',
    };

    return (
      abbreviations[dayLower] || (day.length >= 3 ? day.substring(0, 3) : day)
    );
  }

  // Helper to find a matching session for a class schedule item
  getSessionForClass(classItem: ClassItem) {
    if (!classItem || !this.coachApplications) return null;
    return (
      this.coachApplications.find(
        (session) =>
          session.className === classItem.className &&
          session.day?.toLowerCase() === (classItem.day || '').toLowerCase() &&
          session.time === classItem.time
      ) || null
    );
  }

  // Check if current user has already booked a specific session
  async hasUserBookedSession(sessionId: string): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;

    try {
      const existingBookingQuery = query(
        collection(this.firestore, 'sessionBookings'),
        where('applicationId', '==', sessionId),
        where('clientId', '==', user.uid),
        where('status', 'in', ['pending', 'approved', 'active'])
      );
      const existingBookingSnapshot = await getDocs(existingBookingQuery);
      return !existingBookingSnapshot.empty;
    } catch (error) {
      console.error('Error checking user booking status:', error);
      return false;
    }
  }

  // Track user's booking statuses
  userBookingStatuses: Map<
    string,
    'pending' | 'approved' | 'active' | 'declined' | 'cancelled'
  > = new Map();

  // Load user's existing bookings for this gym
  async loadUserBookings(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !this.gym?.id) return;

    try {
      const bookingsQuery = query(
        collection(this.firestore, 'sessionBookings'),
        where('clientId', '==', user.uid),
        where('gymId', '==', this.gym.id),
        where('status', 'in', [
          'pending',
          'approved',
          'active',
          'declined',
          'cancelled',
        ])
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      this.userBookings.clear();
      this.userBookingStatuses.clear();

      bookingsSnapshot.docs.forEach((doc) => {
        const booking = doc.data();
        const sessionId = booking['applicationId'];
        const status = booking['status'];

        console.log('Loading user booking:', {
          bookingId: doc.id,
          applicationId: sessionId,
          status: status,
          clientId: booking['clientId'],
          gymId: booking['gymId'],
        });

        // Only add to userBookings if status is active/approved
        if (status === 'approved' || status === 'active') {
          this.userBookings.add(sessionId);
        }

        // Track all booking statuses for UI display
        this.userBookingStatuses.set(sessionId, status);
      });

      console.log('Loaded user booking statuses:', {
        userBookings: Array.from(this.userBookings),
        userBookingStatuses: Array.from(this.userBookingStatuses.entries()),
      });
    } catch (error) {
      console.error('Error loading user bookings:', error);
    }
  }

  // Check if user has booked a specific session (synchronous)
  hasUserBookedSessionSync(sessionId: string): boolean {
    return this.userBookings.has(sessionId);
  }

  // Get user's booking status for a session
  getUserBookingStatus(
    sessionId: string
  ): 'pending' | 'approved' | 'active' | 'declined' | 'cancelled' | null {
    return this.userBookingStatuses.get(sessionId) || null;
  }

  // Calculate actual available slots (excluding pending bookings)
  getActualAvailableSlots(session: any): number {
    if (!session || !session.maxStudents) return 0;

    // Get approved/active bookings count
    const approvedBookings = session.currentAttendees || 0;

    // Calculate available slots
    return Math.max(0, session.maxStudents - approvedBookings);
  }

  // Get booking status for a session (for UI display) - synchronous version
  getSessionBookingStatusSync(
    session: any
  ): 'available' | 'booked' | 'pending' | 'full' {
    if (!session) return 'available';

    // Check user's booking status first
    // Use session.id which should be the applicationId
    const userStatus = this.getUserBookingStatus(session.id);

    if (userStatus === 'approved' || userStatus === 'active') {
      return 'booked';
    }
    if (userStatus === 'pending') {
      return 'pending';
    }

    // Check if session is actually full (only counting approved/active bookings)
    const availableSlots = this.getActualAvailableSlots(session);
    if (availableSlots <= 0) {
      return 'full';
    }

    return 'available';
  }

  ngOnDestroy() {
    // Clean up map resources
    if (this.gymMarker) {
      this.gymMarker.remove();
      this.gymMarker = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Clean up event listeners for mobile
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  // Store event handler references for cleanup
  private onlineHandler = () => {
    console.log('Network connection restored');
    if (this.gym?.id && !this.isRefreshing) {
      this.refreshGymData();
    }
  };

  private offlineHandler = () => {
    console.log('Network connection lost');
    this.showOfflineMessage();
  };

  private visibilityHandler = () => {
    if (!document.hidden && this.gym?.id && !this.isRefreshing) {
      setTimeout(() => {
        this.refreshGymData();
      }, 500);
    }
  };

  private lastAutoRefresh: number = 0;
  private readonly AUTO_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

  // Ionic lifecycle hook - called when the page is about to enter
  ionViewWillEnter() {
    // Only refresh if more than 1 hour has passed since last auto refresh
    const now = Date.now();
    if (
      this.gym?.id &&
      now - this.lastAutoRefresh > this.AUTO_REFRESH_INTERVAL
    ) {
      setTimeout(() => {
        this.refreshGymData();
        this.lastAutoRefresh = Date.now();
      }, 100);
    }
  }

  // Ionic lifecycle hook - called when the page has fully entered
  ionViewDidEnter() {
    // Add mobile-specific optimizations
    this.setupMobileOptimizations();
  }

  // Setup mobile-specific optimizations
  private setupMobileOptimizations() {
    // Add network status listener for mobile
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    // Add visibility change listener for mobile app state
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // Show offline message
  private async showOfflineMessage() {
    const toast = await this.toastController.create({
      message: 'You are offline. Some features may not work properly.',
      duration: 3000,
      color: 'warning',
      position: 'bottom',
      cssClass: 'mobile-toast',
    });
    await toast.present();
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    if (this.gym?.id) {
      this.isRefreshing = true;
      try {
        // Add a small delay for better mobile UX
        await new Promise((resolve) => setTimeout(resolve, 100));

        await this.refreshGymData();

        // Show success message with mobile-optimized positioning
        const toast = await this.toastController.create({
          message: 'Data refreshed successfully!',
          duration: 2000,
          color: 'success',
          position: 'bottom',
          cssClass: 'mobile-toast',
          buttons: [
            {
              text: 'OK',
              role: 'cancel',
            },
          ],
        });
        await toast.present();
      } catch (error) {
        console.error('Error during refresh:', error);
        const toast = await this.toastController.create({
          message:
            'Failed to refresh data. Please check your connection and try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
          cssClass: 'mobile-toast',
          buttons: [
            {
              text: 'Retry',
              handler: () => {
                this.handleRefresh(event);
              },
            },
            {
              text: 'OK',
              role: 'cancel',
            },
          ],
        });
        await toast.present();
      } finally {
        this.isRefreshing = false;
      }
    }
    event.target.complete();
  }

  // Manual refresh method for the refresh button
  async manualRefresh() {
    if (this.gym?.id) {
      this.isRefreshing = true;
      try {
        // Add haptic feedback for mobile devices
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        await this.refreshGymData();

        // Show success message with mobile-optimized positioning
        const toast = await this.toastController.create({
          message: 'Data refreshed successfully!',
          duration: 2000,
          color: 'success',
          position: 'bottom',
          cssClass: 'mobile-toast',
        });
        await toast.present();
      } catch (error) {
        console.error('Error during manual refresh:', error);
        const toast = await this.toastController.create({
          message:
            'Failed to refresh data. Please check your connection and try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
          cssClass: 'mobile-toast',
          buttons: [
            {
              text: 'Retry',
              handler: () => {
                this.manualRefresh();
              },
            },
          ],
        });
        await toast.present();
      } finally {
        this.isRefreshing = false;
      }
    }
  }

  // Method to refresh gym data and sessions
  private async refreshGymData() {
    if (!this.gym?.id) return;

    try {
      // Check network connectivity for mobile devices
      if (!navigator.onLine) {
        throw new Error(
          'No internet connection. Please check your network settings.'
        );
      }

      // Add timeout for mobile networks
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Request timeout. Please try again.')),
          15000
        );
      });

      // Reload gym details with timeout
      const gymDetailsPromise = this.loadGymDetails(this.gym.id);
      await Promise.race([gymDetailsPromise, timeoutPromise]);

      // Reload coach applications (sessions) with timeout
      const applicationsPromise = this.loadCoachApplications();
      await Promise.race([applicationsPromise, timeoutPromise]);

      // Reload user bookings to update button states
      const userBookingsPromise = this.loadUserBookings();
      await Promise.race([userBookingsPromise, timeoutPromise]);

      console.log(
        'Gym data, sessions, and user bookings refreshed successfully'
      );
    } catch (error) {
      console.error('Error refreshing gym data:', error);

      // Provide mobile-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Connection is slow. Please try again.');
        } else if (error.message.includes('internet')) {
          throw new Error('No internet connection. Please check your network.');
        }
      }

      throw new Error('Failed to refresh data. Please try again.');
    }
  }
}
