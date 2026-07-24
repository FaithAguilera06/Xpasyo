import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LucideIconsModule } from 'src/assets/icon/lucide-icons.module';
import { Router } from '@angular/router';
import { GymService, Gym } from '../../../services/gym.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IonSearchbar } from '@ionic/angular';
import { FilterService, FilterData } from 'src/app/services/filter.service';


@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, LucideIconsModule]
})
export class SearchPage implements AfterViewInit {
  @ViewChild(IonSearchbar, { static: false }) searchbar!: IonSearchbar;
  @ViewChild('minPriceInput', { static: false }) minPriceInputRef!: ElementRef;
  @ViewChild('maxPriceInput', { static: false }) maxPriceInputRef!: ElementRef;
  @ViewChild('cardSheetBody', { static: false }) cardSheetBodyRef!: ElementRef;
  
  // Filter properties
  filter: FilterData = this.filterService.getDefaultFilterData(); // UI state for filter sheet
  appliedFilter: FilterData = this.filterService.getDefaultFilterData(); // Used for filtering results
  
  // Search properties
  gyms: Gym[] = [];
  filteredGyms: Gym[] = [];
  displayedGyms: Gym[] = [];
  isLoading: boolean = true;
  showNoGymsFound: boolean = false;
  private searchSubject = new Subject<string>();
  recentSearches: string[] = [];
  suggestions: string[] = [];
  emptySuggestions: string[] = [];
  gymsPerPage: number = 10;
  currentPage: number = 1;
  allSuggestions: string[] = [];
  showClassTypeSheet = false;
  tempSelectedClassTypes: string[] = [];
  tempSelectedDistricts: string[] = [];
  suggestedGyms: any[] = [];
  hasSearchedOrFiltered = false;

  // Filter option arrays (static, matching Logic folder)
  classTypes: string[] = [
    'ZUMBA',
    'YOGA',
    'HIIT',
    'CIRCUIT TRAINING',
    'AEROBICS',
    'PILATES',
  ];
  districts: string[] = ['1', '2', '3', '4', '5', '6'];
  sizes: string[] = ['SMALL', 'MEDIUM', 'LARGE'];

  constructor(
    private location: Location, 
    private router: Router, 
    private gymService: GymService,
    public filterService: FilterService // <-- inject the shared service
  ) {
    this.searchSubject.pipe(debounceTime(400)).subscribe((search) => {
      this.performSearch(search);
    });
  }

