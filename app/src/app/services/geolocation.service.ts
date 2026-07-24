import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeolocationService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {
    // Service initialization - no test needed
  }

  // Calculate distance between two points in kilometers using Haversine formula
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    debugInfo?: any
  ): number {
    const isDevelopment = !environment.production;
    
    if (isDevelopment) {
      console.groupCollapsed(
        `[DISTANCE] ${debugInfo?.gymName || 'Unknown'} (${
          debugInfo?.gymId || '?'
        })`
      );
    }

    // Input validation
    if (
      lat1 === undefined ||
      lon1 === undefined ||
      lat2 === undefined ||
      lon2 === undefined
    ) {
      if (isDevelopment) {
        console.error('❌ Missing coordinate values', { lat1, lon1, lat2, lon2 });
        console.groupEnd();
      }
      return Infinity;
    }

    // Convert coordinates to numbers
    lat1 = Number(lat1);
    lon1 = Number(lon1);
    lat2 = Number(lat2);
    lon2 = Number(lon2);

    if (isDevelopment) {
      console.log('📍 Coordinates:');
      console.log(`  User: ${lat1.toFixed(6)}, ${lon1.toFixed(6)}`);
      console.log(`  Gym:  ${lat2.toFixed(6)}, ${lon2.toFixed(6)}`);
    }

    // Validate coordinate ranges
    if (
      Math.abs(lat1) > 90 ||
      Math.abs(lat2) > 90 ||
      Math.abs(lon1) > 180 ||
      Math.abs(lon2) > 180
    ) {
      if (isDevelopment) {
        console.error('❌ Invalid coordinate values', { lat1, lon1, lat2, lon2 });
        console.groupEnd();
      }
      return Infinity;
    }

    // Check if coordinates are swapped (common error)
    if (
      (Math.abs(lat1) > 90 || Math.abs(lon1) > 180) &&
      Math.abs(lat1) <= 180 &&
      Math.abs(lon1) <= 90
    ) {
      if (isDevelopment) {
        console.warn('⚠️ Possible swapped coordinates in point A', {
          lat: lat1,
          lng: lon1,
        });
      }
    }
    if (
      (Math.abs(lat2) > 90 || Math.abs(lon2) > 180) &&
      Math.abs(lat2) <= 180 &&
      Math.abs(lon2) <= 90
    ) {
      if (isDevelopment) {
        console.warn('⚠️ Possible swapped coordinates in point B', {
          lat: lat2,
          lng: lon2,
        });
      }
    }

    // Convert degrees to radians
    const radLat1 = this.deg2rad(lat1);
    const radLon1 = this.deg2rad(lon1);
    const radLat2 = this.deg2rad(lat2);
    const radLon2 = this.deg2rad(lon2);

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = radLat2 - radLat1;
    const dLon = radLon2 - radLon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(radLat1) *
        Math.cos(radLat2) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (isDevelopment) {
      // Debug output
      console.log('📐 Haversine Calculation:');
      console.log(`  dLat: ${dLat.toFixed(6)} rad`);
      console.log(`  dLon: ${dLon.toFixed(6)} rad`);
      console.log(`  a: ${a.toFixed(6)}`);
      console.log(`  c: ${c.toFixed(6)}`);
      console.log(`  Distance: ${distance.toFixed(2)} km`);

      // Alternative calculation for verification (development only)
      const dLatAlt = this.deg2rad(lat2 - lat1);
      const dLonAlt = this.deg2rad(lon2 - lon1);
      const aAlt =
        Math.sin(dLatAlt / 2) * Math.sin(dLatAlt / 2) +
        Math.cos(this.deg2rad(lat1)) *
          Math.cos(this.deg2rad(lat2)) *
          Math.sin(dLonAlt / 2) *
          Math.sin(dLonAlt / 2);
      const cAlt = 2 * Math.atan2(Math.sqrt(aAlt), Math.sqrt(1 - aAlt));
      const distanceAlt = R * cAlt;

      console.log('🔍 Verification:');
      console.log(`  Alt Distance: ${distanceAlt.toFixed(2)} km`);
      console.log(
        `  Difference: ${Math.abs(distance - distanceAlt).toFixed(6)} km`
      );

      // Check for suspicious distances
      if (distance > 20000) {
        // Earth's circumference is ~40,075 km
        console.warn(
          '⚠️ Suspiciously large distance - possible coordinate system mismatch'
        );
      }

      console.groupEnd();
    }

    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Find k nearest gyms to user location
  findNearestGyms(
    userLocation: { lat: number | string; lng: number | string },
    gyms: any[],
    k: number = 5
  ) {
    const isDevelopment = !environment.production;
    
    if (isDevelopment) {
      console.group('=== findNearestGyms STARTED ===');
      console.log('User Location Input:', userLocation);
      console.log('Number of Gyms:', gyms?.length || 0);
      console.log('k (max results):', k);
    }

    // Convert user location to numbers
    const userLat =
      typeof userLocation.lat === 'string'
        ? parseFloat(userLocation.lat)
        : userLocation.lat;
    const userLng =
      typeof userLocation.lng === 'string'
        ? parseFloat(userLocation.lng)
        : userLocation.lng;

    if (isDevelopment) {
      console.log('Parsed User Location:', { lat: userLat, lng: userLng });
    }

    // Validate user location
    if (isNaN(userLat) || isNaN(userLng)) {
      if (isDevelopment) {
        console.error('ERROR: Invalid user location:', {
          lat: userLat,
          lng: userLng,
        });
        console.groupEnd();
      }
      return [];
    }

    if (isDevelopment) {
      console.log('Filtering gyms with valid coordinates...');
    }
    
    // Filter out gyms without valid coordinates
    const validGyms = gyms.filter((gym, index) => {
      if (!gym.coordinates) {
        if (isDevelopment) {
          console.warn(
            `[${index}] Gym ${gym.id || 'unknown'} has no coordinates`
          );
        }
        return false;
      }

      const gymLat = parseFloat(gym.coordinates.lat);
      const gymLng = parseFloat(gym.coordinates.lng);
      const hasValidCoords = !isNaN(gymLat) && !isNaN(gymLng);

      if (!hasValidCoords && isDevelopment) {
        console.warn(
          `[${index}] Gym ${gym.id || 'unknown'} has invalid coordinates:`,
          gym.coordinates
        );
      }

      return hasValidCoords;
    });

    if (isDevelopment) {
      console.log(`Found ${validGyms.length} gyms with valid coordinates`);
    }

    if (validGyms.length === 0) {
      if (isDevelopment) {
        console.warn('No gyms with valid coordinates found');
        console.groupEnd();
      }
      return [];
    }

    if (isDevelopment) {
      console.log('Calculating distances...');
    }
    
    // Add distance to each gym with valid coordinates
    const gymsWithDistance = validGyms.map((gym, index) => {
      const gymLat = parseFloat(gym.coordinates.lat);
      const gymLng = parseFloat(gym.coordinates.lng);

      const debugInfo = {
        gymId: gym.id,
        gymName: gym.name,
        index,
        userLocation: { lat: userLat, lng: userLng },
        gymLocation: { lat: gymLat, lng: gymLng },
      };

      if (isDevelopment) {
        console.group(`[${index}] ${gym.name || 'Unnamed Gym'} (${gym.id})`);
        console.log('User Location:', { lat: userLat, lng: userLng });
        console.log('Gym Location:', { lat: gymLat, lng: gymLng });
      }

      const distance = this.calculateDistance(
        userLat,
        userLng,
        gymLat,
        gymLng,
        debugInfo
      );

      if (isDevelopment) {
        console.log('Calculated Distance:', distance, 'km');
        console.groupEnd();
      }

      return {
        ...gym,
        distance,
      };
    });

    // Sort by distance and return k nearest
    const result = gymsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, k);
    
    if (isDevelopment) {
      console.groupEnd();
    }
    
    return result;
  }

  // Geocode address to coordinates
  async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lng: number; display_name: string } | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>('https://nominatim.openstreetmap.org/search', {
          params: {
            q: address,
            format: 'json',
            limit: '1',
          },
        })
      );

      if (response && response.length > 0) {
        return {
          lat: parseFloat(response[0].lat),
          lng: parseFloat(response[0].lon),
          display_name: response[0].display_name || address,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
          },
        })
      );
      return response?.display_name || null;
    } catch (error: unknown) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}
