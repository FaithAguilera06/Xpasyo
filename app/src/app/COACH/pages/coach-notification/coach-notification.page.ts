import { Component, OnInit } from '@angular/core';
import {
  AlertController,
  IonicModule,
  LoadingController,
  ToastController,
  RefresherCustomEvent,
  ModalController,
  ActionSheetController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NotificationService } from 'src/app/services/notification.service';
import { PaymentService } from 'src/app/services/payment.service';
import { firstValueFrom } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { Timestamp } from '@angular/fire/firestore';
import {
  Firestore,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from '@angular/fire/firestore';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http';


// Define the Notification interface
export interface Notification {
  id?: string;
  type: 'payment' | 'system' | 'booking' | 'paymentupdate' | 'payment_update';
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
    clientId?: string;
    clientGcashNumber?: string;
    [key: string]: any;
  };
  status: 'unread' | 'read' | 'deleted';
  createdAt: Timestamp | any;
  readAt?: Timestamp | any;
  deletedAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  formattedDate?: string;
  formattedTime?: string;
  formattedRelativeTime?: string;
  latestClientName?: string;
  showDetails?: boolean; // Added for expandable notifications
  action?: string; // For spread data fields
  className?: string; // For spread data fields
  gymName?: string; // For spread data fields
  classId?: string; // For spread data fields
}

