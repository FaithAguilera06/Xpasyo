import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  ModalController,
  AlertController,
  LoadingController,
  NavController,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonNote,
  IonAvatar,
  IonSpinner,
  IonListHeader,
  IonButton,
  ToastController,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { NotificationService } from '../../../services/notification.service';
import { LucideIcons } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';

interface CoachApplication {
  id?: string;
  sessionId: string; // Unique identifier for the session
  coachId: string;
  coachName: string;
  coachEmail: string;
  gymId: string;
  gymName: string;
  className: string;
  gymAddress: string;
  day: string;
  time: string;
  date: string;
  fee: number;
  maxStudents: number;
  venueFee: number;
  coachFee?: number;
  status: string;
  paymentStatus?: 'pending' | 'paid' | 'rejected' | 'none' | 'unpaid';
  paymentProof?: string; // Base64 encoded image
  paymentDate?: string;
  paymentReceipt?: string;
  paymentSubmittedAt?: string;
  appliedAt: string;
  updatedAt: string;
  enrolledStudents?: Array<{
    id: string;
    name: string;
    email: string;
    bookedAt: string;
    status: string;
    clientId: string; // Firebase Auth UID of the client
  }>;
}

@Component({
  selector: 'app-coach-class',
  templateUrl: './coach-class.page.html',
  styleUrls: ['./coach-class.page.scss'],
  styles: [
    `
      ion-header {
        background-color: red !important;
      }
      .test-style {
        color: red;
      }
    `,
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonBadge,
   

    
    IonAvatar,
    IonSpinner,
    IonButton,
    LucideAngularModule,
    LucideIconsModule,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
  ],
})
export class CoachClassPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = true;
  isRefreshing = false;
  classes: CoachApplication[] = [];
  selectedClass: CoachApplication | null = null;
  showClassList = true;
  selectedTab = 'details';
  private loading: HTMLIonLoadingElement | null = null;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    // Check for class ID in the route
    this.route.paramMap.subscribe(async (params) => {
      const classId = params.get('id');

      // Get current user
      onAuthStateChanged(this.auth, async (user) => {
        this.currentUser = user;
        if (user) {
          await this.loadCoachClasses(user.uid);

          // If there's a class ID in the route, select that class
          if (classId && this.classes.length > 0) {
            const selected = this.classes.find((c) => c.id === classId);
            if (selected) {
              this.selectedClass = selected;
              this.showClassList = false;
              // Only load details if we don't have them already
              if (!selected.enrolledStudents) {
                await this.loadClassDetails(selected);
              }
            }
          }
        } else {
          this.isLoading = false;
        }
      });
    });
  }

  async loadCoachClasses(coachId: string) {
    this.isLoading = true;
    try {
      const applicationsRef = collection(this.firestore, 'coachApplications');
      const q = query(applicationsRef, where('coachId', '==', coachId));
      const querySnapshot = await getDocs(q);

      this.classes = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as CoachApplication;
        this.classes.push({
          id: doc.id,
          ...data,
        });
      });

      // Sort classes by date (newest first)
      this.classes.sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    } catch (error) {
      console.error('Error loading coach classes:', error);
      this.showErrorAlert('Failed to load your classes. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  selectClass(classItem: CoachApplication) {
    this.selectedClass = classItem;
    this.showClassList = false;
    this.loadClassDetails(classItem);
  }

  goBack() {
    this.showClassList = true;
    this.selectedClass = null;
    this.router.navigate(['/coach/class']); // Adjust the route as needed for your app
  }

  goToMyClasses() {
    this.showClassList = true;
    this.selectedClass = null;
  }

  async toggleClassStatus() {
    if (!this.selectedClass || !this.selectedClass.id) return;

    const newStatus =
      this.selectedClass.status === 'active' ? 'closed' : 'active';
    const loading = await this.loadingCtrl.create({
      message:
        newStatus === 'active' ? 'Activating class...' : 'Closing class...',
    });
    await loading.present();

    try {
      const classRef = doc(
        this.firestore,
        'coachApplications',
        this.selectedClass.id
      );
      await updateDoc(classRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // If activating, update all 'booked' client bookings to 'pending'
      if (newStatus === 'active') {
        const bookingsQuery = query(
          collection(this.firestore, 'sessionBookings'),
          where('applicationId', '==', this.selectedClass.id),
          where('status', '==', 'booked')
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const batch = writeBatch(this.firestore);
        bookingsSnapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, { status: 'pending' });
        });
        await batch.commit();
      }

      // Update local state
      this.selectedClass.status = newStatus;

      // Show success message
      const toast = await this.toastCtrl.create({
        message: `Class ${newStatus} successfully!`,
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } catch (error) {
      console.error(`Error updating class status:`, error);
      const toast = await this.toastCtrl.create({
        message: `Failed to update class status. Please try again.`,
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async loadClassDetails(selectedClass: CoachApplication) {
    // First, refresh the class data to get the latest payment status
    try {
      const classDoc = await getDoc(
        doc(this.firestore, 'coachApplications', selectedClass.id || '')
      );
      if (classDoc.exists()) {
        const freshData = classDoc.data();
        // Update the selected class with fresh data including payment status
        selectedClass = {
          ...selectedClass,
          paymentStatus: freshData['paymentStatus'],
          paymentProof: freshData['paymentProof'],
          paymentDate: freshData['paymentDate'],
          paymentReceipt: freshData['paymentReceipt'],
          paymentSubmittedAt: freshData['paymentSubmittedAt'],
          updatedAt: freshData['updatedAt'],
          status: freshData['status'], // Also update the class status
        };
        
        // Update the class in the array to keep it in sync
        this.updateClassInArray(selectedClass);
      }
    } catch (error) {
      console.error('Error refreshing class data:', error);
    }
    try {
      this.selectedClass = selectedClass;
      this.showClassList = false;

      console.log('Loading class details with sessionId:', {
        sessionId: selectedClass.sessionId,
        className: selectedClass.className,
        coachId: selectedClass.coachId,
        gymId: selectedClass.gymId,
        date: selectedClass.date,
        maxStudents: selectedClass.maxStudents,
      });

      if (!selectedClass.sessionId) {
        console.error('No sessionId found for the selected class');
        throw new Error('This class is missing a session identifier');
      }

      // Query bookings by sessionId
      const q = query(
        collection(this.firestore, 'sessionBookings'),
        where('sessionId', '==', selectedClass.sessionId)
      );

      const querySnapshot = await getDocs(q);
      console.log(
        `Found ${querySnapshot.size} bookings for sessionId: ${selectedClass.sessionId}`
      );
      querySnapshot.forEach((doc) => {
        console.log('Session booking:', doc.id, doc.data());
      });

      // Convert bookings to enrolled students format
      const enrolledStudents: Array<{
        id: string;
        name: string;
        email: string;
        bookedAt: string;
        status: string;
        clientId: string; // Add clientId to store the Firebase Auth UID
      }> = [];

      // Process bookings up to maxStudents
      let count = 0;
      for (const docSnap of querySnapshot.docs) {
        console.log('Processing booking:', docSnap.id, docSnap.data());
        if (count < selectedClass.maxStudents) {
          interface BookingData {
            clientName?: string;
            clientEmail?: string;
            bookedAt?: string;
            timestamp?: any;
            userName?: string;
            userEmail?: string;
            name?: string;
            email?: string;
            userId?: string;
            clientId?: string;
            status?: string;
          }

          const data = docSnap.data() as BookingData;

          // Use clientName if available, otherwise fall back to other possible fields
          const clientId = data.clientId || data.userId || 'unknown';
          let userName = data.clientName || data.userName || data.name || 'Unknown User';
          let userEmail = data.clientEmail || data.userEmail || data.email || 'No email';

          // Fetch latest client name if clientId is present
          if (clientId && clientId !== 'unknown') {
            try {
              const userDocSnap = await getDoc(doc(this.firestore, 'users', clientId));
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as any;
                userName = userData['name'] || userName;
                userEmail = userData['email'] || userEmail;
              }
            } catch (e) {
              // fallback to existing userName and userEmail
            }
          }

          const bookedAt =
            data.bookedAt ||
            (data.timestamp?.toDate
              ? data.timestamp.toDate().toISOString()
              : new Date().toISOString());

          // Get the booking status from the document data
          const bookingStatus = data.status?.toLowerCase() || 'booked';
          let displayStatus = bookingStatus; // keep the original status
          enrolledStudents.push({
            id: docSnap.id,
            name: userName,
            email: userEmail,
            bookedAt: bookedAt,
            status: displayStatus,
            clientId: clientId, // Add the Firebase Auth UID
          });
          count++;
        }
      }

      // Sort by booking time (oldest first)
      enrolledStudents.sort(
        (a, b) =>
          new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime()
      );

      // Update the class with enrolled students
      this.selectedClass.enrolledStudents = enrolledStudents;
      
      // Update the corresponding class in the classes array to keep it in sync
      this.updateClassInArray(this.selectedClass);

      // Check if class has reached maximum capacity
      if (
        enrolledStudents.length >= selectedClass.maxStudents &&
        selectedClass.status !== 'closed'
      ) {
        try {
          // Close the class
          const classRef = doc(
            this.firestore,
            'coachApplications',
            selectedClass.id || ''
          );
          await updateDoc(classRef, {
            status: 'closed',
            updatedAt: new Date().toISOString(),
          });

          // Update local state
          this.selectedClass.status = 'closed';

          // Calculate payment per attendee
          const totalFee =
            (selectedClass.coachFee || 0) + (selectedClass.venueFee || 0);
          const paymentPerAttendee = totalFee / selectedClass.maxStudents;

          // Show notification to coach
          const toast = await this.toastCtrl.create({
            message: `Class has reached maximum capacity and has been closed. Each attendee needs to pay ${this.formatCurrency(
              paymentPerAttendee
            )}`,
            duration: 5000,
            color: 'success',
            position: 'bottom',
            buttons: [
              {
                text: 'OK',
                role: 'cancel',
              },
            ],
          });
          await toast.present();

          // Send notification to all enrolled students
          if (enrolledStudents && enrolledStudents.length > 0) {
            try {
              console.log(
                'Sending notifications to',
                enrolledStudents.length,
                'students'
              );

              // Send notification to each enrolled student using NotificationService
              for (const student of enrolledStudents) {
                if (!student.id) {
                  console.warn('Skipping student with no ID:', student);
                  continue;
                }

                try {
                  await this.notificationService.createNotification({
                    type: 'system',
                    title: 'Class Full - Payment Required',
                    message:
                      `The class "${selectedClass.className}" has reached maximum capacity. ` +
                      `Please make a payment of ${this.formatCurrency(
                        paymentPerAttendee
                      )} to secure your spot.`,
                    userId: student.id,
                    data: {
                      classId: selectedClass.id,
                      className: selectedClass.className,
                      date: selectedClass.date,
                      time: selectedClass.time,
                      amount: paymentPerAttendee,
                      action: 'payment_required',
                    },
                  });
                  console.log(`Notification sent to student ${student.id}`);
                } catch (error) {
                  console.error(
                    `Failed to send notification to student ${student.id}:`,
                    error
                  );
                }
              }

              // Send notification to coach
              if (this.currentUser?.uid) {
                try {
                  await this.notificationService.createNotification({
                    type: 'system',
                    title: 'Class Full - Notifications Sent',
                    message: `Notifications have been sent to all ${enrolledStudents.length} students about the payment.`,
                    userId: this.currentUser.uid,
                    data: {
                      classId: selectedClass.id,
                      className: selectedClass.className,
                      action: 'notifications_sent',
                      studentCount: enrolledStudents.length,
                    },
                  });
                  console.log('Notification sent to coach');
                } catch (error) {
                  console.error('Failed to send notification to coach:', error);
                }
              }
            } catch (error) {
              console.error('Error sending notifications:', error);
              const toast = await this.toastCtrl.create({
                message:
                  'Error sending notifications to students: ' +
                  (error as Error).message,
                duration: 5000,
                color: 'danger',
                position: 'bottom',
              });
              await toast.present();
            }
          } else {
            console.log('No enrolled students to notify');
          }
        } catch (error) {
          console.error('Error updating class status:', error);
        }
      }
    } catch (error) {
      console.error('Error loading class details:', error);
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Failed to load class details. Please try again.',
        buttons: ['OK'],
      });
      await alert.present();
      // Go back to the class list if there's an error
      this.goBack();
    } finally {
      if (this.loading) {
        await this.loading.dismiss();
        this.loading = null;
      }
    }
  }

  formatDate(dateString: any): string {
    if (!dateString) return 'No date';

    let date: Date;

    // Handle Firestore Timestamp objects
    if (
      dateString &&
      typeof dateString === 'object' &&
      'toDate' in dateString
    ) {
      date = dateString.toDate();
    } else if (
      typeof dateString === 'string' ||
      typeof dateString === 'number'
    ) {
      date = new Date(dateString);
    } else {
      date = new Date();
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format the date part only (without time)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Format time to 12-hour format with AM/PM
  formatTime(timeString: string): string {
    if (!timeString) return 'No time';

    // If time is in 24-hour format, convert it to 12-hour format
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }

    return timeString;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  }

  // Payment status helper methods
  getPaymentStatusColor(status?: string): string {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  isActivateButtonDisabled(): boolean {
    const color = this.getPaymentStatusColor(this.selectedClass?.paymentStatus);
    // Disable if payment status color is 'warning', 'danger', or 'medium' (not submitted)
    return color === 'warning' || color === 'danger' || color === 'medium';
  }

  getPaymentStatusText(status?: string): string {
    if (!status) return 'Not Submitted';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // Payment button helpers
  shouldShowPaymentButton(): boolean {
    if (!this.selectedClass) return false;

    // Only show button if payment is not submitted, was rejected, or is unpaid
    return (
      !this.selectedClass.paymentStatus ||
      this.selectedClass.paymentStatus === 'rejected' ||
      this.selectedClass.paymentStatus === 'unpaid'
    );
  }

  getPaymentButtonColor(classItem?: CoachApplication): string {
    const targetClass = classItem || this.selectedClass;
    if (!targetClass) return 'primary';
    if (targetClass.paymentStatus === 'rejected') return 'danger';
    if (targetClass.paymentStatus === 'pending') return 'warning';
    if (targetClass.paymentStatus === 'paid') return 'success';
    return 'success';
  }

  getPaymentButtonIcon(): string {
    if (this.selectedClass?.paymentStatus === 'rejected')
      return 'refresh-cw';
    return 'credit-card';
  }

  getPaymentButtonText(classItem?: CoachApplication): string {
    const targetClass = classItem || this.selectedClass;
    if (!targetClass) return 'Process Payment';

    switch (targetClass.paymentStatus) {
      case 'rejected':
        return 'Resubmit Payment';
      case 'pending':
        return 'Payment Pending';
      case 'paid':
        return 'View Receipt';
      default:
        return 'Process Payment';
    }
  }

  // Check if all attendees have paid
  allAttendeesPaid(): boolean {
    if (!this.selectedClass?.enrolledStudents?.length) return false;
    return this.selectedClass.enrolledStudents.every(
      (student) => student.status === 'paid'
    );
  }

  // Process payment for the class
  async processPayment(classItem?: CoachApplication) {
    const targetClass = classItem || this.selectedClass;
    if (!targetClass?.id) return;

    // Check if payment is already pending or paid
    if (targetClass.paymentStatus === 'pending') {
      const alert = await this.alertCtrl.create({
        header: 'Payment Pending',
        message: 'Your payment is already pending review by the admin.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    if (targetClass.paymentStatus === 'paid') {
      const alert = await this.alertCtrl.create({
        header: 'Payment Already Processed',
        message: 'Your payment has already been processed and approved.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Navigate to the payment page
    this.router.navigate([
      '/coach/coach-class',
      targetClass.id,
      'payment',
    ]);
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    if (this.currentUser) {
      this.isRefreshing = true;
      try {
        // Store the current selected class ID and tab before refreshing
        const currentSelectedClassId = this.selectedClass?.id;
        const currentTab = this.selectedTab;
        
        // Reload all coach classes
        await this.loadCoachClasses(this.currentUser.uid);
        
        // If we had a selected class, update it with the fresh data
        if (currentSelectedClassId && this.selectedClass) {
          const updatedClass = this.classes.find(c => c.id === currentSelectedClassId);
          if (updatedClass) {
            this.selectedClass = updatedClass;
            // Reload the class details to get the latest payment status and enrolled students
            await this.loadClassDetails(updatedClass);
            
            // Restore the selected tab
            this.selectedTab = currentTab;
            
            // Show a success message if payment status changed
            if (updatedClass.paymentStatus === 'paid') {
              const toast = await this.toastCtrl.create({
                message: 'Payment status updated! Your payment has been approved.',
                duration: 3000,
                color: 'success',
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      } catch (error) {
        console.error('Error during refresh:', error);
        const toast = await this.toastCtrl.create({
          message: 'Failed to refresh data. Please try again.',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      } finally {
        this.isRefreshing = false;
      }
    }
    event.target.complete();
  }

  // Send reminder to client
  async remindClient(student: any) {
    if (!this.selectedClass || !student) {
      await this.showErrorAlert('Unable to send reminder. Please try again.');
      return;
    }

    try {
      // Show loading
      this.loading = await this.loadingCtrl.create({
        message: 'Sending reminder...',
      });
      await this.loading.present();

      // Use the clientId from the student object for the notification (this is the Firebase Auth UID)
      const clientId = student.clientId;
      if (!clientId) {
        await this.showErrorAlert('Unable to identify the client. Please try again.');
        return;
      }

      // Send reminder notification
      await this.notificationService.sendReminder(
        clientId,
        this.selectedClass.className,
        this.selectedClass.id,
        this.selectedClass.date,
        this.selectedClass.coachName
      );

      // Show success message
      const toast = await this.toastCtrl.create({
        message: `Reminder sent to ${student.name || 'client'}`,
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('[remindClient] Error sending reminder:', error);
      await this.showErrorAlert('Failed to send reminder. Please try again.');
    } finally {
      if (this.loading) {
        await this.loading.dismiss();
        this.loading = null;
      }
    }
  }

  canNotifyClients(): boolean {
    return this.selectedClass?.status === 'active';
  }

  getClassStatusColor(status: string): string {
    switch (status) {
      case 'active':
      case 'approved':
        return 'success';
      case 'closed':
      case 'pending':
        return 'warning';
      default:
        return 'medium';
    }
  }

  // Helper method to update a class in the classes array
  private updateClassInArray(updatedClass: CoachApplication) {
    if (!updatedClass.id) return;
    
    const index = this.classes.findIndex(c => c.id === updatedClass.id);
    if (index !== -1) {
      this.classes[index] = { ...updatedClass };
    }
  }

  ngOnDestroy() {
    // Clean up any subscriptions or listeners if needed
  }

  // Ionic lifecycle hook - called when the page is about to enter
  ionViewWillEnter() {
    // Refresh data when the page becomes active
    if (this.currentUser && this.selectedClass) {
      this.refreshCurrentClassData();
    }
  }

  // Method to refresh the current class data
  private async refreshCurrentClassData() {
    if (!this.selectedClass?.id || !this.currentUser) return;
    
    try {
      // Reload the specific class data
      await this.loadClassDetails(this.selectedClass);
    } catch (error) {
      console.error('Error refreshing current class data:', error);
    }
  }

  // Manual refresh method for the refresh button
  async manualRefresh() {
    if (this.currentUser && this.selectedClass) {
      this.isRefreshing = true;
      try {
        await this.refreshCurrentClassData();
        
        // Show a success message
        const toast = await this.toastCtrl.create({
          message: 'Data refreshed successfully!',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      } catch (error) {
        console.error('Error during manual refresh:', error);
        const toast = await this.toastCtrl.create({
          message: 'Failed to refresh data. Please try again.',
          duration: 2000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      } finally {
        this.isRefreshing = false;
      }
    }
  }
}
