import { Component, OnInit, inject } from '@angular/core';
import {
  IonicModule,
  LoadingController,
  ToastController,
  RefresherCustomEvent,
  AlertController,
} from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { NotificationService } from 'src/app/services/notification.service';
import { firstValueFrom } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { notificationsOffOutline, refresh } from 'ionicons/icons';

import {
  Timestamp,
  Firestore,
  collection,
  query,
  where,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
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
    coachId?: string;
    [key: string]: any;
  };
  status: 'unread' | 'read' | 'deleted';
  createdAt: Timestamp | any;
  readAt?: Timestamp | any;
  deletedAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  formattedDate?: string;
  formattedTime?: string;
  latestCoachName?: string;
  isOpen?: boolean; // Added isOpen property
}

// Icons are automatically registered in Ionic 7+

@Component({
  selector: 'app-notification',
  templateUrl: './notification.page.html',
  styleUrls: ['./notification.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, LucideIconsModule,LucideAngularModule],
  providers: [NotificationService],
})
export class NotificationPage implements OnInit {
  notifications: Notification[] = [];

  // Image preview overlay state
  isImagePreviewOpen = false;
  previewImageUrl: string | null = null;

  private firestore = inject(Firestore);

  constructor(
    private notificationService: NotificationService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private auth: Auth,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadNotifications();
  }

  // New method to fetch system notifications from Firestore
  private async loadSystemNotifications(
    userId: string
  ): Promise<Notification[]> {
    try {
      const notificationsRef = collection(this.firestore, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', 'system')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data['type'] as
            | 'system'
            | 'payment'
            | 'booking'
            | 'paymentupdate',
          title: data['title'],
          message: data['message'],
          userId: data['userId'],
          data: data['data'],
          status: data['status'] as 'unread' | 'read' | 'deleted',
          createdAt: data['createdAt'],
          readAt: data['readAt'],
          deletedAt: data['deletedAt'],
          updatedAt: data['updatedAt'],
        } as Notification;
      });
    } catch (error) {
      console.error('Error loading system notifications:', error);
      return [];
    }
  }

  async loadNotifications(event?: RefresherCustomEvent) {
    const loading = await this.loadingCtrl.create({
      message: 'Loading notifications...',
      spinner: 'crescent',
    });

    try {
      if (!event) {
        await loading.present();
      }

      const user = await firstValueFrom(authState(this.auth));
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Client notification page - Current user UID:', user.uid);

      // Load both regular and system notifications in parallel
      const [regularNotifications, systemNotifications] = await Promise.all([
        this.notificationService.getUserNotifications(user.uid),
        this.loadSystemNotifications(user.uid),
      ]);

      console.log('Regular notifications found:', regularNotifications.length);
      console.log('System notifications found:', systemNotifications.length);

      // Combine and deduplicate notifications
      const allNotifications = [
        ...regularNotifications,
        ...systemNotifications,
      ];
      const uniqueNotifications = Array.from(
        new Map(allNotifications.map((n) => [n.id, n])).values()
      );

      // Filter out deleted notifications
      const activeNotifications = uniqueNotifications.filter(
        (notification) => notification.status !== 'deleted'
      );

      // Sort notifications by createdAt descending (latest first)
      activeNotifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      // Format dates for display and initialize isOpen
      this.notifications = await Promise.all(activeNotifications.map(async (notification) => {
        // Use updatedAt if available, otherwise createdAt
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
        // Ensure date is valid
        if (isNaN(date.getTime())) {
          date = new Date();
        }
        return {
          ...notification,
          isOpen: false,
          formattedDate: `updatedAt\n${this.formatFullDateTime(date)}`,
        };
      }));

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

  toggleNotificationOpen(notification: Notification) {
    notification.isOpen = !notification.isOpen;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
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

  private async markNotificationsAsRead() {
    const unreadNotifications = this.notifications.filter(
      (n) => n.status === 'unread' && n.id
    );

    for (const notification of unreadNotifications) {
      if (notification.id) {
        try {
          await this.notificationService.markAsRead(notification.id);
          // Update local state
          const index = this.notifications.findIndex(
            (n) => n.id === notification.id
          );
          if (index > -1) {
            this.notifications[index].status = 'read';
          }
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
    }
  }

  hasReadNotifications(): boolean {
    return this.notifications.some((n) => n.status === 'read');
  }

  async deleteNotification(notificationId: string | undefined, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const loading = await this.loadingCtrl.create({
      message: 'Deleting notification...',
      spinner: 'crescent',
    });

    try {
      await loading.present();
      await this.notificationService.deleteNotification(notificationId);

      // Remove from local array
      this.notifications = this.notifications.filter(
        (n) => n.id !== notificationId
      );

      this.showToast('Notification deleted', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      this.showToast('Failed to delete notification', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async deleteAllReadNotifications() {
    const readNotifications = this.notifications.filter(
      (n) => n.status === 'read' && n.id
    );

    if (readNotifications.length === 0) {
      this.showToast('No read notifications to delete', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Deleting read notifications...',
      spinner: 'crescent',
    });

    try {
      await loading.present();

      // Delete all read notifications
      const deletePromises = readNotifications.map((notification) =>
        this.notificationService.deleteNotification(notification.id!)
      );

      await Promise.all(deletePromises);

      // Update local state
      this.notifications = this.notifications.filter(
        (n) => n.status !== 'read'
      );

      this.showToast('Read notifications deleted', 'success');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      this.showToast('Failed to delete read notifications', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Handle refresh event
  handleRefresh(event: RefresherCustomEvent) {
    this.loadNotifications(event);
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  // Add confirmation dialog for delete all
  async confirmDeleteAll() {
    const alert = document.createElement('ion-alert');
    alert.header = 'Confirm';
    alert.message = 'Are you sure you want to delete all read notifications?';
    alert.buttons = [
      {
        text: 'Cancel',
        role: 'cancel',
      },
      {
        text: 'Delete',
        handler: () => this.deleteAllReadNotifications(),
      },
    ];
    document.body.appendChild(alert);
    await alert.present();
  }

  // Enhanced method to mark notification as read and handle different actions
  async markNotificationAsRead(notification: Notification) {
    console.log('Clicked notification:', notification);
    
    // Add haptic feedback for mobile
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      // Haptics not available, continue without it
      console.log('Haptics not available');
    }
    
    // Mark as read first
    if (notification.status === 'unread' && notification.id) {
      try {
        await this.notificationService.markAsRead(notification.id);
        notification.status = 'read';
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle different notification types and actions
    await this.handleNotificationAction(notification);
  }

  // Handle different notification actions based on type and data
  private async handleNotificationAction(notification: Notification) {
    const action = notification.data?.action;
    const type = notification.type;

    console.log('Handling notification action:', { action, type, data: notification.data });

    // Handle payment reminder notifications
    if (type === 'system' && action === 'payment_reminder') {
      await this.handlePaymentReminder(notification);
      return;
    }

    // Handle payment status updates
    if (type === 'paymentupdate' || action === 'payment_approved' || action === 'payment_rejected') {
      await this.handlePaymentStatusUpdate(notification);
      return;
    }

    // Handle class full notifications
    if (type === 'system' && action === 'payment_required') {
      await this.handleClassFullNotification(notification);
      return;
    }

    // Default: show notification details
    await this.showNotificationDetails(notification);
  }

  // Handle payment reminder notifications
  private async handlePaymentReminder(notification: Notification) {
    // Compose new message format for payment reminder
    const className = notification.data?.['className'] || 'the class';
    let classDate = notification.data?.['classDate'] || 'TBD';
    let classTime = notification.data?.['classTime'] || '';
    // Format ISO date string to yyyy-MM-dd if needed
    if (classDate && classDate !== 'TBD' && classDate.includes('T')) {
      try {
        const d = new Date(classDate);
        classDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {}
    }
    const coachName = notification.data?.['coachName'] || 'TBD';
    const message = `You have a pending payment for the class "${className}" scheduled on ${classDate}${classTime ? ' at ' + classTime : ''}, with Coach ${coachName}. Please submit your payment to secure your spot.`;

    const alert = await this.alertCtrl.create({
      header: '⚠️ Payment Reminder',
      message: message,
      cssClass: 'mobile-alert payment-reminder-alert',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
        }
      ],
    });
    await alert.present();
  }

  // Handle payment status updates
  private async handlePaymentStatusUpdate(notification: Notification) {
    const className = notification.data?.className || 'the class';
    // Check both data.status and data.action for compatibility
    const isApproved = notification.data?.['status'] === 'approve' || notification.data?.action === 'payment_approved';
    
    const alert = await this.alertCtrl.create({
      header: isApproved ? ' Payment Approved' : ' Payment Rejected',
      message: isApproved 
        ? `Your payment for ${className} has been approved! You're all set for the class.`
        : `Your payment for ${className} was rejected. Please contact support for assistance.`,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  // Handle class full notifications
  private async handleClassFullNotification(notification: Notification) {
    const className = notification.data?.className || 'the class';
    const amount = notification.data?.amount;
    
    const alert = await this.alertCtrl.create({
      header: ' Class Full - Payment Required',
      message: `The class "${className}" has reached maximum capacity. Please make a payment of ${amount ? `₱${amount}` : 'the required amount'} to secure your spot.`,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  // Show notification details for other types
  private async showNotificationDetails(notification: Notification) {
    const alert = await this.alertCtrl.create({
      header: notification.title,
      message: notification.message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  openImagePreview(url: string) {
    this.previewImageUrl = url;
    this.isImagePreviewOpen = true;
  }

  closeImagePreview() {
    this.isImagePreviewOpen = false;
    this.previewImageUrl = null;
  }
}
