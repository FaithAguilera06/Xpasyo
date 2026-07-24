import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  serverTimestamp, 
  writeBatch
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

export interface Notification {
  id?: string;
  type: 'payment' | 'system' | 'booking' | 'paymentupdate';
  title: string;
  message: string;
  userId: string;
  data?: {
    paymentId?: string;
    bookingId?: string;
    action?: string;
    className?: string;
    date?: string;
    time?: string;
    amount?: number;
    paymentProof?: string;
    [key: string]: any;
  };
  status: 'unread' | 'read' | 'deleted';
  createdAt: any;
  readAt?: any;
  deletedAt?: any;
  updatedAt?: any;
  formattedDate?: string;
  formattedTime?: string;

  // Add index signature for template access
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  // Get current authenticated user
  async getCurrentUser() {
    const user = await firstValueFrom(authState(this.auth));
    return user;
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const newNotification: Omit<Notification, 'id'> = {
        ...notification,
        status: 'unread',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(
        collection(this.firestore, 'notifications'),
        newNotification
      );
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a specific user
  async getUserNotifications(userId: string, status?: 'unread' | 'read'): Promise<Notification[]> {
    try {
      const conditions = [
        where('userId', '==', userId)
      ];
      
      if (status) {
        conditions.push(where('status', '==', status));
      }
      
      const q = query(
        collection(this.firestore, 'notifications'),
        ...conditions
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }
  
  // Get coach notifications with payment status from paymentSubmissions
  async getCoachNotifications(userId: string): Promise<Notification[]> {
    try {
      // First get all coach applications for this user
      const coachAppsQuery = query(
        collection(this.firestore, 'coachApplications'),
        where('coachId', '==', userId)
      );
      
      const coachAppsSnapshot = await getDocs(coachAppsQuery);
      const coachAppIds = coachAppsSnapshot.docs.map(doc => doc.id);
      
      if (coachAppIds.length === 0) return [];
      
      // Then get all payment submissions for these coach applications
      const paymentsQuery = query(
        collection(this.firestore, 'paymentSubmissions'),
        where('classId', 'in', coachAppIds)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentStatusMap = new Map<string, any>();
      
      paymentsSnapshot.forEach(doc => {
        const data = doc.data() as { [key: string]: any };
        if (data['classId']) {
          paymentStatusMap.set(data['classId'], {
            status: data['status'] || 'pending',
            message: data['message'] || '',
            paymentId: doc.id
          });
        }
      });
      
      // Now get the notifications and update their status based on paymentSubmissions
      const notifications = await this.getUserNotifications(userId);
      
      return notifications.map(notification => {
        // For payment notifications, update status based on paymentSubmissions
        if (notification.type === 'payment' && notification.data) {
          const classId = notification.data['classId'];
          if (classId && paymentStatusMap.has(classId)) {
            const paymentStatus = paymentStatusMap.get(classId);
            const isPaid = paymentStatus.status === 'paid';
            const isRejected = paymentStatus.status === 'rejected';
            
            // Update the notification message based on payment status
            let message = notification.message;
            if (isPaid) {
              message = 'Payment received and verified';
            } else if (isRejected) {
              message = paymentStatus.message || 'Payment was rejected';
            } else {
              message = paymentStatus.message || 'Payment status updated';
            }
            
            return {
              ...notification,
              message: message,
              data: {
                ...notification.data,
                status: paymentStatus.status,
                message: message,
                paymentId: paymentStatus.paymentId || notification.data['paymentId']
              }
            };
          }
        }
        return notification;
      });
    } catch (error) {
      console.error('Error getting coach notifications with payment status:', error);
      return [];
    }
  }

  // Alias for getCoachNotifications to match component usage
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications = await this.getCoachNotifications(userId);
      // Filter out deleted notifications and ensure consistent data structure
      return notifications.filter(notification => notification['status'] !== 'deleted').map(notification => {
        // Ensure data object exists
        const data = notification['data'] || {};
        // Only use root-level status for read/unread logic
        const status = notification['status'] || 'unread';
        return {
          ...notification,
          status: status,
          data: {
            ...data,
            action: data['action'] || ''
          }
        } as Notification;
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  // Mark a notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(this.firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Handle payment action (approve/reject)
  // Delete a notification
  async deleteNotification(notificationId: string | undefined): Promise<void> {
    if (!notificationId) {
      console.error('Cannot delete notification: No ID provided');
      return;
    }
    
    try {
      const notificationRef = doc(this.firestore, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async handlePaymentAction(notificationId: string, action: 'approve' | 'reject'): Promise<void> {
    console.log(`[handlePaymentAction] Starting ${action} for notification:`, notificationId);
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    const notificationDoc = await getDoc(notificationRef);
    
    if (!notificationDoc.exists()) {
      console.error(`[handlePaymentAction] Notification ${notificationId} not found`);
      throw new Error('Notification not found');
    }
    
    const notification = notificationDoc.data() as Notification;
    console.log('[handlePaymentAction] Notification data:', JSON.stringify(notification, null, 2));
    
    // Extract data from notification
    const notificationData = notification.data || {};
    const paymentId = notificationData['paymentId'];
    const clientId = notificationData['clientId'];
    const sessionId = notificationData['sessionId'];
    const bookingId = notificationData['bookingId'];
    const classId = notificationData['classId']; // For coach venue fee payments
    const className = notificationData['className'];
    const amount = notificationData['amount'];
    
    // Determine if this is a coach venue fee payment or client payment
    const isCoachVenuePayment = classId && !paymentId;
    const isClientPayment = paymentId && !classId;
    
    if (isCoachVenuePayment) {
      // Handle coach venue fee payment approval
      await this.handleCoachVenuePaymentAction(notificationId, action, notificationData);
    } else if (isClientPayment) {
      // Handle client payment approval
      await this.handleClientPaymentAction(notificationId, action, notificationData);
    } else {
      console.error('[handlePaymentAction] Unable to determine payment type:', notificationData);
      throw new Error('Unable to determine payment type');
    }
  }

  // Handle coach venue fee payment approval/rejection
  private async handleCoachVenuePaymentAction(notificationId: string, action: 'approve' | 'reject', notificationData: any): Promise<void> {
    const classId = notificationData['classId'];
    const coachId = notificationData['coachId'];
    const className = notificationData['className'];
    
    console.log(`[handleCoachVenuePaymentAction] ${action}ing coach venue payment for class:`, classId);
    
    const batch = writeBatch(this.firestore);
    
    // 1. Update the notification status
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    const updateData: any = {
      'status': 'read',
      'readAt': serverTimestamp(),
      'updatedAt': serverTimestamp(),
      'data': {
        ...notificationData,
        status: action === 'approve' ? 'approved' : 'rejected',
        action: `venue_payment_${action}ed`
      }
    };
    batch.update(notificationRef, updateData);
    
    // 2. Update the coach application status
    const coachApplicationRef = doc(this.firestore, 'coachApplications', classId);
    const coachApplicationSnap = await getDoc(coachApplicationRef);
    
    if (coachApplicationSnap.exists()) {
      const updateFields: any = {
        paymentStatus: action === 'approve' ? 'paid' : 'rejected',
        updatedAt: serverTimestamp()
      };
      
      // If approved, also update the main status to 'active'
      if (action === 'approve') {
        updateFields.status = 'active';
      }
      
      batch.update(coachApplicationRef, updateFields);
      console.log(`[handleCoachVenuePaymentAction] Updated coach application ${classId} status to '${action === 'approve' ? 'active' : 'rejected'}'`);
    } else {
      console.warn(`[handleCoachVenuePaymentAction] Coach application ${classId} not found`);
    }
    
    try {
      await batch.commit();
      console.log(`[handleCoachVenuePaymentAction] Successfully ${action}ed coach venue payment for class ${classId}`);
      // Do NOT create a new notification. Only update the original notification with the result.
      // If you want to update the title/message, you can do so here:
      await updateDoc(notificationRef, {
        title: `Venue Payment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: action === 'approve'
          ? `Your venue payment for ${className} has been approved! Your class is now active and available for client bookings.`
          : `Your venue payment for ${className} was rejected. Reason: ${notificationData.adminMessage || 'No reason provided.'}`
      });

    

      // Send a simple notification to the coach about the result
      if (coachId) {
        // Get coach name from the original notification data or fetch from user document
        let coachName = notificationData['coachName'];
        if (!coachName) {
          try {
            const userDocRef = doc(this.firestore, 'users', coachId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              coachName = userData['name'] || userData['displayName'] || 'Coach';
            }
          } catch (error) {
            console.error('Error fetching coach name:', error);
            coachName = 'Coach';
          }
        }

        // Check for existing venue payment result notification for this coach and class
        const notificationsRef = collection(this.firestore, 'notifications');
        const q = query(
          notificationsRef,
          where('userId', '==', coachId),
          where('data.classId', '==', classId),
          where('data.type', '==', 'venue_payment_result')
        );
        const querySnapshot = await getDocs(q);

        const notificationDataToSend = {
          classId,
          className,
          coachName,
          action: `venue_payment_${action}ed`,
          type: 'venue_payment_result',
          date: notificationData['date'],
          time: notificationData['time']
        };

        if (!querySnapshot.empty) {
          // Update the existing notification
          const oldNotifId = querySnapshot.docs[0].id;
          await updateDoc(doc(this.firestore, 'notifications', oldNotifId), {
            title: `Venue Payment ${action === 'approve' ? 'Accepted' : 'Rejected'}`,
            message: action === 'approve'
              ? `Congratulations! Your venue payment for ${className} was accepted. Your class is now active.`
              : `Sorry, your venue payment for ${className} was rejected. Please check the details or contact support.`,
            data: notificationDataToSend,
            updatedAt: serverTimestamp(),
            status: 'unread',
          });
        } else {
          // Create a new notification
        await this.createNotification({
          userId: coachId,
            type: 'system',
            title: `Venue Payment ${action === 'approve' ? 'Accepted' : 'Rejected'}`,
            message: action === 'approve'
              ? `Congratulations! Your venue payment for ${className} was accepted. Your class is now active.`
              : `Sorry, your venue payment for ${className} was rejected. Please check the details or contact support.`,
            data: notificationDataToSend
        });
      }
      }
    } catch (error) {
      console.error(`[handleCoachVenuePaymentAction] Error ${action}ing coach venue payment:`, error);
      throw error;
    }
  }

  // Handle client payment approval/rejection
  private async handleClientPaymentAction(notificationId: string, action: 'approve' | 'reject', notificationData: any): Promise<void> {
    const paymentId = notificationData['paymentId'];
    const clientId = notificationData['clientId'];
    const sessionId = notificationData['sessionId'];
    const bookingId = notificationData['bookingId'];
    const className = notificationData['className'];
    const amount = notificationData['amount'];
    
    console.log(`[handleClientPaymentAction] ${action}ing client payment:`, paymentId);
    
    if (!paymentId) {
      console.error('[handleClientPaymentAction] Payment ID not found in notification data:', notificationData);
      throw new Error('Payment ID not found in notification data');
    }
    
    const batch = writeBatch(this.firestore);
    
    // 1. Update the notification status
    const notificationRef = doc(this.firestore, 'notifications', notificationId);
    const updateData: any = {
      'status': 'read',
      'readAt': serverTimestamp(),
      'updatedAt': serverTimestamp(),
      'data': {
      ...notificationData,
        status: action === 'approve' ? 'approved' : 'rejected',
        action: `client_payment_${action}ed`
      }
    };
    batch.update(notificationRef, updateData);
    
    // 2. Update the payment document
    const paymentRef = doc(this.firestore, 'payments', paymentId);
    batch.update(paymentRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      updatedAt: serverTimestamp(),
      reviewedAt: serverTimestamp()
    });
    
    // 3. Update the booking status in sessionBookings if it exists
    if (bookingId) {
      const sessionBookingRef = doc(this.firestore, 'sessionBookings', bookingId);
      const sessionBookingSnap = await getDoc(sessionBookingRef);
      
      if (sessionBookingSnap.exists()) {
        batch.update(sessionBookingRef, {
          status: action === 'approve' ? 'Paid' : 'Rejected',
          updatedAt: serverTimestamp()
        });
      } else {
        console.warn(`[handleClientPaymentAction] Booking ${bookingId} not found in sessionBookings`);
      }
    }
    
    try {
      await batch.commit();
      console.log(`[handleClientPaymentAction] Successfully ${action}d client payment ${paymentId}`);
      
      // Send notification to client if clientId is available
      if (clientId) {
        const message = action === 'approve' 
          ? `Your payment for ${className} has been approved!`
          : `Your payment for ${className} has been rejected. Please contact support for assistance.`;
          
        await this.createNotification({
          userId: clientId,
          type: 'paymentupdate',
          title: `Payment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          message: message,
          data: {
            paymentId: paymentId,
            status: action,
            className: className,
            amount: amount
          },
          read: false,
          status: 'unread',
          createdAt: new Date()
        });
      }
      
    } catch (error) {
      console.error(`[handleClientPaymentAction] Error ${action}ing client payment:`, error);
      throw error;
    }
  }

  // Notify coach about new payment
  async notifyCoachAboutPayment(coachId: string, paymentId: string, className: string, studentName: string, bookingId: string = ''): Promise<void> {
    try {
      await this.createNotification({
        userId: coachId,
        title: 'New Payment Received',
        message: `${studentName} has submitted a payment for ${className}. Tap to review.`,
        type: 'payment',
        data: { 
          paymentId, 
          bookingId: bookingId || '',
          type: 'payment_awaiting_approval',
          action: 'payment_received',
          className
        }
      });
    } catch (error) {
      console.error('Error notifying coach:', error);
      throw error;
    }
  }

  // Notify client about payment status
  async notifyClientAboutPaymentStatus(
    userId: string, 
    className: string, 
    isApproved: boolean,
    paymentId?: string,
    bookingId?: string
  ): Promise<void> {
    try {
      const status = isApproved ? 'approved' : 'rejected';
      const notificationData: any = { 
        type: 'payment_status_update', 
        status,
        action: `payment_${status}`
      };

      // Only add paymentId and bookingId if they are provided
      if (paymentId) notificationData.paymentId = paymentId;
      if (bookingId) notificationData.bookingId = bookingId;

      await this.createNotification({
        userId,
        title: `Payment ${status}`,
        message: `Your payment for ${className} has been ${status}.`,
        type: 'payment',
        data: notificationData
      });
    } catch (error) {
      console.error('Error notifying client:', error);
      // Don't rethrow the error to prevent breaking the payment flow
      // Just log it and continue
    }
  }

  // Notify coach about venue payment submission (coach-centric message)
  async notifyCoachVenuePaymentSubmitted(coachId: string, className: string, classId: string) {
    try {
      await this.createNotification({
        userId: coachId,
        title: 'Venue Payment Submitted',
        message: `You submitted a venue payment for ${className}. Awaiting owner confirmation.`,
        type: 'payment',
        data: {
          classId,
          className,
          type: 'venue_payment_awaiting_approval',
          action: 'venue_payment_submitted'
        }
      });
    } catch (error) {
      console.error('Error notifying coach of venue payment submission:', error);
      throw error;
    }
  }

  // Send coach booking notification to PHP backend
  async sendBookingNotificationToPhp(
    gymName: string,
    coachName: string,
    className: string,
    day: string,
    time: string,
    date: string
  ): Promise<void> {
    try {
      const notification = {
        type: 'booking',
        title: 'New Coach Booking',
        message: `Coach "${coachName}" booked your class '${className}'`,
        data: {
          gymName: gymName,
          coachName: coachName,
          className: className,
          day: day,
          time: time,
          date: date,
          action: 'new_coach_booking'
        }
      };

      // Send to PHP endpoint
      await this.sendToPhpBackend(notification);
    } catch (error) {
      console.error('Error sending booking notification to PHP backend:', error);
      // Don't fail the whole booking submission if notification fails
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
          action: notification.data?.action || 'new_notification',
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

  /**
   * Get real-time unread notification count for a user
   */
  getUnreadNotificationCount(userId: string): Observable<number> {
    const notificationsRef = collection(this.firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('status', '==', 'unread')
    );
    // Use collectionData to get real-time updates
    return collectionData(q, { idField: 'id' }).pipe(
      // Map to the count of unread notifications
      map((notifications: any[]) => notifications.length)
    );
  }

  async sendReminder(userId: string, className: string, classId?: string, classDate?: string, coachName?: string): Promise<void> {
    // Create a notification for the client to appear in their notification tab
    try {
      const message = `Payment Reminder from Coach: ${coachName || 'Coach'} for ${className || 'a class'}.`;
      const notificationId = await this.createNotification({
        type: 'system',
        title: '⚠️ Payment Reminder',
        message: message,
        userId: userId,
        data: { 
          className,
          classId,
          classDate,
          coachName,
          classTime: classDate ? new Date(classDate).toLocaleTimeString() : '',
          action: 'payment_reminder',
          type: 'reminder'
        },
      });
      console.log('Reminder notification created successfully with ID:', notificationId);
    } catch (error) {
      console.error('Error sending reminder notification:', error);
      throw error;
    }
  }
}
