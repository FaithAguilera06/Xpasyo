import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GymService, Gym } from '../../../services/gym.service';
import { GeolocationService } from '../../../services/geolocation.service';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideIconsModule],
})
export class HomePage implements OnInit, OnDestroy {
  gyms: Gym[] = [];
  filteredGyms: Gym[] = [];
  isLoading = false;
  isScrolled: boolean = false;
  headerOpacity: number = 1;
  suggestedGyms: Gym[] = [];
  lastCriteria: string = '';

  constructor(
    private gymService: GymService,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGyms();
  }

  async reloadPage() {
    this.isLoading = true;
    await this.loadGyms(true); // Force refresh
    const toast = await this.toastCtrl.create({
      message: 'Gyms refreshed!',
      duration: 1500,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  goToSearchPage() {
    this.router.navigate(['/client/search']);
  }

  onContentScroll(event: any) {
    const scrollTop = event.detail.scrollTop || 0;
    const maxScroll = 150; // Adjust max scroll for full fade
    this.headerOpacity = Math.max(0, Math.min(1, 1 - scrollTop / maxScroll));
  }

  async loadGyms(forceRefresh = false) {
    this.isLoading = true;
    this.gyms = [];

    try {
      const fetchedGyms = await this.gymService.getGyms(forceRefresh);
      this.gyms = fetchedGyms || [];
      this.filteredGyms = [...this.gyms];

      if (this.gyms.length === 0) {
        const toast = await this.toastCtrl.create({
          message: 'No gyms available at the moment. Please check back later.',
          duration: 3000,
          position: 'bottom',
          color: 'warning',
          buttons: [
            {
              text: 'Retry',
              role: 'retry',
              handler: () => this.loadGyms(),
            },
          ],
        });
        await toast.present();
      } else {
        this.filteredGyms = [...this.gyms];
      }
    } catch (error) {
      let errorMessage = 'Failed to load gyms. Please try again later.';
      // Debug log for error
      // eslint-disable-next-line no-console
      console.error('DEBUG: Failed to load gyms:', error);
      if ((error as any)?.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission denied. Please make sure you are logged in.';
      } else if ((error as any)?.code === 'UNAVAILABLE') {
        errorMessage =
          'Unable to connect to the server. Please check your internet connection.';
      }

      const toast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 4000,
        position: 'bottom',
        color: 'danger',
        buttons: [
          {
            text: 'Retry',
            role: 'retry',
            handler: () => this.loadGyms(),
          },
        ],
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  getCriteriaString(): string {
    // If you want to show criteria, you can implement this based on navigation/search
    return '';
  }

  viewGymDetails(gymId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/client/gym-detail', gymId]);
  }

  handleImageError(event: any, gym: Gym) {
    event.target.src = 'assets/images/default-gym.png';
  }

  onSearch(event: any) {
    // If you want to implement search in the home page, do it here
  }

  ngOnDestroy() {
    // Clean up subscriptions if any
  }
}
