import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Firestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideIconsModule } from 'android/app/src/main/assets/public/assets/icon/lucide-icons.module';

interface BookedSession {
  id: string;
  className: string;
  coachName: string;
  gymName: string | { gymInfo: { name: string } };
  day: string;
  time: string;
  fee: number;
  status: string;
  date: string;
  // Add other fields as needed
}

@Component({
  selector: 'app-class',
  templateUrl: './class.page.html',
  styleUrls: ['./class.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule,LucideIconsModule],
})
export class ClassPage implements OnInit, OnDestroy {
  bookedSessions: BookedSession[] = [];
  isLoading = true;
  private sessionSubscription: Unsubscribe | null = null;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {}

  async ngOnInit() {
    await this.loadBookedSessions();
  }

  ngOnDestroy() {
    if (this.sessionSubscription) {
      this.sessionSubscription();
    }
  }

  private async loadBookedSessions() {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.isLoading = true;
      const sessionsRef = collection(this.firestore, 'sessionBookings');
      const q = query(sessionsRef, where('clientId', '==', user.uid));
      
      // Initial load
      const querySnapshot = await getDocs(q);
      this.bookedSessions = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as any;
        // Filter out sessions that are done or deleted
        if (data['isDeleted'] || data['status'] === 'done' || data['status'] === 'deleted') {
          continue;
        }
        // New check: verify the class still exists and is active
        let classExists = false;
        if (data['applicationId']) {
          const classDoc = await getDoc(doc(this.firestore, 'coachApplications', data['applicationId']));
          if (classDoc.exists()) {
            const classData = classDoc.data();
            if (!classData['isDeleted'] && classData['status'] !== 'deleted' && classData['status'] !== 'done') {
              classExists = true;
            }
          }
        }
        if (!classExists) continue;
        let latestCoachName = data['coachName'] || 'Unknown Coach';
        if (data['coachId']) {
          try {
            const userDoc = await getDoc(doc(this.firestore, 'users', data['coachId']));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              latestCoachName = userData['name'] || latestCoachName;
            }
          } catch (e) {
            // fallback to existing coachName
          }
        }
        this.bookedSessions.push({
          id: docSnap.id,
          ...data,
          gymName: data['gymName'] || 'Unknown Gym',
          className: data['className'] || 'Unnamed Class',
          coachName: latestCoachName,
          day: data['day'] || 'Not specified',
          time: data['time'] || 'Not specified',
          fee: data['fee'] || 0,
          status: data['status'] || 'booked',
          date: data['date'] || new Date().toISOString()
        } as BookedSession);
      }
      
      // Set up real-time listener
      this.sessionSubscription = onSnapshot(q, async (snapshot) => {
        const sessions: BookedSession[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as any;
          // Filter out sessions that are done or deleted
          if (data['isDeleted'] || data['status'] === 'done' || data['status'] === 'deleted') {
            continue;
          }
          // New check: verify the class still exists and is active
          let classExists = false;
          if (data['applicationId']) {
            const classDoc = await getDoc(doc(this.firestore, 'coachApplications', data['applicationId']));
            if (classDoc.exists()) {
              const classData = classDoc.data();
              if (!classData['isDeleted'] && classData['status'] !== 'deleted' && classData['status'] !== 'done') {
                classExists = true;
              }
            }
          }
          if (!classExists) continue;
          let latestCoachName = data['coachName'] || 'Unknown Coach';
          if (data['coachId']) {
            try {
              const userDoc = await getDoc(doc(this.firestore, 'users', data['coachId']));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                latestCoachName = userData['name'] || latestCoachName;
              }
            } catch (e) {
              // fallback to existing coachName
            }
          }
          sessions.push({
            id: docSnap.id,
            ...data,
            gymName: data['gymName'] || 'Unknown Gym',
            className: data['className'] || 'Unnamed Class',
            coachName: latestCoachName,
            day: data['day'] || 'Not specified',
            time: data['time'] || 'Not specified',
            fee: data['fee'] || 0,
            status: data['status'] || 'booked',
            date: data['date'] || new Date().toISOString()
          } as BookedSession);
        }
        this.bookedSessions = sessions;
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Show error message to user
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Failed to load your sessions. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isLoading = false;
    }
  }

  viewSessionDetails(session: BookedSession) {
    console.log('Navigating to session:', session.id);
    console.log('Current route:', this.router.url);
    this.router.navigate(['/client/class/detail', session.id], { 
      skipLocationChange: false 
    }).then(navResult => {
      console.log('Navigation result:', navResult);
      if (!navResult) {
        console.error('Navigation failed, trying alternative path');
        this.router.navigate(['/client/class/detail', session.id], { 
          relativeTo: this.route.parent,
          skipLocationChange: false
        });
      }
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  private async presentSessionDetails(session: BookedSession) {
    console.log('Session data:', session); // For debugging
    const gymName = typeof session.gymName === 'string' 
      ? session.gymName 
      : session.gymName?.gymInfo?.name || 'Gym name not available';
    const alert = await this.alertController.create({
      header: session.className || 'Session Details',
      subHeader: `Coach: ${session.coachName || 'Not specified'}`,
      message: `
        <p><strong>Gym:</strong> ${gymName}</p>
        <p><strong>Day:</strong> ${session.day || 'Not specified'}</p>
        <p><strong>Time:</strong> ${session.time || 'Not specified'}</p>
        <p><strong>Fee:</strong> ${session.fee ? '₱' + session.fee : 'Not specified'}</p>
        <p><strong>Status:</strong> ${session.status || 'Not specified'}</p>
      `,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        },
        {
          text: 'View Details',
          handler: () => {
            // Navigate to detailed view if needed
            // this.router.navigate(['/client/session-details', session.id]);
          }
        }
      ]
    });

    await alert.present();
  }

  // Navigate to home page
  navigateToHome() {
    this.router.navigate(['/client/home']);
  }

  getGymName(gymData: any): string {
    try {
      if (!gymData) return 'Unknown Gym';
      
      // If it's a string, return it directly
      if (typeof gymData === 'string') return gymData;
      
      // If it's an object with gymInfo.name
      if (typeof gymData === 'object' && gymData.gymInfo && gymData.gymInfo.name) {
        return gymData.gymInfo.name;
      }
      
      // If it's an object with a name property
      if (typeof gymData === 'object' && gymData.name) {
        return gymData.name;
      }
      
      // If it's an object with a toString method
      if (typeof gymData === 'object' && gymData.toString) {
        const str = gymData.toString();
        if (str !== '[object Object]') return str;
      }
      
      // Last resort - try JSON.stringify but limit length
      const jsonStr = JSON.stringify(gymData);
      return jsonStr.length > 50 ? jsonStr.substring(0, 50) + '...' : jsonStr;
    } catch (error) {
      console.error('Error getting gym name:', error);
      return 'Gym Name Error';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format time range for display
  formatTimeRange(time: string): string {
    if (!time) return 'Time not specified';
    
    // If time already contains a range (e.g., '9:00 AM - 12:00 PM'), return as is
    if (time.includes('-')) {
      return time;
    }
    
    // If it's a single time, assume it's the start time and add a default duration
    // You might want to adjust the default duration based on your requirements
    const startTime = time.trim();
    try {
      const [timePart, period] = startTime.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      
      // Add 1 hour as default duration
      let endHours = hours + 1;
      let endPeriod = period;
      
      // Handle AM/PM rollover
      if (endHours >= 12) {
        endHours = endHours % 12 || 12;
        if (period === 'AM' && hours < 12) {
          endPeriod = 'PM';
        } else if (period === 'PM' && hours < 12) {
          endPeriod = 'PM';
        } else {
          endPeriod = period === 'AM' ? 'PM' : 'AM';
        }
      }
      
      const endTime = `${endHours}:${minutes.toString().padStart(2, '0')} ${endPeriod}`;
      return `${startTime} - ${endTime}`;
    } catch (error) {
      console.error('Error formatting time range:', error);
      return time; // Return original if parsing fails
    }
  }

  // Handle pull-to-refresh
  async handleRefresh(event: any) {
    await this.loadBookedSessions();
    event.target.complete();
  }

  // Get status color for badges
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
        return 'success';
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

  // Get display text for status badges
  getStatusDisplayText(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
        return 'Paid';
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
}