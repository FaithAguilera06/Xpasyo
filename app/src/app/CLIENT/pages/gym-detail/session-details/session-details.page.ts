import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Firestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  runTransaction,
  increment,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AlertController, ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-session-details',
  templateUrl: './session-details.page.html',
  styleUrls: ['./session-details.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideIconsModule],
})
export class SessionDetailsPage implements OnInit {
  gymId: string = '';
  sessionId: string = '';
  session: any = null;
  isLoading = true;
  isBooking = false;
  isBooked = false;
  isAccordionOpen = false;
  agreedToTerms = false;
  showTermsCheckbox = false;
  isClientInClass = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private alertController: AlertController,
    private toastController: ToastController,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    this.gymId = this.route.snapshot.paramMap.get('gymId') || '';
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    await this.loadSession();
  }

  async loadSession() {
    this.isLoading = true;
    try {
      const sessionRef = doc(
        this.firestore,
        'coachApplications',
        this.sessionId
      );
      const sessionDoc = await getDoc(sessionRef);
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        this.session = {
          id: sessionDoc.id,
          ...sessionData,
          maxStudents: sessionData['maxStudents'] || 0,
          currentAttendees: sessionData['currentAttendees'] || 0,
        };
        // Check if current user is already in the class
        const user = this.auth.currentUser;
        if (user) {
          const bookingQuery = query(
            collection(this.firestore, 'sessionBookings'),
            where('applicationId', '==', this.sessionId),
            where('clientId', '==', user.uid),
            where('status', 'in', ['pending', 'approved', 'active'])
          );
          const bookingSnapshot = await getDocs(bookingQuery);
          this.isClientInClass = !bookingSnapshot.empty;
        } else {
          this.isClientInClass = false;
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async presentTermsAndConditions(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Terms and Conditions',
      message: `By booking this session, you agree to the terms and conditions below.<br><br>
      <ul>
        <li>You must arrive on time for your session.</li>
        <li>Payment must be completed before the session starts.</li>
        <li>Cancellation policies apply as stated by the gym.</li>
        <li>Contact the coach or gym for any changes.</li>
      </ul>`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => false,
        },
        {
          text: 'Accept',
          handler: () => true,
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== 'cancel';
  }

  async bookNow() {
    // const accepted = await this.presentTermsAndConditions();
    // if (!accepted) return;
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.isBooking = true;
    try {
      await this.bookSessionWithRetry(this.session);
      // Removed toast popup
      await this.loadSession(); // Refresh session data
    } catch (error: any) {
      // Removed error toast popup
    } finally {
      this.isBooking = false;
    }
  }

  async bookSessionWithRetry(session: any, maxRetries = 3): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not logged in');
    // Get user profile and displayName outside the transaction
    const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const displayName = userData['name'] || user.email?.split('@')[0] || 'User';
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
          throw new Error('This session is no longer available for booking.');
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
          throw new Error('You have already booked this session.');
        }
        const bookingRef = collection(this.firestore, 'sessionBookings');
        await runTransaction(this.firestore, async (transaction) => {
          const sessionDoc = await transaction.get(sessionRef);
          if (!sessionDoc.exists()) throw new Error('Session not found');
          const sessionData = sessionDoc.data() as Record<string, any>;
          const maxStudents =
            session['maxStudents'] || sessionData['maxStudents'] || 0;
          const bookingDocId = `${session.id}_${user.uid}`;
          const bookingDocRef = doc(bookingRef, bookingDocId);
          const existingBookingDoc = await transaction.get(bookingDocRef);
          if (existingBookingDoc.exists()) throw new Error('ALREADY_BOOKED');
          const currentAttendees = sessionData['currentAttendees'] || 0;
          if (maxStudents > 0 && currentAttendees >= maxStudents) {
            throw new Error('CLASS_FULL');
          }
          // Get user profile
          const gcashNumber = userData['gcashNumber'] || '';
          const bookingData = {
            id: bookingDocId,
            sessionId: sessionData['sessionId'] || session.id,
            applicationId: session.id,
            className: session.className,
            coachId: session['coachId'] || sessionData['coachId'] || '',
            coachName:
              session['coachName'] || sessionData['coachName'] || 'Coach',
            gymId: this.gymId,
            gymName: sessionData['gymName'] || 'Unknown Gym',
            clientId: user.uid,
            clientName: displayName,
            clientEmail: user.email || '',
            gcashNumber: gcashNumber,
            date: session['date'] || new Date().toISOString().split('T')[0],
            time: session.time,
            day: session.day,
            fee: session.fee || 0,
            status: 'pending', // changed from 'booked' to 'pending'
            bookedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            maxStudents: maxStudents,
            currentAttendees: currentAttendees + 1,
          };
          transaction.set(bookingDocRef, bookingData);
          transaction.update(sessionRef, { currentAttendees: increment(1) });
        });
        // Notify the coach after successful booking
        if (session['coachId']) {
          // Deduplication check: only create notification if not already present
          const notificationsRef = collection(this.firestore, 'notifications');
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
                bookingId: `${session.id}_${user.uid}`,
                date: session.day,
                time: session.time,
                gymName: this.session?.gymName || '',
              },
            });
          }
        }
        return;
      } catch (error: any) {
        if (
          error.message === 'ALREADY_BOOKED' ||
          error.message === 'CLASS_FULL'
        ) {
          throw error;
        }
        attempt++;
        if (attempt >= maxRetries) throw error;
      }
    }
  }

  onTermsScroll(event: any) {
    const el = event.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      this.showTermsCheckbox = true;
    }
  }

  goBack() {
    if (this.gymId) {
      this.router.navigate([`/client/gym-detail`, this.gymId]);
    } else {
      this.router.navigate(['/client/explore']); // fallback
    }
  }

  // New UI logic for booking button and accordion
  async handleBookSession() {
    if (!this.agreedToTerms || this.isBooking || this.isBooked) return;
    this.isBooking = true;
    try {
      await this.bookSessionWithRetry(this.session);
      this.isBooked = true;
      setTimeout(() => {
        this.isBooked = false;
      }, 2000); // Show 'Booked!' for 2 seconds
      await this.loadSession();
    } catch (error) {
      // Optionally handle error
    } finally {
      this.isBooking = false;
    }
  }

  toggleAccordion() {
    this.isAccordionOpen = !this.isAccordionOpen;
  }

  handleTermsChange(event: any) {
    this.agreedToTerms = event.target?.checked ?? this.agreedToTerms;
  }

  // Helper method to safely calculate slots left
  getSlotsLeft(): number {
    if (!this.session) return 0;
    const maxStudents = this.session.maxStudents || 0;
    const currentAttendees = this.session.currentAttendees || 0;
    return Math.max(0, maxStudents - currentAttendees);
  }

  getFormattedDate(dateString: string | Date | undefined): string {
    if (!dateString) return 'Not specified';

    try {
      let date: Date;

      if (typeof dateString === 'string') {
        // Handle different date string formats
        if (dateString.includes('T')) {
          // If it's an ISO string with time, convert to local date
          const utcDate = new Date(dateString);
          date = new Date(
            utcDate.getTime() - utcDate.getTimezoneOffset() * 60000
          );
        } else {
          // If it's already a date string (YYYY-MM-DD), use it directly
          date = new Date(dateString);
        }
      } else {
        // If it's already a Date object
        date = dateString;
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      // Format as "Month Day, Year" (e.g., "July 26, 2025")
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
}
