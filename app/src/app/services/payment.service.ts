import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  deleteField
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';

export interface PaymentData {
  userId: string;
  bookingId?: string; // Made optional
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

export interface CoachApplication {
  id?: string;
  userId: string;
  firstName: string;
  lastName: string;
  status: string;
  // Add other fields as needed
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  async submitPayment(paymentData: Omit<PaymentData, 'userId' | 'status' | 'createdAt' | 'updatedAt' | 'bookingId'> & { bookingId?: string; gcashNumber?: string }): Promise<string> {
    console.log('[PaymentService] Starting payment submission...');
    
    try {
      // Validate input data
      if (!paymentData) {
        throw new Error('Payment data is required');
      }
      
      // Log the incoming payment data (without sensitive info)
      const { paymentProof, ...loggableData } = paymentData as any;
      console.log('[PaymentService] Payment data received:', JSON.stringify({
        ...loggableData,
        paymentProof: paymentProof ? '***' : 'missing'
      }, null, 2));

      // Get current user
      console.log('[PaymentService] Getting current user...');
      const user = await firstValueFrom(authState(this.auth));
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('[PaymentService] User authenticated:', user.uid);

      // Validate required fields
      const requiredFields = ['amount', 'paymentProof', 'coachId'] as const;
      const missingFields = requiredFields.filter(field => !paymentData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Prepare payment document
      console.log('[PaymentService] Preparing payment document...');
      const payment: PaymentData = {
        ...paymentData,
        userId: user.uid,
        status: 'pending',
        paymentMethod: paymentData.paymentMethod || 'bank_transfer',
        serviceFee: 0, // Set to 0 as per requirements
        coachFee: Number(paymentData.coachFee) || 0,
        totalAmount: Number(paymentData.totalAmount) || Number(paymentData.amount) || 0,
        amount: Number(paymentData.amount) || 0,
        // bookingId will be included if it exists in paymentData
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Remove bookingId if it's undefined to avoid Firestore errors
      if (payment.bookingId === undefined) {
        delete payment.bookingId;
      }

      // Log the payment document to be saved
      console.log('[PaymentService] Payment document prepared:', JSON.stringify({
        ...payment,
        paymentProof: payment.paymentProof ? '***' : 'missing'
      }, null, 2));

      // Save to Firestore
      console.log('[PaymentService] Saving payment to Firestore...');
      const paymentsCollection = collection(this.firestore, 'payments');
      const docRef = await addDoc(paymentsCollection, payment);
      
      if (!docRef?.id) {
        throw new Error('Failed to get document reference after saving payment');
      }
      
      console.log('[PaymentService] Payment saved successfully with ID:', docRef.id);
      return docRef.id;
      
    } catch (error: any) {
      console.error('[PaymentService] Error in submitPayment:', error);
      
      // Log additional error details
      if (error instanceof Error) {
        console.error('[PaymentService] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('[PaymentService] Unknown error type:', error);
      }
      
      // Rethrow with a more descriptive message
      const errorMessage = error?.message || 'Failed to process payment';
      throw new Error(`Payment submission failed: ${errorMessage}`);
    }
  }

  async getCoachName(coachId: string): Promise<string> {
    try {
      // First try to get from coachApplications
      const coachAppQuery = query(
        collection(this.firestore, 'coachApplications'),
        where('userId', '==', coachId)
      );
      
      const coachAppSnapshot = await getDocs(coachAppQuery);
      
      if (!coachAppSnapshot.empty) {
        const coachApp = coachAppSnapshot.docs[0].data() as CoachApplication;
        return `${coachApp.firstName} ${coachApp.lastName}`.trim();
      }
      
      // Fallback to users collection if not found in coachApplications
      const userDoc = await getDoc(doc(this.firestore, 'users', coachId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData['displayName'] || userData['email'] || 'Unknown Coach';
      }
      
      return 'Unknown Coach';
    } catch (error) {
      console.error('Error getting coach name:', error);
      return 'Unknown Coach';
    }
  }

  async updatePaymentStatus(paymentId: string, status: 'approved' | 'rejected' | 'cancelled' | 'deleted'): Promise<void> {
    const paymentRef = doc(this.firestore, 'payments', paymentId);
    await updateDoc(paymentRef, {
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'approved' || status === 'rejected' ? { reviewedAt: serverTimestamp() } : {})
    });
  }

  async deletePayment(paymentId: string): Promise<void> {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const paymentRef = doc(this.firestore, 'payments', paymentId);
      // Note: In a real app, you might want to mark as deleted instead of actually deleting
      // to maintain data integrity. This is a simplified example.
      await updateDoc(paymentRef, {
        status: 'deleted',
        updatedAt: serverTimestamp()
      });

      console.log(`[PaymentService] Payment ${paymentId} marked as deleted`);
    } catch (error) {
      console.error(`[PaymentService] Error deleting payment ${paymentId}:`, error);
      throw error;
    }
  }
}
