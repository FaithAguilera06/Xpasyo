import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSpinner,
  IonCheckbox,
  ToastController,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Firestore,
  doc,
  serverTimestamp,
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/services/notification.service';
import { PaymentService } from '../../../services/payment.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconsModule } from 'android/app/src/main/assets/public/assets/icon/lucide-icons.module';
import { Clipboard } from '@capacitor/clipboard';

export interface PaymentDetails {
  className: string;
  coachName: string;
  date: string;
  time: string;
  location: string;
  amount: number;
  venueFee: number;
  coachFee: number;
  bookingId?: string;
  coachId?: string;
  applicationId?: string;
  gcashNumber?: string;
}

export interface PaymentDocument {
  userId: string;
  bookingId: string;
  className: string;
  coachName: string;
  coachId: string;
  classDate: string;
  classTime: string;
  location: string;
  amount: number; // Venue fee
  coachFee: number; // Coach fee
  serviceFee: number;
  totalAmount: number;
  paymentProof: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: any;
  updatedAt: any;
  gcashNumber?: string; // Add coach's GCash number
}

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,LucideIconsModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonSpinner,
    IonCheckbox,
  ],
  providers: [PaymentService],
})
export class PaymentPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  paymentDetails: PaymentDetails = {
    className: '',
    coachName: '',
    date: '',
    time: '',
    location: '',
    amount: 0,
    venueFee: 0,
    coachFee: 0,
    bookingId: '',
    applicationId: '',
    gcashNumber: '',
  };

  receiptImage: string | ArrayBuffer | null = null;
  receiptFileName: string = '';
  receiptFile: File | null = null;
  isSubmitting: boolean = false;
  maxStudents: number = 0;
  showTerms: boolean = false;
  acceptedTerms: boolean = false;

 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private firestore: Firestore,
    private auth: Auth,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef,
    private firebaseService: FirebaseService
  ) {}

  async ngOnInit() {
    // Get booking details from navigation extras
    this.route.queryParams.subscribe(async (params) => {
      if (!params) return;

      // Initialize with empty values first
      this.paymentDetails = {
        className: params['className'] || 'Fitness Class',
        coachName: params['coachName'] || 'Coach Name',
        date: params['date'] || new Date().toLocaleDateString(),
        time: params['time'] || '10:00 AM - 11:00 AM',
        location: params['location'] || 'Main Gym',
        amount: 0,
        venueFee: 0,
        coachFee: 0,
        bookingId: params['bookingId'],
        applicationId: params['applicationId'],
        gcashNumber: params['gcashNumber'],
      };

      if (!params['applicationId'] || !params['bookingId']) {
        console.error('Missing required parameters');
        return;
      }

      try {
        // 1. Fetch coach application first
        console.log(
          'Fetching coach application with ID:',
          params['applicationId']
        );
        const appDoc = await getDoc(
          doc(this.firestore, 'coachApplications', params['applicationId'])
        );

        if (!appDoc.exists()) {
          console.error(
            'No coach application found with ID:',
            params['applicationId']
          );
          return;
        }

        const appData = appDoc.data();
        console.log('Coach application data:', appData);

        // 2. Fetch booking details to get maxStudents
        console.log('Fetching booking details for ID:', params['bookingId']);
        const bookingDoc = await getDoc(
          doc(this.firestore, 'sessionBookings', params['bookingId'])
        );

        if (!bookingDoc.exists()) {
          console.error('No booking found with ID:', params['bookingId']);
          return;
        }

        // Get current user
        const user = await firstValueFrom(authState(this.auth));
        if (!user) {
          this.showToast('User not authenticated', 'danger');
          this.router.navigate(['/client/class']);
          return;
        }

        const bookingData = bookingDoc.data();
        
        // Check if there's already a pending payment for this booking and user
        const paymentsCollection = collection(this.firestore, 'payments');
        const q = query(
          paymentsCollection,
          where('bookingId', '==', params['bookingId']),
          where('userId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          this.showToast('You already have a pending payment for this class. Please wait for approval or rejection.', 'warning');
          this.router.navigate(['/client/class']);
          return;
        }
        
        this.maxStudents = Number(bookingData['maxStudents']) || 1; // Default to 1 to avoid division by zero
        console.log('Max students:', this.maxStudents);

        // 3. Update payment details from coach application
        this.paymentDetails.venueFee = Number(appData['venueFee']) || 0;
        this.paymentDetails.coachFee = Number(appData['coachFee']) || 0;
        this.paymentDetails.amount = Number(appData['fee']) || 0;
        this.paymentDetails.coachId = bookingData['coachId'];
        
        // Fetch coach's GCash number from multiple possible locations
        if (bookingData['coachId']) {
          let gcashNumber = '';
          
          // Try coaches collection first
          try {
            const coachDoc = await getDoc(doc(this.firestore, 'coaches', bookingData['coachId']));
            if (coachDoc.exists()) {
              const coachData = coachDoc.data();
              
              // Try different possible paths for GCash number
              const gcashFromProfessionalId = coachData?.['professionalId']?.['gcashNumber'];
              const gcashFromRoot = coachData?.['gcashNumber'];
              const gcashAccountFromRoot = coachData?.['gcashAccountNumber'];
              const gcashFromProfessionalIdAccount = coachData?.['professionalId']?.['gcashAccountNumber'];
              
              gcashNumber = gcashFromProfessionalId || gcashFromRoot || gcashAccountFromRoot || gcashFromProfessionalIdAccount || '';
            }
          } catch (coachError) {
            console.error('Error fetching from coaches collection:', coachError);
          }
          
          // If not found in coaches, try users collection
          if (!gcashNumber) {
            try {
              const userDoc = await getDoc(doc(this.firestore, 'users', bookingData['coachId']));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check for GCash number in user data
                const userGcashNumber = userData?.['gcashNumber'] || userData?.['gcashAccountNumber'] || '';
                gcashNumber = userGcashNumber;
              }
            } catch (userError) {
              console.error('Error fetching from users collection:', userError);
            }
          }
          
          // Set the found GCash number
          this.paymentDetails.gcashNumber = gcashNumber;
          
        } else {
          // Fallback to application data if no coachId
          this.paymentDetails.gcashNumber = appData['gcashNumber'] || '';
        }

        console.log('Payment details:', {
          venueFee: this.paymentDetails.venueFee,
          coachFee: this.paymentDetails.coachFee,
          totalAmount: this.paymentDetails.amount,
          gcashNumber: this.paymentDetails.gcashNumber,
          perAttendeeFee:
            (this.paymentDetails.venueFee + this.paymentDetails.coachFee) /
            this.maxStudents,
        });

        // Force UI update
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error loading data:', error);
      }
    });
  }

  selectFile() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || !input.files[0]) {
      console.log('No file selected');
      return;
    }

    const file = input.files[0];
    console.log(
      'File selected:',
      file.name,
      'Type:',
      file.type,
      'Size:',
      file.size
    );

    // Check file type (allow images)
    if (!file.type.match(/image\/(jpeg|jpg|png|gif|bmp|webp)/i)) {
      console.error('Invalid file type:', file.type);
      this.showToast(
        'Please select a valid image file (JPEG, JPG, PNG, GIF, BMP, WebP)',
        'warning'
      );
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      this.showToast('File size should not exceed 5MB', 'warning');
      return;
    }

    this.receiptFile = file;
    this.receiptFileName = file.name;

    try {
      // Resize and compress the image to ensure base64 size is under 1MB
      const resizedBase64 = await this.resizeImageFileToMaxSize(file, 1048487); // ~1MB
      this.receiptImage = resizedBase64;
      const base64Size = this.calculateBase64Size(resizedBase64);
      console.log(
        `File resized and read successfully, receiptImage set. Base64 size: ${base64Size} bytes`
      );
      this.cdr.detectChanges();
      return true;
    } catch (error) {
      console.error('Error processing file:', error);
      this.showToast('Error processing file. Please try again.', 'danger');
      return false;
    }
  }

  private resizeImageFileToMaxSize(
    file: File,
    maxSizeInBytes: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target) {
          reject(new Error('FileReader event has no target'));
          return;
        }
        img.src = e.target.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        let [width, height] = [img.width, img.height];
        let quality = 0.9; // Start with high quality
        let base64 = '';

        const resizeAndCompress = () => {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          base64 = canvas.toDataURL(file.type, quality);
          const base64Length = this.calculateBase64Size(base64);
          if (base64Length > maxSizeInBytes && quality > 0.1) {
            quality -= 0.1;
            resizeAndCompress();
          } else if (base64Length > maxSizeInBytes) {
            // If quality is low but still too big, reduce dimensions
            width = Math.floor(width * 0.9);
            height = Math.floor(height * 0.9);
            if (width < 100 || height < 100) {
              // Cannot reduce further
              resolve(base64); // Return the best we have
              return;
            }
            resizeAndCompress();
          } else {
            resolve(base64);
          }
        };

        resizeAndCompress();
      };

      img.onerror = (error) => {
        reject(error);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  }

  private calculateBase64Size(base64String: string): number {
    // Calculate approximate byte size of base64 string
    // Remove data URL prefix if present
    const base64 = base64String.split(',')[1] || base64String;
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return (base64.length * 3) / 4 - padding;
  }

  removeFile() {
    this.receiptImage = null;
    this.receiptFile = null;
    this.receiptFileName = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  async submitPayment() {
    console.log('Starting payment submission...');

    // Check if form is valid
    if (!this.receiptImage || !this.receiptFile) {
      console.error('No payment proof provided');
      this.showToast('Please upload a proof of payment', 'warning');
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingCtrl.create({
      message: 'Submitting payment...',
      spinner: 'crescent',
    });

    try {
      await loading.present();
      console.log('Loading indicator shown');

      // Get current user
      console.log('Getting current user...');
      const user = await firstValueFrom(authState(this.auth));
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('User authenticated:', user.uid);

      // Get booking details from sessionBookings
      if (!this.paymentDetails.bookingId) {
        throw new Error('Booking ID is required');
      }

      console.log('Fetching booking details...');
      const bookingDoc = await getDoc(
        doc(this.firestore, 'sessionBookings', this.paymentDetails.bookingId)
      );

      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }

      const bookingData = bookingDoc.data();
      
      this.maxStudents = bookingData['maxStudents'] || 0;
      const bookingId = bookingDoc.id; // This is the unique booking ID
      const applicationId = bookingData['applicationId'];
      const sessionId = bookingData['sessionId'];
      const coachId = bookingData['coachId'];

      if (!coachId) {
        throw new Error('Coach ID not found in booking');
      }

      console.log('Found booking details:', {
        bookingId,
        applicationId,
        sessionId,
        coachId,
      });

      // Get coach application to get coach name and other details
      if (!applicationId) {
        throw new Error('Application ID not found in booking');
      }

      console.log('Fetching coach application...');
      const appDoc = await getDoc(
        doc(this.firestore, 'coachApplications', applicationId)
      );

      if (!appDoc.exists()) {
        throw new Error('Coach application not found');
      }

      const appData = appDoc.data();
      console.log('Found coach application data');

      // Prepare payment data
      console.log('Preparing payment data...');
      const paymentData = {
        className: this.paymentDetails.className,
        coachName: this.paymentDetails.coachName,
        coachId: coachId,
        classDate: this.paymentDetails.date,
        classTime: this.paymentDetails.time,
        location: this.paymentDetails.location,
        amount: Number(this.paymentDetails.venueFee) || 0,
        coachFee: Number(this.paymentDetails.coachFee) || 0,
        totalAmount: Number(this.paymentDetails.amount) || 0,
        paymentProof: (this.receiptImage as string).split(',')[1] || '', // Strip data URL prefix
        paymentMethod: 'bank_transfer',
        serviceFee: 0,
        bookingId: bookingId, // Include booking ID in payment data
        gcashNumber: this.paymentDetails.gcashNumber, // Add coach's GCash number
      };

      console.log(
        'Submitting payment with data:',
        JSON.stringify(paymentData, null, 2)
      );

      // 1. Submit payment
      console.log('Calling payment service...');
      const paymentId = await this.paymentService.submitPayment(paymentData);
      console.log('Payment submitted successfully. Payment ID:', paymentId);

      if (!paymentId) {
        throw new Error('Failed to get payment ID after submission');
      }

      // 2. Create notification for the coach
      if (coachId) {
        console.log('Creating notification for coach...');
        const notificationData: any = {
          paymentId: paymentId,
          bookingId: bookingId, // Use the booking ID from sessionBookings
          applicationId: applicationId, // Use the application ID from sessionBookings
          sessionId: sessionId, // Include sessionId from booking
          amount: this.paymentDetails.amount,
          className: this.paymentDetails.className,
          date: this.paymentDetails.date,
          time: this.paymentDetails.time,
          status: 'pending',
          paymentProof: this.receiptImage as string,
          action: 'payment_received',
          venueFee: this.paymentDetails.venueFee,
          coachFee: this.paymentDetails.coachFee,
          type: 'payment_awaiting_approval',
          clientId: user.uid, // Include the client's user ID
        };

        const userProfile = await this.firebaseService.getUserProfile(user.uid);
        // Add client's GCash number to notification data
        if (userProfile && userProfile['gcashNumber']) {
          notificationData.clientGcashNumber = userProfile['gcashNumber'];
        }
        // notificationData.clientName = userName; // Do not include clientName, only UID

        // Deduplication check: only create notification if not already present
        const notificationsRef = collection(this.firestore, 'notifications');
        const dupeQuery = query(
          notificationsRef,
          where('userId', '==', coachId),
          where('type', '==', 'payment'),
          where('paymentId', '==', paymentId),
          where('clientId', '==', user.uid)
        );
        const dupeSnapshot = await getDocs(dupeQuery);
        if (dupeSnapshot.empty) {
          // Calculate the per-attendee fee for the message
          const perAttendeeFee =
            (this.paymentDetails.venueFee + this.paymentDetails.coachFee) /
            this.maxStudents;
          
          // Update the notification data to include the per-attendee fee
          notificationData.perAttendeeFee = perAttendeeFee;
          notificationData.totalAmount = this.paymentDetails.amount;
          
          await this.notificationService.createNotification({
            userId: coachId,
            type: 'payment',
            title: 'New Payment Received',
            message: `${user.uid} paid ₱${perAttendeeFee.toFixed(2)} for ${this.paymentDetails.className}`,
            data: notificationData,
          });
          console.log(
            'Notification created successfully with booking and application IDs'
          );
        } else {
          console.log('Duplicate payment notification detected, not creating.');
        }
      } else {
        console.warn('No coachId available, skipping notification');
      }

      // 3. Show success message and navigate
      await loading.dismiss();
      this.isSubmitting = false;
      console.log('Showing success message...');
      await this.showPaymentSuccess();
    } catch (error: any) {
      console.error('Error in submitPayment:', error);

      // Log the full error object for debugging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', error);
      }

      await loading.dismiss();
      this.isSubmitting = false;

      // Show more specific error message
      const errorMessage =
        error?.message || 'Failed to submit payment. Please try again.';
      this.showToast(errorMessage, 'danger');
    }
  }

  async showPaymentSuccess() {
    try {
      console.log('Showing payment success dialog');
      const alert = await this.alertCtrl.create({
        header: 'Payment Submitted',
        message:
          'Your payment has been submitted for verification. You will be notified once it is approved.',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              console.log('Navigating to home after successful payment');
              // Reset form
              this.receiptImage = null;
              this.receiptFile = null;
              this.receiptFileName = '';
              // Navigate to home
              this.router.navigate(['/client/tabs/home']);
            },
          },
        ],
      });

      await alert.present();
      console.log('Success dialog shown');
    } catch (error) {
      console.error('Error showing success dialog:', error);
      // Fallback to simple navigation if alert fails
      this.router.navigate(['/client/tabs/home']);
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    try {
      console.log(`Showing toast (${color}):`, message);
      const toast = await this.toastCtrl.create({
        message: message,
        duration: 5000, // Increased duration for better visibility
        position: 'bottom',
        color: color,
        buttons: [
          {
            icon: 'close',
            role: 'cancel',
          },
        ],
      });
      await toast.present();
    } catch (error) {
      console.error('Error showing toast:', error);
      // Fallback to console if toast fails
      console[
        color === 'danger' ? 'error' : color === 'warning' ? 'warn' : 'log'
      ](message);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  toggleTerms() {
    this.showTerms = !this.showTerms;
  }

  async copyGcashNumber(gcashNumber: string) {
    if (!gcashNumber) return;
    try {
      if (navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(gcashNumber);
      } else {
        // Fallback for Capacitor Clipboard if available
        await Clipboard.write({ string: gcashNumber });
      }
      this.showToast('GCash number copied!', 'success');
    } catch (e) {
      this.showToast('Failed to copy GCash number', 'danger');
    }
  }
}
