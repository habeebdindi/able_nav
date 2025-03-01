import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { GPXData } from '../types';

interface AccessibleMapProps {
  gpxData?: GPXData;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

const AccessibleMap: React.FC<AccessibleMapProps> = ({ gpxData, userLocation, initialRegion }) => {
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  
  // Use effect to catch any rendering errors
  useEffect(() => {
    try {
      // Validate gpxData structure
      if (gpxData) {
        if (!Array.isArray(gpxData.tracks)) {
          setMapError('Invalid tracks data structure');
        }
        if (!Array.isArray(gpxData.waypoints)) {
          setMapError('Invalid waypoints data structure');
        }
      }
    } catch (error) {
      setMapError('Error initializing map data');
      console.error('Map initialization error:', error);
    }
  }, [gpxData]);

  // Render waypoint markers with different colors based on type
  const renderWaypoints = () => {
    if (!gpxData || !gpxData.waypoints || !mapReady) return null;

    return gpxData.waypoints.map((waypoint, index) => {
      // Determine marker color based on waypoint name
      let pinColor = '#1a73e8'; // Default blue
      
      const name = waypoint.name?.toLowerCase() || '';
      if (name.includes('elevator')) {
        pinColor = '#4caf50'; // Green for elevators
      } else if (name.includes('ramp')) {
        pinColor = '#ff9800'; // Orange for ramps
      } else if (name.includes('restroom') || name.includes('bathroom')) {
        pinColor = '#9c27b0'; // Purple for restrooms
      } else if (name.includes('entrance') || name.includes('exit')) {
        pinColor = '#f44336'; // Red for entrances/exits
      }
      
      return (
        <Marker
          coordinate={{
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
          }}
          title={waypoint.name}
          description={waypoint.description}
          pinColor={pinColor}
          key={`waypoint-${index}`}
        />
      );
    });
  };

  // Render track polylines
  const renderTracks = () => {
    if (!gpxData || !gpxData.tracks || !mapReady) return null;

    return gpxData.tracks.map((track, trackIndex) => (
      <Polyline
        coordinates={track.points}
        strokeWidth={5}
        strokeColor="#1a73e8"
        lineDashPattern={[0]}
        key={`track-${trackIndex}`}
      />
    ));
  };

  if (mapError) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Map error: {mapError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion || {
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={true}
        onMapReady={() => setMapReady(true)}
      >
        {renderWaypoints()}
        {renderTracks()}
        {userLocation && mapReady && (
          <Marker
            coordinate={userLocation}
            title="You are here"
            pinColor="#4285F4"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default AccessibleMap;