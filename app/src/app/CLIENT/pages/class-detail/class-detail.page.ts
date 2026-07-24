import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonButtons,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Firestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from '@angular/fire/firestore';
import { AlertController } from '@ionic/angular';
import { Auth, authState } from '@angular/fire/auth';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
interface Booking {
  id: string;
  className?: string;
  coachName?: string;
  coachId?: string;
  gymId?: string;
  gymName?: string | { name: string };
  sessionId?: string;
  applicationId?: string; // Added applicationId to the interface
  date?: string | Date;
  status?: string;
  fee?: number;
  venueFee?: number;
  coachFee?: number;
  notes?: string;
  formattedDate?: string;
  maxStudents?: number;
  gcashNumber?: string; // Add coach's GCash number
}

interface ClientBooking {
  id: string;
  clientName: string;
  clientId: string;
  clientEmail: string;
  className: string;
  bookingDate: Date;
  status: string;
}

@Component({
  selector: 'app-class-detail',
  templateUrl: './class-detail.page.html',
  styleUrls: ['./class-detail.page.scss'],
  standalone: true,
  providers: [DatePipe],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton,
    IonButtons,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonBadge,
    DatePipe,
    NgClass,
    LucideIconsModule,
  ],
})
export class ClassDetailPage implements OnInit {
  bookingId: string = '';
  booking: Booking | null = null;
  clientBookings: ClientBooking[] = [];
  isLoading = true;
  isRefreshing = false;
  isLoadingClients = false;
  error = '';
  maxStudents = 0;
  availableSpots = 0;
  coachApplicationStatus: string = '';
  currentUserId: string = '';
  clientHasSubmittedPayment = false;

  constructor(
    private firestore: Firestore,
    private route: ActivatedRoute,
    private router: Router,
    private datePipe: DatePipe,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private auth: Auth
  ) {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';
  }

  async ngOnInit() {
    const user = await firstValueFrom(authState(this.auth));
    this.currentUserId = user?.uid || '';
    if (this.bookingId) {
      await this.loadBookingDetails();
    } else {
      this.error = 'No booking ID provided';
      this.isLoading = false;
    }
  }

  async loadCoachApplicationStatus(applicationId: string) {
    try {
      console.log('Loading coach application status for ID:', applicationId);
      const appDoc = await getDoc(
        doc(this.firestore, 'coachApplications', applicationId)
      );
      if (appDoc.exists()) {
        const appData = appDoc.data();
        const status = appData['status'] || '';
        console.log('Retrieved application data:', {
          id: applicationId,
          status: status,
          allData: appData, // Log all data for debugging
        });
        this.coachApplicationStatus = status;
        console.log(
          'Set coachApplicationStatus to:',
          this.coachApplicationStatus
        );
      } else {
        console.warn('No coach application found with ID:', applicationId);
      }
    } catch (error) {
      console.error('Error loading coach application status:', error);
    }
  }

