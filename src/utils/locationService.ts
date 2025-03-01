import * as Location from 'expo-location';
import { GeoPoint } from '../types';

/**
 * Request location permissions from the user
 * @returns A boolean indicating whether permissions were granted
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

/**
 * Get the current location of the device
 * @returns The current location as a GeoPoint or null if unavailable
 */
export const getCurrentLocation = async (): Promise<GeoPoint | null> => {
  try {
    const hasPermission = await requestLocationPermissions();
    
    if (!hasPermission) {
      console.warn('Location permission not granted');
      return null;
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Calculate the distance between two points in meters using the Haversine formula
 * @param point1 The first geographic point
 * @param point2 The second geographic point
 * @returns The distance in meters
 */
export const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
  // Implementation of the Haversine formula
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters
  
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);
  const deltaLat = toRad(point2.latitude - point1.latitude);
  const deltaLon = toRad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * 
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
};

// Alias for calculateDistance to match the function name used in navigationService
export const getDistanceBetweenPoints = calculateDistance;

/**
 * Calculate the bearing between two points in degrees
 * @param point1 The starting point
 * @param point2 The ending point
 * @returns The bearing in degrees (0-360)
 */
export const getBearingBetweenPoints = (point1: GeoPoint, point2: GeoPoint): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const toDeg = (value: number) => (value * 180) / Math.PI;
  
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);
  const lon1 = toRad(point1.longitude);
  const lon2 = toRad(point2.longitude);
  
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  
  let bearing = toDeg(Math.atan2(y, x));
  
  // Normalize to 0-360
  bearing = (bearing + 360) % 360;
  
  return bearing;
};

/**
 * Find the nearest point in an array of points to a reference point
 * @param referencePoint The reference point
 * @param points Array of points to search
 * @returns The nearest point and its distance in meters
 */
export const findNearestPoint = (
  referencePoint: GeoPoint,
  points: GeoPoint[]
): { point: GeoPoint; distance: number } | null => {
  if (!points.length) return null;
  
  let nearestPoint = points[0];
  let minDistance = calculateDistance(referencePoint, nearestPoint);
  
  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(referencePoint, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = points[i];
    }
  }
  
  return {
    point: nearestPoint,
    distance: minDistance,
  };
};