  async ngOnInit() {
    this.isLoading = true;
    const cachedGyms = localStorage.getItem('gyms');
    const cacheTime = localStorage.getItem('gyms_cache_time');
    const now = Date.now();
    let gymsArray: Gym[] = [];
    const cacheValid = cacheTime && (now - parseInt(cacheTime, 10) < 30 * 60 * 1000); // 30 min

    if (cachedGyms && cacheValid) {
      const parsed = JSON.parse(cachedGyms);
      if (Array.isArray(parsed)) {
        gymsArray = parsed;
      } else {
        localStorage.removeItem('gyms');
        localStorage.removeItem('gyms_cache_time');
      }
    }
    if (gymsArray.length === 0) {
      const fetchedGyms = await this.gymService.getGyms();
      gymsArray = Array.isArray(fetchedGyms) ? fetchedGyms : [];
      // Only cache essential fields to avoid exceeding localStorage quota
      const gymsToCache = gymsArray.map(gym => ({
        id: gym.id,
        gymInfo: {
          name: gym.gymInfo?.name,
          district: gym.gymInfo?.district,
          classTypes: gym.gymInfo?.classTypes,
          classTypesList: gym.gymInfo?.classTypesList,
          image: (typeof gym.gymInfo?.image === 'string' && gym.gymInfo.image.match(/^https?:\/\//)) ? gym.gymInfo.image : undefined,
        },
        gym_address: gym.gym_address,
      }));
      localStorage.setItem('gyms', JSON.stringify(gymsToCache));
      localStorage.setItem('gyms_cache_time', now.toString());
    }
    this.gyms = gymsArray;
    this.filteredGyms = [];
    this.displayedGyms = [];
    // Initialize GymFilterService with loaded gyms (Logic folder version)
    this.isLoading = false;
    this.recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    this.prepareAllSuggestions();
    this.prepareEmptySuggestions();
    this.prepareFilterOptions();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.searchbar) {
        this.searchbar.setFocus();
      }
    }, 400);
  }

  // Filter Methods
  prepareFilterOptions() {
    // Remove dynamic availableDistricts and availableClassTypes logic
    // Use static arrays from filterService in the template/UI
  }

  // Update filter methods to use FilterService
  toggleClassFilter(classType: string) {
    this.filter = this.filterService.toggleClassFilter(this.filter, classType);
    this.filterGyms();
    }

  toggleDistrictFilter(district: string) {
    this.filter = this.filterService.toggleDistrictFilter(this.filter, district);
    this.filterGyms();
  }

  toggleSizeFilter(size: string) {
    this.filter = this.filterService.toggleSizeFilter(this.filter, size);
    this.filterGyms();
  }

  onMinPriceChange(newMin: number) {
    this.filter = this.filterService.onMinPriceChange(this.filter, newMin);
    this.filterGyms();
  }

  onMaxPriceChange(newMax: number) {
    this.filter = this.filterService.onMaxPriceChange(this.filter, newMax);
    this.filterGyms();
  }

  clearFilters() {
    this.filter = this.filterService.clearFilters();
    this.filterGyms();
  }

  // Remove ModalController and FilterModalComponent logic for filtering
  // (e.g., openFilter, applyFilters, etc. related to modal)
  // The filter sheet should now be a direct part of the search page, not a modal.

  // Search Methods
  updateSuggestions() {
    const term = this.searchbar.value || '';
    if (!term) {
      this.suggestions = [];
      return;
    }
    this.suggestions = this.allSuggestions.filter(s => s.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
  }

  onSuggestionClick(suggestion: string) {
    this.searchbar.value = suggestion;
    this.filterGyms();
    this.suggestions = [];
  }

  prepareAllSuggestions() {
    const names = this.gyms.map(g => g.gymInfo?.name).filter(Boolean);
    const districts = this.gyms.map(g => g.gymInfo?.district).filter(Boolean);
    const classTypes = this.gyms
      .map(g => (g.gymInfo?.classTypes || []).map(ct => ct.name))
      .reduce((acc, val) => acc.concat(val), [])
      .filter(Boolean);
    this.allSuggestions = Array.from(new Set([...names, ...districts, ...classTypes]));
  }

  prepareEmptySuggestions() {
    const names = this.gyms.map(g => g.gymInfo?.name).filter(Boolean).slice(0, 3);
    const districts = this.gyms.map(g => g.gymInfo?.district).filter(Boolean).slice(0, 2);
    const classTypes = this.gyms
      .map(g => (g.gymInfo?.classTypes || []).map(ct => ct.name))
      .reduce((acc, val) => acc.concat(val), [])
      .filter(Boolean)
      .slice(0, 2);
    this.emptySuggestions = Array.from(new Set([...names, ...districts, ...classTypes]));
  }

  // Filtering logic using single-value filter state
  filterGyms() {
    this.hasSearchedOrFiltered = true;
    let gymsToFilter = this.gyms;
    // Class type filter
    if (this.appliedFilter.selectedClass) {
      gymsToFilter = gymsToFilter.filter(gym =>
        (gym.gymInfo?.classTypes || []).some((ct: any) =>
          ct.name === this.appliedFilter.selectedClass
        )
      );
    }
    // District filter
    if (this.appliedFilter.selectedDistrict) {
      gymsToFilter = gymsToFilter.filter(gym =>
        gym.gymInfo?.district === this.appliedFilter.selectedDistrict
      );
    }
    // Size filter
    if (this.appliedFilter.selectedSize) {
      gymsToFilter = gymsToFilter.filter(gym => {
        const size = (gym.gymInfo?.fitnessType || '').toUpperCase();
        return size === this.appliedFilter.selectedSize;
      });
    }
    // Price filter
    if (this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0) {
      gymsToFilter = gymsToFilter.filter(gym => {
        const gymPrice = (gym as any)['price'] || 0;
        if (this.appliedFilter.minPrice > 0 && gymPrice < this.appliedFilter.minPrice) return false;
        if (this.appliedFilter.maxPrice > 0 && gymPrice > this.appliedFilter.maxPrice) return false;
        return true;
      });
    }
    this.filteredGyms = gymsToFilter;
    this.currentPage = 1;
    this.displayedGyms = this.filteredGyms.slice(0, this.gymsPerPage);
    this.showNoGymsFound = this.filteredGyms.length === 0;

    // Suggested Gyms logic (single-value filters)
    if (
      this.filteredGyms.length === 0 &&
      (this.appliedFilter.selectedClass || this.appliedFilter.selectedDistrict || this.appliedFilter.selectedSize || this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)
    ) {
      this.suggestedGyms = this.gyms.filter(gym => {
        let matchCount = 0;
        if (this.appliedFilter.selectedClass && (gym.gymInfo?.classTypes || []).some((ct: any) => ct.name === this.appliedFilter.selectedClass)) matchCount++;
        if (this.appliedFilter.selectedDistrict && gym.gymInfo?.district === this.appliedFilter.selectedDistrict) matchCount++;
        if (this.appliedFilter.selectedSize && (gym.gymInfo?.fitnessType || '').toUpperCase() === this.appliedFilter.selectedSize) matchCount++;
        if ((this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)) {
          const gymPrice = (gym as any)['price'] || 0;
          if ((this.appliedFilter.minPrice > 0 && gymPrice >= this.appliedFilter.minPrice) || (this.appliedFilter.maxPrice > 0 && gymPrice <= this.appliedFilter.maxPrice)) matchCount++;
        }
        const totalFilters = [
          !!this.appliedFilter.selectedClass,
          !!this.appliedFilter.selectedDistrict,
          !!this.appliedFilter.selectedSize,
          (this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)
        ].filter(Boolean).length;
        return matchCount > 0 && matchCount < totalFilters;
      });
      
      // Sort suggested gyms by priority (class > district > price > size)
      this.suggestedGyms = this.sortSuggestedGymsByPriority(this.suggestedGyms);
    } else {
      this.suggestedGyms = [];
    }
  }

  loadMoreGyms(event: any) {
    this.currentPage++;
    const nextGyms = this.filteredGyms.slice(0, this.currentPage * this.gymsPerPage);
    this.displayedGyms = nextGyms;
    event.target.complete();
  }

  saveRecentSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    this.recentSearches = this.recentSearches.filter(t => t !== trimmed);
    this.recentSearches.unshift(trimmed);
    this.recentSearches = this.recentSearches.slice(0, 5); // Keep last 5
    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
  }

  onRecentSearchClick(term: string) {
    this.searchbar.value = term;
    this.filterGyms();
  }

  private performSearch(search: string) {
    this.filterGyms();
    this.isLoading = false;
  }

  // Helper: Normalize gym size
  normalizeGymSize(sizeDescription: string): string {
    if (!sizeDescription) return 'UNKNOWN';
    const cleaned = sizeDescription.trim().toLowerCase();
    if (
      cleaned.includes('large') ||
      cleaned.includes('250+') ||
      cleaned.includes('250 +')
    ) {
      return 'LARGE';
    } else if (
      cleaned.includes('medium') ||
      cleaned.includes('100 - 250')
    ) {
      return 'MEDIUM';
    } else if (
      cleaned.includes('small') ||
      cleaned.includes('50 - 100')
    ) {
      return 'SMALL';
    }
    const sizeMap: Record<string, string> = {
      'Small Studio (50 - 100 sqm)': 'SMALL',
      'Medium Studio (100 - 250 sqm)': 'MEDIUM',
      'Large Studio (250+ sqm)': 'LARGE',
    };
    return sizeMap[sizeDescription] || 'UNKNOWN';
  }

  // Helper: Class type match (case-insensitive, checks both classTypesList and classTypes)
  classTypePass(gym: any, selectedClass: string | null): boolean {
    if (!selectedClass) return true;
    const selectedUpper = selectedClass.toUpperCase().trim();
    const classTypesList = (gym.gymInfo.classTypesList || []).map((c: string) => c.toUpperCase().trim());
    const classTypesNames = (gym.gymInfo.classTypes || []).map((ct: any) => (ct.name || '').toUpperCase().trim());
    return classTypesList.includes(selectedUpper) || classTypesNames.includes(selectedUpper);
  }

  // Helper: District match (extracts number, compares as string)
  districtPass(gym: any, selectedDistrict: string | null): boolean {
    if (!selectedDistrict) return true;
    const districtNumber = gym.gymInfo.district?.match(/\d+/)?.[0];
    return districtNumber === selectedDistrict;
  }

  // Helper: Size match (normalize both sides)
  sizePass(gym: any, selectedSize: string | null): boolean {
    if (!selectedSize) return true;
    const gymSize = this.normalizeGymSize(gym.gymInfo.fitnessType || '');
    return gymSize === selectedSize;
  }

  // Helper: Parse price_display to number
  parsePrice(priceDisplay: string): number {
    if (!priceDisplay) return 0;
    const num = priceDisplay.replace(/[₱,\s]/g, '');
    const parsed = parseFloat(num);
    return isNaN(parsed) ? 0 : parsed;
  }

  // New method: Sort suggested gyms by priority (class > district > price > size)
  sortSuggestedGymsByPriority(gyms: any[]): any[] {
    return gyms.sort((a, b) => {
      // Calculate priority scores for each gym
      const scoreA = this.calculateGymPriorityScore(a);
      const scoreB = this.calculateGymPriorityScore(b);
      
      // Debug logging
      console.log(`Sorting: ${a.gymInfo?.name || 'Unknown'} (score: ${scoreA}) vs ${b.gymInfo?.name || 'Unknown'} (score: ${scoreB})`);
      
      // Higher score = higher priority (descending order)
      return scoreB - scoreA;
    });
  }

  // Helper: Calculate priority score for a gym
  calculateGymPriorityScore(gym: any): number {
    let score = 0;
    
    // Class match: 1000 points (highest priority)
    if (this.appliedFilter.selectedClass && this.classTypePass(gym, this.appliedFilter.selectedClass)) {
      score += 1000;
    }
    
    // District match: 100 points (second priority)
    if (this.appliedFilter.selectedDistrict && this.districtPass(gym, this.appliedFilter.selectedDistrict)) {
      score += 100;
    }
    
    // Price match: 10 points (third priority)
    if ((this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)) {
      const hasPriceMatch = (gym.gymInfo.classTypes || []).some((ct: any) => {
        const price = this.parsePrice(ct.price_display);
        if (this.appliedFilter.minPrice > 0 && price >= this.appliedFilter.minPrice) return true;
        if (this.appliedFilter.maxPrice > 0 && price <= this.appliedFilter.maxPrice) return true;
        return false;
      });
      if (hasPriceMatch) {
        score += 10;
      }
    }
    
    // Size match: 1 point (lowest priority)
    if (this.appliedFilter.selectedSize && this.sizePass(gym, this.appliedFilter.selectedSize)) {
      score += 1;
    }
    
    return score;
  }

  handleSearchAndFilter() {
    // Only apply filters to all gyms using robust helpers
    let filtered = this.gyms;
    // Class type filter
    if (this.appliedFilter.selectedClass) {
      filtered = filtered.filter(gym => this.classTypePass(gym, this.appliedFilter.selectedClass));
    }
    // District filter
    if (this.appliedFilter.selectedDistrict) {
      filtered = filtered.filter(gym => this.districtPass(gym, this.appliedFilter.selectedDistrict));
    }
    // Size filter
    if (this.appliedFilter.selectedSize) {
      filtered = filtered.filter(gym => this.sizePass(gym, this.appliedFilter.selectedSize));
    }
    // Price filter (use price_display from classTypes)
    if (this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0) {
      filtered = filtered.filter(gym => {
        // Check all class types for a price match
        return (gym.gymInfo.classTypes || []).some((ct: any) => {
          const price = this.parsePrice(ct.price_display);
          if (this.appliedFilter.minPrice > 0 && price < this.appliedFilter.minPrice) return false;
          if (this.appliedFilter.maxPrice > 0 && price > this.appliedFilter.maxPrice) return false;
          return true;
        });
      });
    }
    // 3. Update the display arrays
    this.filteredGyms = filtered;
    this.currentPage = 1;
    this.displayedGyms = this.filteredGyms.slice(0, this.gymsPerPage);
    this.showNoGymsFound = this.filteredGyms.length === 0;

    // 4. Suggested Gyms logic (use robust helpers)
    if (this.filteredGyms.length === 0 && (this.appliedFilter.selectedClass || this.appliedFilter.selectedDistrict || this.appliedFilter.selectedSize || this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)) {
      this.suggestedGyms = this.gyms.filter(gym => {
        let matchCount = 0;
        if (this.classTypePass(gym, this.appliedFilter.selectedClass)) matchCount++;
        if (this.districtPass(gym, this.appliedFilter.selectedDistrict)) matchCount++;
        if (this.sizePass(gym, this.appliedFilter.selectedSize)) matchCount++;
        if ((this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)) {
          // Check all class types for a price match
          if ((gym.gymInfo.classTypes || []).some((ct: any) => {
            const price = this.parsePrice(ct.price_display);
            if (this.appliedFilter.minPrice > 0 && price >= this.appliedFilter.minPrice) return true;
            if (this.appliedFilter.maxPrice > 0 && price <= this.appliedFilter.maxPrice) return true;
            return false;
          })) matchCount++;
        }
        const totalFilters = [!!this.appliedFilter.selectedClass, !!this.appliedFilter.selectedDistrict, !!this.appliedFilter.selectedSize, (this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0)].filter(Boolean).length;
        return matchCount > 0 && matchCount < totalFilters;
      });
      
      // Sort suggested gyms by priority (class > district > price > size)
      this.suggestedGyms = this.sortSuggestedGymsByPriority(this.suggestedGyms);
    } else {
      this.suggestedGyms = [];
    }
  }

  // Navigation Methods
  goBack(): void {
    this.location.back();
  }

  goToExplore() {
    this.router.navigate(['/client/explore']);
  }

  viewGymDetails(gymId: string) {
    const gym = this.displayedGyms.find(g => g.id === gymId);
    if (gym) {
      this.router.navigate(['/gym', gymId], {
        state: { gym: gym },
      });
    } else {
      this.router.navigate(['/gym', gymId]);
    }
  }

  // Legacy filter methods (keeping for compatibility)
  updateButtonsState() {
    const priceValid =
      (this.filter.minPrice === 0 && this.filter.maxPrice === 0) ||
      (this.filter.minPrice > 0 && this.filter.maxPrice > 0 && this.filter.maxPrice >= this.filter.minPrice);
    // this.buttonsEnabled = this.isAnyFilterSelected() && priceValid; // This line is no longer needed
  }

  // isAnyFilterSelected(): boolean { // This method is no longer needed
  //   return this.minPrice > 0 || 
  //          this.maxPrice > 0 || 
  //          this.selectedDistricts.length > 0 || 
  //          this.selectedClassTypes.length > 0;
  // }

  onSearchEnter() {
    // Called when user presses Enter in the search bar
    this.performSearch(this.searchbar.value || '');
    this.showNoGymsFound = true;
  }

  // When opening the filter sheet
  onFilterButtonClick() {
    this.filter = this.filterService.getDefaultFilterData(); // Always fresh
    this.showClassTypeSheet = true;
  }
  closeClassTypeSheet() {
    this.showClassTypeSheet = false;
  }
  toggleClassType(classType: string) {
    this.hasSearchedOrFiltered = true;
    this.filter.selectedClass = this.filter.selectedClass === classType ? null : classType;
  }
  toggleDistrict(district: string) {
    this.hasSearchedOrFiltered = true;
    this.filter.selectedDistrict = this.filter.selectedDistrict === district ? null : district;
  }
  toggleSize(size: string) {
    this.hasSearchedOrFiltered = true;
    this.filter.selectedSize = this.filter.selectedSize === size ? null : size;
  }
  onTempMinPriceChange() {
    this.hasSearchedOrFiltered = true;
    if (this.filter.maxPrice > 0 && this.filter.maxPrice < this.filter.minPrice) {
      this.filter.maxPrice = this.filter.minPrice;
    }
  }
  onTempMaxPriceChange() {
    this.hasSearchedOrFiltered = true;
    if (this.filter.maxPrice > 0 && this.filter.maxPrice < this.filter.minPrice) {
      this.filter.maxPrice = this.filter.minPrice;
    }
  }
  // When applying filters
  applyClassTypeFilter() {
    this.hasSearchedOrFiltered = true;
    this.appliedFilter = { ...this.filter }; // Save the current UI state as the applied filter
    this.handleSearchAndFilter(); // Use appliedFilter for filtering
    this.filter = this.filterService.getDefaultFilterData(); // Reset UI state for next time
    this.closeClassTypeSheet();
  }

  clearTempFilters() {
    this.filter.selectedClass = null;
    this.filter.selectedDistrict = null;
    this.filter.selectedSize = null;
    this.filter.minPrice = 0;
    this.filter.maxPrice = 0;
  }

  getDistrictNumber(district: string): string {
    const match = district.match(/\d+/);
    return match ? match[0] : district;
  }

  scrollInputIntoView(input: ElementRef) {
    if (
      this.cardSheetBodyRef &&
      this.cardSheetBodyRef.nativeElement &&
      input &&
      input.nativeElement
    ) {
      const body = this.cardSheetBodyRef.nativeElement as HTMLElement;
      const inputEl = input.nativeElement as HTMLElement;
      const bodyRect = body.getBoundingClientRect();
      const inputRect = inputEl.getBoundingClientRect();
      if (inputRect.bottom > bodyRect.bottom || inputRect.top < bodyRect.top) {
        body.scrollTop += (inputRect.top - bodyRect.top) - 24;
      }
    }
  }

  handleImageError(event: any, gym: any) {
    event.target.src = 'assets/images/default-gym.png';
  }

  // Method to get selected criteria as a formatted string
  getSelectedCriteria(): string {
    const criteria: string[] = [];
    
    if (this.appliedFilter.selectedClass) {
      criteria.push(`Class: ${this.appliedFilter.selectedClass}`);
    }
    
    if (this.appliedFilter.selectedDistrict) {
      criteria.push(`District: ${this.appliedFilter.selectedDistrict}`);
    }
    
    if (this.appliedFilter.selectedSize) {
      criteria.push(`Size: ${this.appliedFilter.selectedSize}`);
    }
    
    if (this.appliedFilter.minPrice > 0 || this.appliedFilter.maxPrice > 0) {
      let priceText = 'Price: ';
      if (this.appliedFilter.minPrice > 0 && this.appliedFilter.maxPrice > 0) {
        priceText += `₱${this.appliedFilter.minPrice} - ₱${this.appliedFilter.maxPrice}`;
      } else if (this.appliedFilter.minPrice > 0) {
        priceText += `₱${this.appliedFilter.minPrice}+`;
      } else if (this.appliedFilter.maxPrice > 0) {
        priceText += `₱${this.appliedFilter.maxPrice}-`;
      }
      criteria.push(priceText);
    }
    
    return criteria.join(', ');
  }
}