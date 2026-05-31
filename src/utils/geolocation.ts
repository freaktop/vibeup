import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { usCities } from '../data/cities';
import { logger } from './logger';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Get user's current location (works on web and native)
 */
export async function getCurrentLocation(): Promise<Location | null> {
  const result = await getCurrentLocationWithError();
  return result.location;
}

/**
 * Get location with user-friendly error message for UI
 */
export async function getCurrentLocationWithError(): Promise<{
  location: Location | null;
  error?: string;
}> {
  try {
    if (Capacitor.isNativePlatform()) {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });
      return {
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
        },
      };
    }

    // Web: use navigator.geolocation (requires HTTPS)
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const msg =
          typeof window !== 'undefined' && window.location?.protocol !== 'https:' && !window.location?.hostname?.includes('localhost')
            ? 'Location requires HTTPS. Use a secure connection.'
            : 'Geolocation is not supported by your browser.';
        logger.warn('Geolocation not supported');
        resolve({ location: null, error: msg });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || undefined,
            },
          }),
        (err) => {
          logger.warn('Geolocation error:', err.message);
          let msg = 'Unable to get your location.';
          if (err.code === 1) {
            msg = 'Location permission denied. Please enable location access in your browser or device settings.';
          } else if (err.code === 2) {
            msg = 'Location unavailable. Please check your device settings.';
          } else if (err.code === 3) {
            msg = 'Location request timed out. Please try again.';
          } else if (err.message) {
            msg = err.message;
          }
          resolve({ location: null, error: msg });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  } catch (error: any) {
    logger.error('Error getting location:', error);
    return {
      location: null,
      error: error?.message || 'Unable to get your location. Please try again.',
    };
  }
}

/**
 * Watch user's location (for real-time updates) - native only
 */
export async function watchLocation(
  callback: (location: Location) => void
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position) => {
        if (!position) return;
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

/**
 * Get lat/lng for a city string like "New York, NY" or "Chicago, IL"
 */
export function getCityCoords(cityStr: string | undefined): { lat: number; lng: number } | null {
  if (!cityStr || cityStr === 'Near Me') return null;
  const parts = cityStr.split(',').map((s) => s.trim());
  const cityName = parts[0];
  const state = parts[1]?.toUpperCase() || '';
  const match = usCities.find(
    (c) =>
      c.name.toLowerCase() === cityName?.toLowerCase() && (!state || c.state === state),
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}

/**
 * Enrich profiles with distance from user location (uses currentCity for profile coords)
 */
export async function enrichProfilesWithDistance<T extends { currentCity?: string; lat?: number; lng?: number; distance?: number }>(
  profiles: T[],
): Promise<T[]> {
  const userLoc = await getCurrentLocation();
  if (!userLoc) return profiles;

  return profiles.map((p) => {
    let lat: number | undefined;
    let lng: number | undefined;
    if (p.lat != null && p.lng != null) {
      lat = p.lat;
      lng = p.lng;
    } else {
      const coords = getCityCoords(p.currentCity);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }
    if (lat == null || lng == null) return p;
    const distance = calculateDistance(userLoc.latitude, userLoc.longitude, lat, lng);
    return { ...p, distance: Math.round(distance * 10) / 10 };
  });
}
