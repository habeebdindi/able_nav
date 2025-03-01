import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { GPXData, GeoPoint } from '../types';
import { parseGPXContent } from '../utils/gpxParser';
import { getCurrentLocation } from '../utils/locationService';
import AccessibleMap from '../components/AccessibleMap';

// Sample GPX data
const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AbleNav">
  <metadata>
    <name>Campus Main Accessible Routes</name>
    <time>2023-03-01T12:00:00Z</time>
  </metadata>
  <wpt lat="37.7850" lon="-122.4064">
    <name>Main Entrance</name>
    <desc>Accessible entrance to the main building</desc>
    <type>entrance</type>
  </wpt>
  <wpt lat="37.7852" lon="-122.4062">
    <name>Elevator 1</name>
    <desc>Main building elevator</desc>
    <type>elevator</type>
  </wpt>
  <wpt lat="37.7855" lon="-122.4060">
    <name>Accessible Restroom</name>
    <desc>First floor accessible restroom</desc>
    <type>restroom</type>
  </wpt>
  <wpt lat="37.7858" lon="-122.4058">
    <name>Ramp to Cafeteria</name>
    <desc>Wheelchair accessible ramp to cafeteria</desc>
    <type>ramp</type>
  </wpt>
  <trk>
    <name>Main Path</name>
    <trkseg>
      <trkpt lat="37.7850" lon="-122.4064">
        <ele>10</ele>
        <time>2023-03-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7851" lon="-122.4063">
        <ele>10</ele>
        <time>2023-03-01T12:00:10Z</time>
      </trkpt>
      <trkpt lat="37.7852" lon="-122.4062">
        <ele>10</ele>
        <time>2023-03-01T12:00:20Z</time>
      </trkpt>
      <trkpt lat="37.7853" lon="-122.4061">
        <ele>10</ele>
        <time>2023-03-01T12:00:30Z</time>
      </trkpt>
      <trkpt lat="37.7854" lon="-122.4060">
        <ele>10</ele>
        <time>2023-03-01T12:00:40Z</time>
      </trkpt>
      <trkpt lat="37.7855" lon="-122.4060">
        <ele>10</ele>
        <time>2023-03-01T12:00:50Z</time>
      </trkpt>
      <trkpt lat="37.7856" lon="-122.4059">
        <ele>10</ele>
        <time>2023-03-01T12:01:00Z</time>
      </trkpt>
      <trkpt lat="37.7857" lon="-122.4058">
        <ele>10</ele>
        <time>2023-03-01T12:01:10Z</time>
      </trkpt>
      <trkpt lat="37.7858" lon="-122.4058">
        <ele>10</ele>
        <time>2023-03-01T12:01:20Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parse the sample GPX data
      const parsedData = parseGPXContent(SAMPLE_GPX);
      
      // Validate the parsed data
      if (!parsedData.tracks || parsedData.tracks.length === 0) {
        console.warn('No tracks found in GPX data');
      }
      
      if (!parsedData.waypoints || parsedData.waypoints.length === 0) {
        console.warn('No waypoints found in GPX data');
      }
      
      setGpxData(parsedData);
      
      // Get user location
      try {
        const location = await getCurrentLocation();
        if (location) {
          setUserLocation(location);
        } else {
          console.warn('Could not get user location');
        }
      } catch (locationError) {
        console.error('Error getting location:', locationError);
        // Continue without location
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError('Failed to load navigation data. Please try again.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleRefreshLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
      } else {
        Alert.alert('Location Error', 'Unable to get your current location. Please check your location permissions.');
      }
    } catch (err) {
      console.error('Error refreshing location:', err);
      Alert.alert('Error', 'Failed to update your location. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading navigation data...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => {
            initializeApp();
          }}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <AccessibleMap 
          gpxData={gpxData || undefined}
          userLocation={userLocation || undefined}
          initialRegion={
            userLocation ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            } : undefined
          }
        />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleRefreshLocation}
        >
          <Text style={styles.buttonText}>Refresh Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen; 