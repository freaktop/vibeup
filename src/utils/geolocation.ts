import { Geolocation } from '@capacitor/geolocation';
import { logger } from './logger';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Get user's current location
 */
export async function getCurrentLocation(): Promise<Location | null> {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy || undefined,
    };
  } catch (error: any) {
    logger.error('Error getting location:', error);
    
    // Return default location (NYC) if permission denied or unavailable
    if (error.code === 1) {
      logger.warn('Location permission denied. Using default location.');
    }
    
    return {
      latitude: 40.7128, // NYC default
      longitude: -74.0060,
    };
  }
}

/**
 * Watch user's location (for real-time updates)
 */
export async function watchLocation(
  callback: (location: Location) => void
): Promise<string | null> {
  try {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
        });
      }
    );

    return watchId;
  } catch (error) {
    logger.error('Error watching location:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (in miles)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
