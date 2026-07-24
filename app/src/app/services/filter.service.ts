import { Injectable } from '@angular/core';

export interface FilterData {
  selectedClass: string | null;
  selectedDistrict: string | null;
  selectedSize: string | null;
  minPrice: number;
  maxPrice: number;
  searchTerm: string;
}

@Injectable({ providedIn: 'root' })
export class FilterService {
  // Static filter options
  readonly classTypes: string[] = [
    'AEROBICS',
    'CIRCUIT TRAINING',
    'HIIT',
    'PILATES',
    'YOGA',
    'ZUMBA',
  ];
  readonly districts: string[] = ['1', '2', '3', '4', '5', '6'];
  readonly sizes: string[] = ['SMALL', 'MEDIUM', 'LARGE'];

  // State (can be managed externally, or use these helpers)
  getDefaultFilterData(): FilterData {
    return {
      selectedClass: null,
      selectedDistrict: null,
      selectedSize: null,
      minPrice: 0,
      maxPrice: 0,
      searchTerm: '',
    };
  }

  isAnyFilterSelected(filter: FilterData): boolean {
    return (
      filter.selectedClass !== null ||
      filter.selectedDistrict !== null ||
      filter.selectedSize !== null ||
      filter.minPrice > 0 ||
      filter.maxPrice > 0 ||
      (!!filter.searchTerm && filter.searchTerm.trim() !== '')
    );
  }

  priceValid(filter: FilterData): boolean {
    return (
      (filter.minPrice === 0 && filter.maxPrice === 0) ||
      (filter.minPrice > 0 && filter.maxPrice > 0 && filter.maxPrice >= filter.minPrice)
    );
  }

  toggleClassFilter(filter: FilterData, classType: string): FilterData {
    return {
      ...filter,
      selectedClass: filter.selectedClass === classType ? null : classType,
    };
  }

  toggleDistrictFilter(filter: FilterData, district: string): FilterData {
    return {
      ...filter,
      selectedDistrict: filter.selectedDistrict === district ? null : district,
    };
  }

  toggleSizeFilter(filter: FilterData, size: string): FilterData {
    return {
      ...filter,
      selectedSize: filter.selectedSize === size ? null : size,
    };
  }

  onMinPriceChange(filter: FilterData, newMin: number): FilterData {
    let maxPrice = filter.maxPrice;
    if (maxPrice > 0 && maxPrice < newMin) {
      maxPrice = newMin;
    }
    return { ...filter, minPrice: newMin, maxPrice };
  }

  onMaxPriceChange(filter: FilterData, newMax: number): FilterData {
    let minPrice = filter.minPrice;
    if (newMax > 0 && newMax < minPrice) {
      minPrice = newMax;
    }
    return { ...filter, maxPrice: newMax, minPrice };
  }

  clearFilters(): FilterData {
    return this.getDefaultFilterData();
  }
} 