import { Injectable } from '@angular/core';
import { Database, ref, get } from '@angular/fire/database';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Gym {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  coordinates?: Coordinates;
  image?: string;
  gym_logo?:
    | {
        data?: string;
      }
    | string;
  distance?: number;
  gymInfo?: {
    name: string;
    image?: string;
  };
  gym_address?: string;
  isQuezonCity?: boolean;
  originalData?: any;
  geocodeSource?: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
}

@Injectable({
  providedIn: 'root',
})
export class GymDataService {
  constructor(private database: Database) {}

  async loadGyms(): Promise<Gym[]> {
    const gymsRef = ref(this.database, 'gyms');
    const snapshot = await get(gymsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const gymsData = snapshot.val();
    const gymsArray = Object.keys(gymsData).map((key) => {
      const gym = {
        ...gymsData[key],
        originalData: { ...gymsData[key] },
      };

      // Process gym logo
      if (gym.gym_logo && gym.gym_logo.data) {
        if (!gym.gym_logo.data.startsWith('http')) {
          // Could add logging here if needed
        }
      } else {
        gym.gym_logo = gym.gym_logo || {};
        gym.gym_logo.data = 'assets/icon/gym-placeholder.png';
      }

      return {
        id: key,
        ...gym,
      };
    });

    // Remove duplicate gyms by id
    const uniqueGymsMap = new Map<string, Gym>();
    gymsArray.forEach((gym) => {
      if (!uniqueGymsMap.has(gym.id)) {
        uniqueGymsMap.set(gym.id, gym);
      }
    });
    const uniqueGymsArray = Array.from(uniqueGymsMap.values());

    return uniqueGymsArray;
  }

  async processGymsLocation(
    gymsArray: Gym[],
    geocodeAddress: (address: string) => Promise<GeocodingResult | null>,
    isInQuezonCity: (lat: number, lng: number) => boolean
  ): Promise<Gym[]> {
    const gymsWithLocation: Gym[] = [];

    for (const gym of gymsArray) {
      try {
        let lat: number | null = null;
        let lng: number | null = null;
        let source = 'database';

        // Try existing coordinates first
        if (gym.latitude !== undefined && gym.longitude !== undefined) {
          const parsedLat = parseFloat(gym.latitude as any);
          const parsedLng = parseFloat(gym.longitude as any);

          if (
            !isNaN(parsedLat) &&
            !isNaN(parsedLng) &&
            Math.abs(parsedLat) <= 90 &&
            Math.abs(parsedLng) <= 180
          ) {
            lat = parsedLat;
            lng = parsedLng;
          }
        }

        // Geocode address if no valid coordinates
        if ((lat === null || lng === null) && gym.gym_address) {
          const result = await geocodeAddress(gym.gym_address);
          if (result) {
            lat = result.lat;
            lng = result.lng;
            source = 'geocoding';
          }
        }

        // Add gym if valid coordinates found
        if (lat !== null && lng !== null) {
          const processedGym: Gym = {
            ...gym,
            coordinates: { lat, lng },
            isQuezonCity: isInQuezonCity(lat, lng),
            geocodeSource: source,
          };

          gymsWithLocation.push(processedGym);
        }
      } catch (error) {
        // Could add logging here if needed
      }
    }

    return gymsWithLocation;
  }

  categorizeGyms(
    gyms: Gym[],
    userLocation: Coordinates | null
  ): { nearestGyms: Gym[]; quezonCityGyms: Gym[] } {
    const quezonCityGyms = gyms.filter((gym) => gym.isQuezonCity);

    const userLat = userLocation?.lat ?? 14.658878;
    const userLng = userLocation?.lng ?? 121.052753;

    if (userLat === undefined || userLng === undefined) {
      return { nearestGyms: [], quezonCityGyms };
    }

    function haversineDistance(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ) {
      const toRad = (x: number) => (x * Math.PI) / 180;
      const R = 6371; // Earth radius in km
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    gyms.forEach((gym) => {
      if (gym.coordinates) {
        gym.distance = haversineDistance(
          userLat,
          userLng,
          gym.coordinates.lat,
          gym.coordinates.lng
        );
      } else {
        gym.distance = undefined;
      }
    });

    const nearestGyms = gyms.filter(
      (gym) => gym.distance !== undefined && gym.distance <= 5
    );

    return { nearestGyms, quezonCityGyms };
  }
}