  async loadBookingDetails() {
    if (!this.isRefreshing) this.isLoading = true;
    this.error = '';

    try {
      if (!this.bookingId) {
        throw new Error('No booking ID provided');
      }

      const bookingDoc = await getDoc(
        doc(this.firestore, 'sessionBookings', this.bookingId)
      );

      if (bookingDoc.exists()) {
        const data = bookingDoc.data();
        let venueFee: number | undefined;
        let coachFee: number | undefined;
        let latestCoachName: string | undefined;

        // If we have an applicationId, try to get the fees from coachApplications
        if (data['applicationId']) {
          try {
            const appDoc = await getDoc(
              doc(this.firestore, 'coachApplications', data['applicationId'])
            );
            if (appDoc.exists()) {
              const appData = appDoc.data();
              venueFee = appData['venueFee'];
              coachFee = appData['coachFee'];
              // Get GCash account number from coach application
              const gcashAccountNumber = appData['gcashAccountNumber'];
              if (gcashAccountNumber) {
                data['gcashAccountNumber'] = gcashAccountNumber;
              }
            }
          } catch (error) {
            console.error('Error fetching coach application data:', error);
            // Continue with undefined fees if there's an error
          }
        }

        // Fetch latest coach name if coachId is present
        if (data['coachId']) {
          try {
            const userDoc = await getDoc(
              doc(this.firestore, 'users', data['coachId'])
            );
            if (userDoc.exists()) {
              const userData = userDoc.data();
              latestCoachName = userData['name'] || data['coachName'];
            } else {
              latestCoachName = data['coachName'];
            }

            // Fetch coach's GCash number from multiple possible locations
            let gcashNumber = '';

            // Try coaches collection first
            try {
              const coachDoc = await getDoc(
                doc(this.firestore, 'coaches', data['coachId'])
              );
              if (coachDoc.exists()) {
                const coachData = coachDoc.data();
                const gcashFromProfessionalId =
                  coachData?.['professionalId']?.['gcashNumber'];
                const gcashFromRoot = coachData?.['gcashNumber'];
                const gcashAccountFromRoot = coachData?.['gcashAccountNumber'];
                const gcashFromProfessionalIdAccount =
                  coachData?.['professionalId']?.['gcashAccountNumber'];

                gcashNumber =
                  gcashFromProfessionalId ||
                  gcashFromRoot ||
                  gcashAccountFromRoot ||
                  gcashFromProfessionalIdAccount ||
                  '';
              }
            } catch (coachError) {
              console.error(
                'Error fetching from coaches collection:',
                coachError
              );
            }

            // If not found in coaches, try users collection
            if (!gcashNumber) {
              try {
                const userDoc = await getDoc(
                  doc(this.firestore, 'users', data['coachId'])
                );
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  const userGcashNumber =
                    userData?.['gcashNumber'] ||
                    userData?.['gcashAccountNumber'] ||
                    '';
                  gcashNumber = userGcashNumber;
                }
              } catch (userError) {
                console.error(
                  'Error fetching from users collection:',
                  userError
                );
              }
            }

            if (gcashNumber) {
              data['gcashNumber'] = gcashNumber;
            }
          } catch (e) {
            latestCoachName = data['coachName'];
          }
        } else {
          latestCoachName = data['coachName'];
        }

        const booking: Booking = {
          id: bookingDoc.id,
          className: data['className'],
          coachName: latestCoachName,
          coachId: data['coachId'],
          gymId: data['gymId'],
          gymName: data['gymName'],
          sessionId: data['sessionId'],
          date: data['date'],
          status: data['status'],
          fee: data['fee'],
          venueFee: venueFee,
          coachFee: coachFee,
          notes: data['notes'],
          maxStudents: data['maxStudents'] || 0,
          formattedDate: this.formatDate(data['date']),
          applicationId: data['applicationId'],
          gcashNumber: data['gcashNumber'],
        };

        this.booking = booking;
        console.log('Loaded booking data:', this.booking);

        // Load client bookings for this session if we have a sessionId
        if (booking.sessionId) {
          await this.loadClientBookings();

          // Load coach application status if we have an applicationId
          if (booking.applicationId) {
            await this.loadCoachApplicationStatus(booking.applicationId);
          }
        } else {
          console.warn('No sessionId found for booking:', booking.id);
          this.isLoadingClients = false;
        }
      } else {
        this.error = 'Booking not found';
        await this.showToast('Booking not found', 'danger');
      }
    } catch (error) {
      console.error('Error loading booking:', error);
      this.error = 'Failed to load booking details';
      await this.showToast('Failed to load booking details', 'danger');
    } finally {
      this.isLoading = false;
      // After loading booking and clientBookings, check for payment
      await this.checkClientPayment();
    }
  }

  async hasApprovedPayment(
    clientId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      // Get the current user (coach)
      const user = await firstValueFrom(authState(this.auth));
      if (!user) return false;

      // Query notifications for this client and session where payment was approved
      const notificationsRef = collection(this.firestore, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', user.uid), // Coach's notifications
        where('type', '==', 'payment'),
        where('data.clientId', '==', clientId),
        where('data.sessionId', '==', sessionId),
        where('data.status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return false;
    }
  }

  async loadClientBookings() {
    if (!this.booking) {
      console.error('No booking data available');
      return;
    }

    this.isLoadingClients = true;
    this.clientBookings = [];

    try {
      const { sessionId } = this.booking;

      if (!sessionId) {
        console.error('No sessionId found for this booking');
        await this.showToast('Session ID is missing', 'warning');
        return;
      }

      console.log('Loading attendees for session:', {
        sessionId: sessionId,
        className: this.booking.className,
        coachId: this.booking.coachId,
        gymId: this.booking.gymId,
        date: this.booking.date,
        maxStudents: this.booking.maxStudents,
      });

      // Query bookings by sessionId
      const q = query(
        collection(this.firestore, 'sessionBookings'),
        where('sessionId', '==', sessionId)
      );

      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} bookings for session`);

      // Convert bookings to client bookings format
      const clientBookings: ClientBooking[] = [];

      // Process each booking
      for (const docSnap of querySnapshot.docs) {
        console.log('Processing booking:', docSnap.id, docSnap.data());

        const data = docSnap.data() as {
          clientName?: string;
          clientEmail?: string;
          clientId?: string;
          bookedAt?: string | { seconds: number; nanoseconds: number } | any;
          timestamp?: any;
          userName?: string;
          userEmail?: string;
          name?: string;
          email?: string;
          status?: string;
          className?: string;
        };

        const clientId = data.clientId || 'unknown';
        let userName =
          data.clientName || data.userName || data.name || 'Unknown User';
        let userEmail =
          data.clientEmail || data.userEmail || data.email || 'No email';

        // Fetch latest client name if clientId is present
        if (clientId && clientId !== 'unknown') {
          try {
            const userDocSnap = await getDoc(
              doc(this.firestore, 'users', clientId)
            );
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as any;
              userName = userData['name'] || userName;
              userEmail = userData['email'] || userEmail;
            }
          } catch (e) {
            // fallback to existing userName and userEmail
          }
        }

        // Handle booking date
        let bookedAt: Date = new Date();
        if (data.bookedAt) {
          if (typeof data.bookedAt === 'string') {
            bookedAt = new Date(data.bookedAt);
          } else if (data.bookedAt.seconds) {
            // Firestore timestamp
            bookedAt = new Date(data.bookedAt.seconds * 1000);
          } else if (data.bookedAt.toDate) {
            // Firestore timestamp with toDate()
            bookedAt = data.bookedAt.toDate();
          }
        } else if (data.timestamp?.seconds) {
          bookedAt = new Date(data.timestamp.seconds * 1000);
        }

        // Get the booking status from the document data
        const bookingStatus = data.status?.toLowerCase() || 'booked';

        // Check if payment is approved for this client (either through notification or status in booking)
        const hasPaid =
          (await this.hasApprovedPayment(clientId, sessionId)) ||
          bookingStatus === 'paid' ||
          bookingStatus === 'approved';

        // Create client booking
        const clientBooking: ClientBooking = {
          id: docSnap.id,
          clientId: clientId,
          clientName: userName,
          clientEmail: userEmail,
          className:
            data.className || this.booking?.className || 'Unknown Class',
          bookingDate: bookedAt,
          status: hasPaid ? 'approved' : bookingStatus,
        };

        clientBookings.push(clientBooking);
      }

      // Sort by booking time (oldest first)
      clientBookings.sort(
        (a, b) => a.bookingDate.getTime() - b.bookingDate.getTime()
      );

      // Update the UI
      this.clientBookings = clientBookings;

      // Update available spots if maxStudents is set
      // Only count approved/paid clients toward capacity
      if (this.booking.maxStudents) {
        const approvedClientsCount = this.clientBookings.filter(
          (booking) =>
            booking.status === 'approved' || booking.status === 'paid'
        ).length;

        this.availableSpots = Math.max(
          0,
          this.booking.maxStudents - approvedClientsCount
        );

        console.log('Available spots calculation:', {
          maxStudents: this.booking.maxStudents,
          totalClients: this.clientBookings.length,
          approvedClients: approvedClientsCount,
          availableSpots: this.availableSpots,
        });
      }

      console.log(`Loaded ${this.clientBookings.length} attendees`);
    } catch (error) {
      console.error('Error loading attendees:', error);
      await this.showToast('Failed to load attendees', 'danger');
    } finally {
      this.isLoadingClients = false;
    }
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return '';

    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    return this.datePipe.transform(date, 'medium') || '';
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
    });
    await toast.present();
  }

  getGymName(gym: any): string {
    if (!gym) return 'Not specified';
    return typeof gym === 'string' ? gym : gym.name || 'Not specified';
  }

  goBack() {
    this.router.navigate(['/client/class']);
  }

  async processPayment() {
    if (!this.booking) {
      console.error('No booking data available');
      return;
    }

    // Navigate to payment page with booking details
    this.router.navigate(['/client/payment'], {
      queryParams: {
        className: this.booking.className,
        coachName: this.booking.coachName,
        date: this.booking.date,
        time: this.booking.formattedDate,
        location: this.getGymName(this.booking.gymName),
        amount: this.booking.fee,
        bookingId: this.booking.id,
        applicationId: this.booking.applicationId,
        gcashAccountNumber: this.booking.gcashNumber,
      },
    });
  }

  async refresh(event: any) {
    this.isRefreshing = true;
    await this.loadBookingDetails();
    this.isRefreshing = false;
    if (event && event.target) {
      event.target.complete();
    }
  }

  get currentClientBookingStatus(): string {
    const booking = this.clientBookings.find(
      (b) => b.clientId === this.currentUserId
    );
    return booking?.status || '';
  }

  // Get status color for badges (excluding paid/approved which now use icons)
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'declined':
        return 'danger';
      case 'cancelled':
        return 'medium';
      default:
        return 'medium';
    }
  }

  // Get display text for status badges (excluding paid/approved which now use icons)
  getStatusDisplayText(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'rejected':
      case 'declined':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  async checkClientPayment() {
    if (!this.bookingId || !this.currentUserId) {
      this.clientHasSubmittedPayment = false;
      return;
    }
    try {
      const paymentsCollection = collection(this.firestore, 'payments');
      const q = query(
        paymentsCollection,
        where('bookingId', '==', this.bookingId),
        where('userId', '==', this.currentUserId),
        where('status', 'in', ['pending', 'approved', 'rejected'])
      );
      const snapshot = await getDocs(q);
      this.clientHasSubmittedPayment = !snapshot.empty;
    } catch (e) {
      console.error('Error checking client payment:', e);
      this.clientHasSubmittedPayment = false;
    }
  }
}
