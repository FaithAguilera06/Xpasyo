import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { Clipboard } from '@capacitor/clipboard';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  ToastController,
  NavController,
  LoadingController,
  AlertController,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Firestore,
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  DocumentReference,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface CoachPaymentDetails {
  className: string;
  date: string;
  time: string;
  location: string;
  venueFee: number;
  classId: string;
  gcashAccountNumber?: string;
  gcashAccountName?: string;
  ownerGcashNumber?: string;
  ownerGcashName?: string;
}

@Component({
  selector: 'app-coach-payment',
  templateUrl: './coach-payment.page.html',
  styleUrls: ['./coach-payment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    LucideIconsModule,
  ],
})
export class CoachPaymentPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  paymentDetails: CoachPaymentDetails = {
    className: '',
    date: '',
    time: '',
    location: '',
    venueFee: 0,
    classId: '',
  };

  receiptImage: string | ArrayBuffer | null = null;
  receiptFileName: string = '';
  isSubmitting: boolean = false;

  showFAQ = false;

  constructor(
    public route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: Auth,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    const classId = this.route.snapshot.paramMap.get('id');
    
    if (!classId) {
      this.showError('No class ID provided');
      return;
    }

    await this.loadClassDetails(classId);
  }

  async loadClassDetails(classId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Loading class details...',
    });
    await loading.present();

    try {
      const classDoc = await getDoc(
        doc(this.firestore, 'coachApplications', classId)
      );
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }

      const classData = classDoc.data();
      
      // Fetch owner's GCash information directly from coachApplications document
      let ownerGcashNumber = classData['gcashAccountNumber'] || '';
      let ownerGcashName = classData['gcashAccountName'] || '';

      // (Optional) Still fetch gym payment info for fallback, if needed
      let gcashAccountNumber = '';
      let gcashAccountName = '';
      if (classData['gymId']) {
        try {
          const gymDoc = await getDoc(doc(this.firestore, 'gyms', classData['gymId']));
          if (gymDoc.exists()) {
            const gymData = gymDoc.data();
            gcashAccountNumber = gymData?.['gymInfo']?.['paymentInfo']?.['gcashAccountNumber'] || '';
            gcashAccountName = gymData?.['gymInfo']?.['paymentInfo']?.['gcashAccountName'] || '';
          }
        } catch (gymError) {
          console.error('Error fetching gym payment info:', gymError);
        }
      }
      
      this.paymentDetails = {
        className: classData['className'] || 'Fitness Class',
        date: classData['date'] || '',
        time: classData['time'] || '',
        location: classData['gymName'] || 'Main Gym',
        venueFee: classData['venueFee'] || 0,
        classId: classId,
        gcashAccountNumber: gcashAccountNumber,
        gcashAccountName: gcashAccountName,
        ownerGcashNumber: ownerGcashNumber,
        ownerGcashName: ownerGcashName,
      };
    } catch (error) {
      console.error('Error loading class details:', error);
      this.showError('Failed to load class details');
    } finally {
      await loading.dismiss();
    }
  }

  selectFile() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.receiptFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        // Store the base64 string of the image
        this.receiptImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile() {
    this.receiptImage = null;
    this.receiptFileName = '';
    this.fileInput.nativeElement.value = '';
  }

  async submitPayment() {
    if (!this.receiptImage) {
      this.showError('Please upload a receipt');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Submitting payment...',
    });
    await loading.present();

    try {
      // Get the class document to check for existing submissionId
      const classDocRef = doc(
        this.firestore,
        'coachApplications',
        this.paymentDetails.classId
      );
      const classDoc = await getDoc(classDocRef);

      if (!classDoc.exists()) {
        throw new Error('Class document not found');
      }

      // Use existing submissionId or generate a new one if it doesn't exist
      const submissionId =
        classDoc.data()['submissionId'] ||
        doc(collection(this.firestore, '_')).id;

      // Update the payment status in Firestore with base64 image and submission ID
      await updateDoc(classDocRef, {
        paymentStatus: 'pending',
        paymentDate: new Date().toISOString(),
        paymentProof: this.receiptImage, // Store base64 image directly
        paymentReceipt: 'pending_verification', // Keep for backward compatibility
        paymentSubmittedAt: new Date().toISOString(),
        submissionId: submissionId, // Ensure submissionId is set
        updatedAt: new Date().toISOString(),
      });

      // Send notification to admin with the base64 image and submission ID
      await this.sendPaymentNotification(
        this.receiptImage as string,
        submissionId
      );

      const toast = await this.toastCtrl.create({
        message: 'Payment submitted! Your payment is pending verification.',
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      toast.present();

      // Navigate back to the class details
      this.router.navigate(['/coach/coach-class', this.paymentDetails.classId]);
    } catch (error) {
      console.error('Error submitting payment:', error);
      this.showError('Failed to submit payment');
    } finally {
      await loading.dismiss();
    }
  }

  private async sendPaymentNotification(
    paymentProof: string,
    submissionId: string
  ) {
    try {
      // Get current user
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }

      // Get class details
      const classDoc = await getDoc(
        doc(this.firestore, 'coachApplications', this.paymentDetails.classId)
      );
      if (!classDoc.exists()) {
        throw new Error('Class not found');
      }
      const classData = classDoc.data();

      // Send notification to admin
      const notification = {
        type: 'payment',
        title: 'New Venue Payment Submitted',
        message: `Coach ${
          currentUser.displayName || 'A coach'
        } has submitted a venue payment for ${this.paymentDetails.className}.`,
        userId: 'admin', // This should be the admin's user ID
        data: {
          classId: this.paymentDetails.classId,
          className: this.paymentDetails.className,
          coachId: currentUser.uid,
          coachName: currentUser.displayName || 'A coach',
          amount: this.paymentDetails.venueFee,
          paymentProof: paymentProof, // This is the base64 image string
          status: 'pending',
          submissionId: submissionId,
          date: this.paymentDetails.date,
          time: this.paymentDetails.time,
          location: this.paymentDetails.location,
        },
        status: 'unread' as const,
      };

      // Add notification to Firestore for admin
      await addDoc(collection(this.firestore, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also send to PHP endpoint
      await this.sendToPhpBackend(notification);
    } catch (error) {
      console.error('Error sending payment notification:', error);
      // Don't fail the whole payment submission if notification fails
    }
  }

  private async sendToPhpBackend(notification: any) {
    try {
      const phpEndpoint =
        'https://your-xpasyo-domain.com/XPASYO_DRAFT/pages/NOTIFICATION.php';

      const response = await fetch(phpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'new_payment_submission',
          notification: notification,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('PHP notification response:', data);
    } catch (error) {
      console.error('Error sending notification to PHP backend:', error);
    }
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  goBack() {
    this.router.navigate(['/coach/coach-class', this.paymentDetails.classId]);
  }

  async copyAccountNumber(accountNumber: string) {
    await Clipboard.write({ string: accountNumber });
    const toast = await this.toastCtrl.create({
      message: 'Account number copied!',
      duration: 1500,
      position: 'bottom'
    });
    toast.present();
  }
}
