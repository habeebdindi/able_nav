import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Callout } from 'react-native-maps';
import { GPXData, GeoPoint, NavigationRoute } from '../types';
import { calculateRoute } from '../utils/navigationService';

interface AccessibleMapProps {
  gpxData?: GPXData;
  userLocation?: GeoPoint;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onNavigateToWaypoint?: (waypoint: GeoPoint, waypointName: string) => void;
  highlightedTrack?: GeoPoint[];
  navigationRoute?: NavigationRoute;
}

const AccessibleMap: React.FC<AccessibleMapProps> = ({ 
  gpxData, 
  userLocation, 
  initialRegion,
  onNavigateToWaypoint,
  highlightedTrack,
  navigationRoute
}) => {
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<{
    waypoint: GeoPoint;
    name: string;
  } | null>(null);
  const [highlightedTrackState, setHighlightedTrackState] = useState<GeoPoint[] | null>(null);
  
  // Update highlighted track when prop changes
  useEffect(() => {
    if (highlightedTrack) {
      setHighlightedTrackState(highlightedTrack);
    }
  }, [highlightedTrack]);

  // Use effect to catch any rendering errors
  useEffect(() => {
    try {
      // Validate gpxData structure
      if (gpxData) {
        console.log('AccessibleMap received gpxData:', 
          `tracks: ${gpxData.tracks?.length || 0}, ` +
          `waypoints: ${gpxData.waypoints?.length || 0}`
        );
        
        if (!Array.isArray(gpxData.tracks)) {
          setMapError('Invalid tracks data structure');
        }
        if (!Array.isArray(gpxData.waypoints)) {
          setMapError('Invalid waypoints data structure');
        }
        
        // Check if tracks have points
        if (gpxData.tracks && gpxData.tracks.length > 0) {
          const totalPoints = gpxData.tracks.reduce((sum, track) => sum + (track.points?.length || 0), 0);
          console.log(`Total track points: ${totalPoints}`);
          
          if (totalPoints === 0) {
            console.warn('No track points found in GPX data');
          }
        }
      }
    } catch (error) {
      setMapError('Error initializing map data');
      console.error('Map initialization error:', error);
    }
  }, [gpxData]);

  // Calculate navigation route when a waypoint is selected and user location is available
  useEffect(() => {
    // Only notify parent component if all conditions are met and we haven't already notified
    if (selectedWaypoint && userLocation && onNavigateToWaypoint && !navigationRoute) {
      console.log('AccessibleMap: Notifying parent about navigation to', selectedWaypoint.name);
      // Only notify the parent component, let it handle the route calculation
      onNavigateToWaypoint(selectedWaypoint.waypoint, selectedWaypoint.name);
    }
  }, [selectedWaypoint, userLocation, onNavigateToWaypoint, navigationRoute]);

  // Handle waypoint selection
  const handleWaypointPress = (waypoint: GeoPoint, name: string) => {
    // Prevent selecting a new waypoint if one is already selected or if navigation is in progress
    if (selectedWaypoint || navigationRoute) {
      console.log('Navigation already in progress, ignoring waypoint selection');
      return;
    }
    console.log('Selected waypoint:', name);
    setSelectedWaypoint({ waypoint, name });
  };

  // Cancel navigation
  const handleCancelNavigation = () => {
    console.log('AccessibleMap: Cancelling navigation');
    setSelectedWaypoint(null);
  };

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
      } else if (name.includes('restroom') || name.includes('bathroom') || name.includes('facility')) {
        pinColor = '#9c27b0'; // Purple for restrooms
      } else if (name.includes('entrance') || name.includes('exit')) {
        pinColor = '#f44336'; // Red for entrances/exits
      } else if (name.includes('wheelchair')) {
        pinColor = '#EECC22'; // Yellow for wheelchair specific points
      }
      
      const isSelected = selectedWaypoint?.waypoint.latitude === waypoint.latitude && 
                         selectedWaypoint?.waypoint.longitude === waypoint.longitude;
      
      return (
        <Marker
          coordinate={{
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
          }}
          title={waypoint.name}
          description={waypoint.description || 'Tap to navigate'}
          pinColor={pinColor}
          key={`waypoint-${index}`}
          onCalloutPress={() => handleWaypointPress(waypoint, waypoint.name)}
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{waypoint.name}</Text>
              {waypoint.description && (
                <Text style={styles.calloutDescription}>{waypoint.description}</Text>
              )}
              <TouchableOpacity 
                style={styles.calloutButton}
                onPress={() => handleWaypointPress(waypoint, waypoint.name)}
              >
                <Text style={styles.calloutButtonText}>Navigate Here</Text>
              </TouchableOpacity>
            </View>
          </Callout>
        </Marker>
      );
    });
  };

  // Render track polylines
  const renderTracks = () => {
    if (!gpxData || !gpxData.tracks || !mapReady) return null;

    return gpxData.tracks.map((track, trackIndex) => {
      // Skip tracks with no points
      if (!track.points || track.points.length === 0) return null;
      
      console.log(`Rendering track ${trackIndex} with ${track.points.length} points`);
      
      // Check if this is a highlighted accessible track
      const isHighlighted = highlightedTrackState !== null && 
        track.points.some(p => 
          highlightedTrackState.some(hp => 
            hp.latitude === p.latitude && hp.longitude === p.longitude
          )
        );
      
      return (
        <Polyline
          coordinates={track.points}
          strokeWidth={isHighlighted ? 7 : 5}
          strokeColor={isHighlighted ? "#4CAF50" : "#1a73e8"}
          lineDashPattern={isHighlighted ? [0] : [0]}
          key={`track-${trackIndex}`}
        />
      );
    });
  };

  // Render highlighted accessible route
  const renderHighlightedTrack = () => {
    if (!highlightedTrackState || !mapReady) return null;
    
    return (
      <Polyline
        coordinates={highlightedTrackState}
        strokeWidth={7}
        strokeColor="#4CAF50"
        lineDashPattern={[0]}
        key="highlighted-track"
      />
    );
  };

  // Render navigation route
  const renderNavigationRoute = () => {
    if (!navigationRoute || !mapReady) return null;
    
    return (
      <Polyline
        coordinates={navigationRoute.steps.map(step => step.startPoint).concat([navigationRoute.destination])}
        strokeWidth={6}
        strokeColor="#4CAF50"
        lineDashPattern={[5, 5]}
      />
    );
  };

  const renderDebugInfo = () => {
    if (!gpxData) return null;
    
    return (
      <ScrollView style={styles.debugScrollView}>
        <Text style={styles.debugTitle}>GPX Data Debug Info:</Text>
        <Text style={styles.debugText}>Metadata: {JSON.stringify(gpxData.metadata)}</Text>
        
        <Text style={styles.debugSubtitle}>Waypoints ({gpxData.waypoints.length}):</Text>
        {gpxData.waypoints.map((waypoint, index) => (
          <Text key={`wp-${index}`} style={styles.debugText}>
            {index}: {waypoint.name} ({waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)})
          </Text>
        ))}
        
        <Text style={styles.debugSubtitle}>Tracks ({gpxData.tracks.length}):</Text>
        {gpxData.tracks.map((track, index) => (
          <Text key={`trk-${index}`} style={styles.debugText}>
            {index}: {track.name} - {track.points.length} points
          </Text>
        ))}
        
        {gpxData.tracks.length > 0 && gpxData.tracks[0].points.length > 0 && (
          <>
            <Text style={styles.debugSubtitle}>First Track Points Sample:</Text>
            {gpxData.tracks[0].points.slice(0, 3).map((point, index) => (
              <Text key={`pt-${index}`} style={styles.debugText}>
                {index}: ({point.latitude.toFixed(6)}, {point.longitude.toFixed(6)})
                {point.elevation ? ` ele: ${point.elevation}m` : ''}
                {point.speed ? ` speed: ${point.speed}m/s` : ''}
              </Text>
            ))}
          </>
        )}
        
        {navigationRoute && (
          <>
            <Text style={styles.debugSubtitle}>Navigation Route:</Text>
            <Text style={styles.debugText}>
              Distance: {navigationRoute.totalDistance.toFixed(1)}m, 
              Steps: {navigationRoute.steps.length}
            </Text>
          </>
        )}
      </ScrollView>
    );
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
          latitude: -1.9291356, // Default to the location in your GPX file
          longitude: 30.152598,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
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
        {renderTracks()}
        {renderHighlightedTrack()}
        {renderWaypoints()}
        {renderNavigationRoute()}
        {userLocation && mapReady && (
          <Marker
            coordinate={userLocation}
            title="You are here"
            pinColor="#4285F4"
          />
        )}
      </MapView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => setShowDebug(!showDebug)}
        >
          <Text style={styles.debugButtonText}>{showDebug ? 'Hide Debug' : 'Show Debug'}</Text>
        </TouchableOpacity>
        
        {selectedWaypoint && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelNavigation}
          >
            <Text style={styles.cancelButtonText}>Cancel Navigation</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showDebug && renderDebugInfo()}
      
      {selectedWaypoint && (
        <View style={styles.navigationInfo}>
          <Text style={styles.navigationTitle}>
            Navigating to: {selectedWaypoint.name}
          </Text>
          {navigationRoute && (
            <Text style={styles.navigationDetails}>
              Distance: {navigationRoute.totalDistance < 1000 
                ? `${Math.round(navigationRoute.totalDistance)}m` 
                : `${(navigationRoute.totalDistance / 1000).toFixed(1)}km`}
            </Text>
          )}
        </View>
      )}
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
  buttonContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  debugButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
  },
  debugScrollView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
  },
  debugTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugSubtitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    marginBottom: 2,
  },
  callout: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  calloutButton: {
    backgroundColor: '#1a73e8',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  navigationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  navigationDetails: {
    fontSize: 14,
    color: '#666',
  },
});

export default AccessibleMap;