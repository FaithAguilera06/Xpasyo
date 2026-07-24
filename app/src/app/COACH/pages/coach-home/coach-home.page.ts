import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { GymService, Gym } from '../../../services/gym.service';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';

@Component({
  selector: 'app-coach-home',
  templateUrl: './coach-home.page.html',
  styleUrls: ['./coach-home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideIconsModule],
})
export class CoachHomePage implements OnInit, OnDestroy {
  gyms: Gym[] = [];
  filteredGyms: Gym[] = [];
  isLoading = false;
  isRefreshing = false;

  // Filters state
  selectedClass: string | null = null;
  selectedDistrict: string | null = null;
  selectedSize: string | null = null;
  minPrice: number = 0;
  maxPrice: number = 0;
  searchTerm: string = '';
  buttonsEnabled: boolean = false;

  // Scroll state for header transparency
  isScrolled: boolean = false;

  // Header opacity (1 = fully visible, 0 = fully transparent)
  headerOpacity: number = 1;

  // Scroll direction tracking
  private lastScrollTop: number = 0;
  private scrollThreshold: number = 10; // Minimum scroll distance to trigger direction change
  private isScrollingUp: boolean = false;
  private scrollTimeout: any;

  // Suggestion system properties
  suggestions: Gym[] = [];
  suggestionReason: string = '';
  showSuggestions: boolean = false;

  constructor(
    private gymService: GymService,
    private toastCtrl: ToastController,
    private router: Router,
    private modalCtrl: ModalController
  ) {}

  showFilters: boolean = false;

  get gymsToDisplay() {
    return this.filteredGyms.length > 0 ? this.filteredGyms : this.suggestions;
  }

  ngOnInit() {
    // Clear cache on app start to ensure fresh data with fitnessType
    localStorage.removeItem('gyms');
    localStorage.removeItem('gyms_cache_time');
    localStorage.removeItem('gyms_image_cache_time');
    
    this.loadGyms();
  }

  goToSearchPage() {
    this.router.navigate(['/coach/search']);
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

  onContentScroll(event: any) {
    const currentScrollTop = event.detail.scrollTop || 0;
    
    // Determine scroll direction
    const scrollDelta = currentScrollTop - this.lastScrollTop;
    const isScrollingUp = scrollDelta < 0;
    const isAtTop = currentScrollTop <= 0;
    
    // Update scroll direction if threshold is met
    if (Math.abs(scrollDelta) > this.scrollThreshold) {
      this.isScrollingUp = isScrollingUp;
    }
    
    // Clear previous timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Implement the recommended UX pattern
    if (isAtTop) {
      // At top of page - keep header visible
      this.headerOpacity = 1;
    } else if (this.isScrollingUp) {
      // Scrolling up - show header
      this.headerOpacity = 1;
    } else {
      // Scrolling down - hide header
      this.headerOpacity = 0;
    }
    
    // Update last scroll position
    this.lastScrollTop = currentScrollTop;
    
    // Set timeout to handle scroll end
    this.scrollTimeout = setTimeout(() => {
      // If not at top and not scrolling up, keep header hidden
      if (currentScrollTop > 0 && !this.isScrollingUp) {
        this.headerOpacity = 0;
      }
    }, 150);
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearSearch() {
    this.searchTerm = '';
    this.clearSuggestions();
    this.applyFilters();
  }

  clearSuggestions() {
    this.suggestions = [];
    this.suggestionReason = '';
    this.showSuggestions = false;
  }

  updateButtonsState() {
    this.buttonsEnabled = this.isAnyFilterSelected();
  }

  isAnyFilterSelected(): boolean {
    return (
      this.selectedClass !== null ||
      this.selectedDistrict !== null ||
      this.selectedSize !== null ||
      (this.minPrice !== 0 && this.minPrice !== null) ||
      (this.maxPrice !== 0 && this.maxPrice !== null)
    );
  }

  onFiltersChanged(filters: any) {
    this.selectedClass = filters.selectedClass;
    this.selectedDistrict = filters.selectedDistrict;
    this.selectedSize = filters.selectedSize;
    this.minPrice = filters.minPrice;
    this.maxPrice = filters.maxPrice;
    this.searchTerm = filters.searchTerm;
    this.applyFilters();
  }

  async loadGyms(forceRefresh = false) {
    if (!this.isRefreshing) {
      this.isLoading = true;
    }
    this.gyms = [];

    try {
      const cachedGyms = localStorage.getItem('gyms');
      const cacheTime = localStorage.getItem('gyms_cache_time');
      const imageCacheTime = localStorage.getItem('gyms_image_cache_time');
      const now = Date.now();
      let gymsArray: Gym[] = [];
      
      // Shorter cache for images (5 minutes) vs longer cache for data (30 minutes)
      const dataCacheValid = cacheTime && (now - parseInt(cacheTime, 10) < 30 * 60 * 1000); // 30 min
      const imageCacheValid = imageCacheTime && (now - parseInt(imageCacheTime, 10) < 5 * 60 * 1000); // 5 min

      if (!forceRefresh && cachedGyms && dataCacheValid) {
        const parsed = JSON.parse(cachedGyms);
        if (Array.isArray(parsed)) {
          gymsArray = parsed;
          
          // If image cache is stale, mark images for refresh
          if (!imageCacheValid) {
            gymsArray = gymsArray.map(gym => ({
              ...gym,
              gymInfo: {
                ...gym.gymInfo,
                image: undefined, // Force image refresh
                imageNeedsRefresh: true
              }
            }));
          }
        } else {
          localStorage.removeItem('gyms');
          localStorage.removeItem('gyms_cache_time');
          localStorage.removeItem('gyms_image_cache_time');
        }
      }
      
      if (gymsArray.length === 0) {
        const fetchedGyms = await this.gymService.getGyms(forceRefresh);
        gymsArray = Array.isArray(fetchedGyms) ? fetchedGyms : [];
        
        // Only cache essential fields to avoid exceeding localStorage quota
        const gymsToCache = gymsArray.map(gym => ({
          id: gym.id,
          gymInfo: {
            name: gym.gymInfo?.name,
            district: gym.gymInfo?.district,
            fitnessType: gym.gymInfo?.fitnessType,
            classTypes: gym.gymInfo?.classTypes,
            classTypesList: gym.gymInfo?.classTypesList,
            image: (typeof gym.gymInfo?.image === 'string' && gym.gymInfo.image.match(/^https?:\/\//)) ? gym.gymInfo.image : undefined,
            imageLastUpdated: now.toString(), // Track when image was last updated
          },
          gym_address: gym.gym_address,
        }));
        
        localStorage.setItem('gyms', JSON.stringify(gymsToCache));
        localStorage.setItem('gyms_cache_time', now.toString());
        localStorage.setItem('gyms_image_cache_time', now.toString());
      }
      
      this.gyms = gymsArray;
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
              handler: () => this.loadGyms(forceRefresh),
            },
          ],
        });
        await toast.present();
      } else {
        // Initially show all gyms unfiltered without applying ranking
        this.filteredGyms = [...this.gyms];
      }
    } catch (error) {
      let errorMessage = 'Failed to load gyms. Please try again later.';
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
            handler: () => this.loadGyms(forceRefresh),
          },
        ],
      });
      await toast.present();
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
    }
  }

  applyFilters() {
    this.updateButtonsState();

    // Initialize gym filter service if not already done
    // Removed: if (!this.gymFilterService) {
    // Removed:   this.gymFilterService = new GymFilterService(this.gyms);
    // Removed: }

    // Removed: this.gymFilterService.calculateScoresAndRanks(
    // Removed:   this.selectedClass,
    // Removed:   this.selectedDistrict,
    // Removed:   this.selectedSize,
    // Removed:   this.minPrice,
    // Removed:   this.maxPrice
    // Removed: );

    this.filteredGyms = this.gyms.filter(gym => {
      const matchesClass = this.selectedClass ? gym.gymInfo?.classTypesList?.includes(this.selectedClass) : true;
      const matchesDistrict = this.selectedDistrict ? gym.gymInfo?.district === this.selectedDistrict : true;
      const matchesSize = this.selectedSize ? gym.gymInfo?.classTypesList?.includes(this.selectedSize) : true;
      const matchesPrice = (typeof gym.gymInfo?.price === 'number') ? (this.minPrice <= gym.gymInfo.price && this.maxPrice >= gym.gymInfo.price) : true;
      const matchesSearchTerm = this.searchTerm ? gym.gymInfo?.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) : true;

      return matchesClass && matchesDistrict && matchesSize && matchesPrice && matchesSearchTerm;
    });

    // Always show suggestions when filters are applied (regardless of exact matches)
    if (this.isAnyFilterSelected()) {
      // Get suggestions (excluding gyms already in filtered results)
      const suggestionResult = this.gyms.filter(gym => {
        const matchesClass = this.selectedClass ? gym.gymInfo?.classTypesList?.includes(this.selectedClass) : true;
        const matchesDistrict = this.selectedDistrict ? gym.gymInfo?.district === this.selectedDistrict : true;
        const matchesSize = this.selectedSize ? gym.gymInfo?.classTypesList?.includes(this.selectedSize) : true;
        const matchesPrice = (typeof gym.gymInfo?.price === 'number') ? (this.minPrice <= gym.gymInfo.price && this.maxPrice >= gym.gymInfo.price) : true;
        const matchesSearchTerm = this.searchTerm ? gym.gymInfo?.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) : true;

        return matchesClass && matchesDistrict && matchesSize && matchesPrice && matchesSearchTerm;
      });

      this.suggestions = suggestionResult.filter(gym => !this.filteredGyms.some(fGym => fGym.id === gym.id));
      this.suggestionReason = 'Showing suggestions based on your filters.';
      this.showSuggestions = this.suggestions.length > 0;
    } else {
      // Clear suggestions if no filters are selected
      this.suggestions = [];
      this.suggestionReason = '';
      this.showSuggestions = false;
    }
  }

  viewGymDetails(gymId: string, event?: Event) {
    // Prevent any default behavior and stop event propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Find the gym data from the current gyms list
    const gym = this.filteredGyms.find((g) => g.id === gymId);
    if (gym) {
      // Pass the gym data in the navigation state
      this.router.navigate(['/coach/coach-gym-detail', gymId], {
        state: { gym: gym },
      });
    } else {
      // Fallback to just navigating with the ID if gym not found in the list
      this.router.navigate(['/coach/coach-gym-detail', gymId]);
    }
  }

  handleImageError(event: any, gym: Gym) {
    const img = event.target;
    
    // If this is the first error, try to refresh the image
    if (!img.dataset.retryCount || img.dataset.retryCount === '0') {
      img.dataset.retryCount = '1';
      
      // Add cache buster to force fresh image load
      const originalSrc = gym.gym_logo?.data || gym.gymInfo?.image;
      if (originalSrc && originalSrc !== img.src) {
        const cacheBuster = `?t=${Date.now()}`;
        img.src = originalSrc + cacheBuster;
        return;
      }
    }
    
    // If retry failed or no original source, use default image
    img.src = 'assets/images/default-gym.png';
    
    // Mark this gym's image as needing refresh in cache
    if (gym.id) {
      this.markGymImageForRefresh(gym.id);
    }
  }

  private markGymImageForRefresh(gymId: string) {
    // Mark this gym's image as needing refresh in localStorage
    const cachedGyms = localStorage.getItem('gyms');
    if (cachedGyms) {
      try {
        const gyms = JSON.parse(cachedGyms);
        const updatedGyms = gyms.map((gym: any) => {
          if (gym.id === gymId) {
            return {
              ...gym,
              gymInfo: {
                ...gym.gymInfo,
                imageNeedsRefresh: true,
                imageLastUpdated: Date.now().toString()
              }
            };
          }
          return gym;
        });
        localStorage.setItem('gyms', JSON.stringify(updatedGyms));
      } catch (error) {
        console.error('Error updating gym image cache:', error);
      }
    }
  }

  onSearch(event: any) {
    this.searchTerm = event.detail.value || '';
    this.applyFilters();
  }

  ngOnDestroy() {
    // Cleanup timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  doRefresh(event: any) {
    this.isRefreshing = true;
    this.loadGyms(true).then(() => {
      event.target.complete();
      this.isRefreshing = false;
    });
  }
}
