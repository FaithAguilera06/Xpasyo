import { Injectable } from '@angular/core';
import { Database, ref, get } from '@angular/fire/database';
import { environment } from '../../environments/environment';

export interface ClassType {
  max_price: number;
  min_price: number;
  name: string;
  price_range: string;
  price?: number;
  price_display?: string;
}

export interface Schedule {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface GymInfo {
  name: string;
  address: string;
  district: string;
  businessHours: string;
  schedule?: Schedule;
  fitnessType?: string;
  classTypes?: ClassType[];
  classTypesList?: string[];
  status?: string;
  image?: string;
  size?: string;
  price?: number;
  paymentInfo?: {
    gcashAccountNumber?: string;
  };
}

export interface Gym {
  id: string;
  gymInfo: Omit<GymInfo, 'address'>; // Remove address from GymInfo since it's at root now
  gym_address?: string; // Add gym_address at root level
  gym_logo?: {
    data?: string;
  };
  schedule?: Schedule;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class GymService {
  private gymsCache: Gym[] = [];
  private lastFetchTime: number = 0;
  private CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(private db: Database) {}

  async getGymById(gymId: string): Promise<Gym | null> {
    console.group('getGymById');
    try {
      console.log(`Fetching gym with ID: ${gymId}`);
      const gymRef = ref(this.db, `gyms/${gymId}`);
      const snapshot = await get(gymRef);

      if (!snapshot.exists()) {
        console.warn(`No gym found with ID: ${gymId}`);
        return null;
      }

      const gymData = snapshot.val();
      console.log('Raw gym data:', gymData);

      if (!gymData) {
        console.warn('Gym data is null or undefined');
        return null;
      }

      // Process the gym data similar to getGyms
      const gym = gymData as Partial<Gym>;

      if (!gym.gymInfo) {
        console.warn('Gym is missing gymInfo');
        return null;
      }

      // Check if status is not explicitly set to 'inactive'
      if (gym.gymInfo.status === 'inactive') {
        console.log('Gym is inactive');
        return null;
      }

      // Check if schedule exists at root level or inside gymInfo
      let scheduleData = (gym as any)['schedule'] || gym.gymInfo?.schedule;
      // Convert scheduleData to array if it's an object (map)
      if (scheduleData && !Array.isArray(scheduleData)) {
        scheduleData = Object.values(scheduleData);
      }

      const processedGym: Gym = {
        id: gymId,
        ...gym,
        // Address is now at root level
        gym_address: gym.gym_address || 'Address not provided',
        gymInfo: {
          name: gym.gymInfo?.name || 'Unnamed Gym',
          district: gym.gymInfo?.district || 'District not provided',
          businessHours: gym.gymInfo?.businessHours || 'Not specified',
          schedule: scheduleData,
          fitnessType: gym.gymInfo?.fitnessType || 'General',
          status: gym.gymInfo?.status || 'active',
          image: gym.gym_logo?.data || 'assets/images/default-gym.png',
          classTypes: gym.gymInfo?.classTypes || [],
          classTypesList: gym.gymInfo?.classTypesList || [],
          size: gym.gymInfo?.size || '',
          paymentInfo: gym.gymInfo?.paymentInfo || {},
        },
        gym_logo: gym.gym_logo,
      };

      console.log('Processed gym:', processedGym);
      return processedGym;
    } catch (error) {
      console.error(`Error in getGymById:`, error);

      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      throw error;
    } finally {
      console.groupEnd();
    }
  }

  async getGyms(forceRefresh = false): Promise<Gym[]> {
    const now = Date.now();
    // 1. Check in-memory cache
    if (!forceRefresh && this.gymsCache.length > 0 && (now - this.lastFetchTime < this.CACHE_DURATION)) {
      return this.gymsCache;
    }
    // 2. Check localStorage cache
    const cachedGyms = localStorage.getItem('gyms');
    const cacheTime = localStorage.getItem('gyms_cache_time');
    if (!forceRefresh && cachedGyms && cacheTime && (now - parseInt(cacheTime, 10) < this.CACHE_DURATION)) {
      // Use minimal gyms from cache for display, but fetch full data in background if needed
      this.gymsCache = JSON.parse(cachedGyms);
      this.lastFetchTime = parseInt(cacheTime, 10);
      return this.gymsCache;
    }
    // 3. Fetch from database
    const gymsRef = ref(this.db, 'gyms');
    const snapshot = await get(gymsRef);
    if (!snapshot.exists()) return [];
    const gymsData = snapshot.val() as Record<string, any>;
    const gyms: Gym[] = Object.entries(gymsData)
      .map(([id, gymData]) => ({ id, ...gymData }))
      .filter(gym => gym.gymInfo && gym.gymInfo.status !== 'inactive');
    // 4. Update caches
    this.gymsCache = gyms;
    this.lastFetchTime = now;
    localStorage.setItem('gyms', JSON.stringify(this.getMinimalGymsForCache(gyms)));
    localStorage.setItem('gyms_cache_time', now.toString());
    return gyms;
  }

  // Helper to get minimal gym data for localStorage
  private getMinimalGymsForCache(gyms: Gym[]): any[] {
    return gyms.map(gym => ({
      id: gym.id,
      gymInfo: {
        name: gym.gymInfo?.name,
        district: gym.gymInfo?.district,
        classTypes: gym.gymInfo?.classTypes,
        fitnessType: gym.gymInfo?.fitnessType,
      },
      gym_address: gym.gym_address,
    }));
  }
}
