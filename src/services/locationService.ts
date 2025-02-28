import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Location service to handle all location-related functionality
 */
export class LocationService {
  /**
   * Check if location services are enabled on the device
   */
  static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      const providerStatus = await Location.getProviderStatusAsync();
      return providerStatus.locationServicesEnabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Request location permissions
   */
  static async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get the current location with fallback mechanisms
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      // Check if location services are enabled
      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        console.log('Location services are not enabled');
        return null;
      }

      // Check if we have permission
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        console.log('Location permission not granted');
        return null;
      }

      // Try to get current position with appropriate accuracy for the platform
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: 5000,
          mayShowUserSettingsDialog: true
        });
        
        return location;
      } catch (locationError) {
        console.error('Error getting current position:', locationError);
        
        // Fallback to last known position
        try {
          console.log('Trying to get last known position...');
          const lastKnownLocation = await Location.getLastKnownPositionAsync();
          if (lastKnownLocation) {
            console.log('Using last known position');
            return lastKnownLocation;
          }
        } catch (fallbackError) {
          console.error('Error getting last known position:', fallbackError);
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error in getCurrentLocation:', error);
      return null;
    }
  }

  /**
   * Watch location updates
   */
  static async watchLocation(
    callback: (location: Location.LocationObject) => void,
    errorCallback?: (error: any) => void
  ): Promise<Location.LocationSubscription | null> {
    try {
      // Check if location services are enabled
      const servicesEnabled = await this.isLocationServicesEnabled();
      if (!servicesEnabled) {
        if (errorCallback) {
          errorCallback(new Error('Location services are not enabled'));
        }
        return null;
      }

      // Check if we have permission
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) {
        if (errorCallback) {
          errorCallback(new Error('Location permission not granted'));
        }
        return null;
      }

      // Start watching location
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
          distanceInterval: 1, // Update every 1 meter
          timeInterval: 5000, // Update every 5 seconds
        },
        callback
      );

      return locationSubscription;
    } catch (error) {
      console.error('Error in watchLocation:', error);
      if (errorCallback) {
        errorCallback(error);
      }
      return null;
    }
  }

  /**
   * Get mock location for testing (useful for emulators)
   */
  static getMockLocation(): Location.LocationObject {
    // Default to a location in San Francisco
    return {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
        accuracy: 5,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };
  }
}