@Component({
  selector: 'app-coach-notification',
  templateUrl: './coach-notification.page.html',
  styleUrls: ['./coach-notification.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, LucideIconsModule],
})
export class CoachNotificationPage implements OnInit {
  notifications: Notification[] = [];
  clientGcashNumber: string = 'Loading...';
  previewImageUrl: string = '';
  isImagePreviewOpen: boolean = false;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private http: HttpClient // <-- Inject HttpClient
  ) {}

  async ngOnInit() {
    await this.loadNotifications();
  }

  /**
   * Load notifications for the current user
   */
  async loadNotifications(event?: RefresherCustomEvent) {
    try {
      const currentUser = await firstValueFrom(authState(this.auth));
      if (!currentUser?.uid) return;

      const loading = await this.loadingCtrl.create({
        message: 'Loading notifications...',
        spinner: 'crescent',
      });
      await loading.present();

      const notifications = await this.notificationService.getNotifications(
        currentUser.uid
      );

      // Sort notifications by createdAt descending (latest first)
      notifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      // Debug log for all notifications received by the coach
      console.log('All notifications for coach:', notifications);
      // Fetch latest client names for notifications with clientId
      this.notifications = notifications;

      // Fetch gymName for approved venue payment notifications
      await Promise.all(
        this.notifications.map(async (notif) => {
          if (notif.action === 'venue_payment_approved' && notif.classId) {
            try {
              const classDocRef = doc(this.firestore, 'coachApplications', notif.classId);
              const classDocSnap = await getDoc(classDocRef);
              if (classDocSnap.exists()) {
                const classData = classDocSnap.data();
                notif.gymName = classData['gymName'] || '';
              }
            } catch (e) {
              notif.gymName = '';
            }
          }
        })
      );

      this.notifications = await Promise.all(
        this.notifications.map(async (notification) => {
          // Debug log for payment-related notifications
          if (notification.type === 'payment' || notification.type === 'paymentupdate') {
            console.log('Coach received payment notification:', notification);
          }
          const clientId = notification.data ? notification.data['clientId'] : undefined;
          let latestClientName = undefined;
          if (clientId) {
            try {
              const userDocRef = doc(this.firestore, 'users', clientId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                latestClientName = userData['name'] || 'User';
              }
            } catch (e) {
              latestClientName = undefined;
            }
          }
          let date: Date;
          if (notification.updatedAt?.toDate) {
            date = notification.updatedAt.toDate();
          } else if (typeof notification.updatedAt === 'string') {
            date = new Date(notification.updatedAt);
          } else if (notification.updatedAt?.seconds) {
            date = new Date(notification.updatedAt.seconds * 1000);
          } else if (notification.createdAt?.toDate) {
            date = notification.createdAt.toDate();
          } else if (typeof notification.createdAt === 'string') {
            date = new Date(notification.createdAt);
          } else if (notification.createdAt?.seconds) {
            date = new Date(notification.createdAt.seconds * 1000);
          } else {
            date = new Date();
          }
          if (isNaN(date.getTime())) {
            date = new Date();
          }
          return {
            ...notification,
            latestClientName,
            formattedRelativeTime: date ? this.formatRelativeTime(date) : '',
            formattedDate: `updatedAt\n${this.formatFullDateTime(date)}`,
          };
        })
      );

      if (event) {
        event.target.complete();
      }
      await loading.dismiss();
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.showToast('Failed to load notifications', 'danger');
      if (event) {
        event.target.complete();
      }
    }
  }

  /**
   * Handle refresh event
   */
  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadNotifications(event);
  }

  /**
   * Format a date as relative time (e.g., '2m', '1h', '3d', 'now')
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  }

  /**
   * Handle notification click
   */
  async handleNotification(notification: Notification) {
    if (
      notification.type === 'payment' &&
      this.getNotificationData(notification, 'paymentId')
    ) {
      await this.showPaymentActions(notification);
    }
  }

  /**
   * Show payment action sheet
   */
  async showPaymentActions(notification: Notification) {
    const paymentId = this.getNotificationData(notification, 'paymentId');
    if (!paymentId) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Payment Actions',
      buttons: [
        {
          text: 'View Details',
          handler: () => this.toggleNotificationDetails(notification),
        },
        {
          text: 'Approve Payment',
          handler: () => this.handlePaymentAction(notification, 'approve'),
        },
        {
          text: 'Reject Payment',
          handler: () => this.handlePaymentAction(notification, 'reject'),
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.handleDeleteNotification(notification),
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  /**
   * Toggle notification details expansion
   */
  toggleNotificationDetails(notification: Notification) {
    notification.showDetails = !notification.showDetails;

    // If expanding and it's a payment notification, load client GCash number
    if (notification.showDetails && (notification.type === 'payment' || notification.type === 'paymentupdate')) {
      this.getClientGcashNumber(notification).then(number => {
        this.clientGcashNumber = number;
      });
    }

    // Mark as read if it was unread and is now expanded
    if (notification.showDetails && notification.status === 'unread' && notification.id) {
      notification.status = 'read';
      this.notificationService.markAsRead(notification.id);
    }
  }

  /**
   * View booking details (navigate to booking page)
   */
  async viewBookingDetails(notification: Notification) {
    const bookingId = this.getNotificationData(notification, 'bookingId');
    const sessionId = this.getNotificationData(notification, 'sessionId');
    
    if (bookingId) {
      // Navigate to booking details page
      // You can implement navigation logic here
      console.log('Viewing booking details:', bookingId);
    }
  }

  /**
   * View payment proof in full screen (view only, no download)
   */
  openImagePreview(imageUrl: string | null) {
    if (!imageUrl) return;
    // Implement your modal or overlay logic here
    // Example: set previewImageUrl and isImagePreviewOpen
    this.previewImageUrl = this.getImageSource(imageUrl);
    this.isImagePreviewOpen = true;
  }

  closeImagePreview() {
    this.isImagePreviewOpen = false;
    this.previewImageUrl = '';
  }

  /**
   * Get the appropriate icon for a notification
   */
  getNotificationIcon(notification: Notification): string {
    switch (notification.type) {
      case 'payment':
        return 'cash-outline';
      case 'booking':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  }

  /**
   * Get the appropriate color for a notification icon
   */
  getNotificationColor(notification: Notification): string {
    if (notification.status === 'unread') return 'primary';
    return 'medium';
  }

  /**
   * Get the color for a payment status badge
   */
  getPaymentStatusColor(notification: Notification): string {
    const status =
      this.getNotificationData(notification, 'status') || 'pending';
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'cancelled':
      case 'deleted':
        return 'medium';
      default:
        return 'warning';
    }
  }

  /**
   * Get the text for a payment status badge
   */
  getPaymentStatusText(notification: Notification): string {
    const status =
      this.getNotificationData(notification, 'status') || 'pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Get the icon for a payment status
   */
  getPaymentStatusIcon(notification: Notification): string {
    const status =
      this.getNotificationData(notification, 'status') || 'pending';
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'cancelled':
      case 'deleted':
        return 'trash';
      default:
        return 'time';
    }
  }

  /**
   * Track by function for ngFor
   */
  trackByFn(index: number, item: Notification): string {
    return item.id || index.toString();
  }

  /**
   * Handle image loading errors
   */
  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.style.display = 'none';
    }
  }

  /**
   * Show a toast message
   */
  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  // Add this method to format the createdAt time as 'h:mm a' (e.g., '6:18 PM')
  getTimeCreated(notification: Notification): string {
    const date = notification.createdAt?.toDate ? notification.createdAt.toDate() : null;
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  getNotificationData(notification: Notification, key: string): any {
    return notification.data?.[key];
  }

  getImageSource(imageData: string | null): string {
    if (!imageData) return '';
    // If it's already a data URL, return as is
    if (imageData.startsWith('data:')) {
      return imageData;
    }
    // If it's a URL, return as is
    if (imageData.startsWith('http')) {
      return imageData;
    }
    // If it's base64 data, add the data URL prefix
    return `data:image/jpeg;base64,${imageData}`;
  }

  getPaymentStatusBadgeStyle(notification: Notification): any {
    const status = this.getNotificationData(notification, 'status') || 'pending';
    switch (status) {
      case 'approved':
        return {
          background: '#e6ffed', // soft green
          color: '#218838',
          border: '1px solid #b7f5c5',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          borderRadius: '6px',
          padding: '4px 10px',
          boxShadow: 'none',
        };
      case 'rejected':
        return {
          background: '#ffeaea', // soft red
          color: '#c82333',
          border: '1px solid #ffb3b3',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          borderRadius: '6px',
          padding: '4px 10px',
          boxShadow: 'none',
        };
      case 'pending':
      default:
        return {
          background: '#fffbe6', // soft yellow
          color: '#bfa100',
          border: '1px solid #ffe066',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          borderRadius: '6px',
          padding: '4px 10px',
          boxShadow: 'none',
        };
    }
  }

  /**
   * Get client's GCash number from notification data or fetch from user profile
   */
  async getClientGcashNumber(notification: Notification): Promise<string> {
    // First try to get from notification data
    const gcashNumber = this.getNotificationData(notification, 'clientGcashNumber');
    if (gcashNumber) {
      return gcashNumber;
    }

    // If not in notification data, try to fetch from user profile
    const clientId = this.getNotificationData(notification, 'clientId');
    if (clientId) {
      try {
        const userDocRef = doc(this.firestore, 'users', clientId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          return userData['gcashNumber'] || 'N/A';
        }
      } catch (error) {
        console.error('Error fetching client GCash number:', error);
      }
    }

    return 'N/A';
  }

  /**
   * Format payment date and time in a readable format
   */
  formatPaymentDateTime(notification: Notification): string {
    try {
      const date = this.getNotificationData(notification, 'date');
      const time = this.getNotificationData(notification, 'time');

      // If time is a full date-time string, just format and return it
      if (time && !isNaN(Date.parse(time))) {
        const dt = new Date(time);
        return this.formatDate(dt) + ' at ' + this.formatTime(dt);
      }

      // If both date and time are present and time is just a time string
      if (date && time) {
        const formattedDate = this.formatDate(date);
        const formattedTime = this.formatTime(time);
        return `${formattedDate} at ${formattedTime}`;
      }

      // Fallback to notification creation time
      const createdAt = notification.createdAt;
      if (createdAt) {
        const dt = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
        return this.formatDate(dt) + ' at ' + this.formatTime(dt);
      }

      return 'N/A';
    } catch (error) {
      console.error('Error formatting payment date time:', error);
      return 'N/A';
    }
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }

  private formatTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatFullDateTime(date: Date): string {
    // Format: 10 July 2025 at 18:20:40 UTC+8
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    // Get timezone offset in hours
    const tzOffset = -date.getTimezoneOffset() / 60;
    const tzString = `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`;
    return `${day} ${month} ${year} at ${hours}:${minutes}:${seconds} ${tzString}`;
  }

  // Add this method to mark a single notification as read
  async markNotificationAsRead(notification: Notification) {
    if (notification.status === 'unread' && notification.id) {
      try {
        await this.notificationService.markAsRead(notification.id);
        notification.status = 'read';
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => n.status === 'unread').length;
  }

  // Use AlertController for a popup confirmation before deleting all notifications
  async showBulkDeleteOptions() {
    const alert = await this.alertCtrl.create({
      header: 'Delete All Notifications',
      message: 'Are you sure you want to delete all notifications?',
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Yes',
          role: 'destructive',
          handler: () => {
            this.deleteAllNotifications();
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications() {
    if (this.notifications.length === 0) {
      this.showToast('No notifications to delete', 'warning');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Delete All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete All',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting all notifications...',
              spinner: 'crescent',
            });
            await loading.present();
            try {
              // Delete all notifications in parallel
              const deletePromises = this.notifications.map(n => n.id ? this.notificationService.deleteNotification(n.id) : Promise.resolve());
              await Promise.all(deletePromises);
              this.notifications = [];
              await loading.dismiss();
              this.showToast('All notifications deleted successfully');
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              await loading.dismiss();
              this.notifications = [];
              this.showToast('Some notifications may not have been deleted. Please refresh.', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Delete read notifications
   */
  async deleteReadNotifications() {
    const readNotifications = this.notifications.filter(n => n.status === 'read');
    
    if (readNotifications.length === 0) {
      this.showToast('No read notifications to delete', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Delete Read Notifications',
      message: `Are you sure you want to delete ${readNotifications.length} read notifications?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete Read',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting read notifications...',
              spinner: 'crescent',
            });
            await loading.present();

            try {
              // Delete read notifications
              for (const notification of readNotifications) {
                if (notification.id) {
                  await this.notificationService.deleteNotification(notification.id);
                }
              }
              
              // Remove from local array
              this.notifications = this.notifications.filter(n => n.status !== 'read');
              await loading.dismiss();
              this.showToast(`${readNotifications.length} read notifications deleted`);
            } catch (error) {
              console.error('Error deleting read notifications:', error);
              await loading.dismiss();
              this.showToast('Failed to delete read notifications', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Delete unread notifications
   */
  async deleteUnreadNotifications() {
    const unreadNotifications = this.notifications.filter(n => n.status === 'unread');
    
    if (unreadNotifications.length === 0) {
      this.showToast('No unread notifications to delete', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Delete Unread Notifications',
      message: `Are you sure you want to delete ${unreadNotifications.length} unread notifications?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete Unread',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting unread notifications...',
              spinner: 'crescent',
            });
            await loading.present();

            try {
              // Delete unread notifications
              for (const notification of unreadNotifications) {
                if (notification.id) {
                  await this.notificationService.deleteNotification(notification.id);
                }
              }
              
              // Remove from local array
              this.notifications = this.notifications.filter(n => n.status !== 'unread');
              await loading.dismiss();
              this.showToast(`${unreadNotifications.length} unread notifications deleted`);
            } catch (error) {
              console.error('Error deleting unread notifications:', error);
              await loading.dismiss();
              this.showToast('Failed to delete unread notifications', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Robustly detect payment update notifications (handles both 'paymentupdate' and 'payment_update')
   */
  isPaymentUpdate(notification: Notification): boolean {
    const type = notification.type;
    if (type === 'paymentupdate' || type === 'payment_update') {
      const action = notification.data?.action;
      // Accept if action is correct, or fallback if title/message exist
      return (
        action === 'venue_payment_approved' ||
        action === 'venue_payment_rejected' ||
        !!notification.title ||
        !!notification.message
      );
    }
    return false;
  }

  /**
   * Handle deleting a single notification
   */
  async handleDeleteNotification(notification: Notification) {
    if (!notification.id) {
      this.showToast('Notification ID missing', 'danger');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Deleting notification...',
              spinner: 'crescent',
            });
            await loading.present();
            try {
              await this.notificationService.deleteNotification(notification.id);
              // Remove from local array
              this.notifications = this.notifications.filter(n => n.id !== notification.id);
              this.showToast('Notification deleted', 'success');
            } catch (error) {
              console.error('Error deleting notification:', error);
              this.showToast('Failed to delete notification', 'danger');
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Handle payment action (approve/reject) for a notification
   */
  async handlePaymentAction(notification: Notification, action: 'approve' | 'reject') {
    if (!notification.id) {
      this.showToast('Notification ID missing', 'danger');
      return;
    }
    const loading = await this.loadingCtrl.create({
      message: `${action === 'approve' ? 'Approving' : 'Rejecting'} payment...`,
      spinner: 'crescent',
    });
    await loading.present();
    try {
      await this.notificationService.handlePaymentAction(notification.id, action);
      // Optionally update local notification status
      notification.status = 'read';
      if (notification.data) {
        notification.data['status'] = action === 'approve' ? 'approved' : 'rejected';
      }
      this.showToast(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
    } catch (error) {
      console.error(`Error ${action}ing payment:`, error);
      this.showToast(`Failed to ${action} payment`, 'danger');
    } finally {
      await loading.dismiss();
    }
  }
}
