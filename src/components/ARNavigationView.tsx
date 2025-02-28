import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { ARNavigationPoint, ARNavigationPath, AccessibilityFeature, BuildingPlan, Floor } from '../types';
import { getBuildingPlanById, getFloorById, coordinateToFloorPosition } from '../services/floorPlanService';

interface ARNavigationViewProps {
  buildingId: string;
  floorId: string;
  destinationFeature?: AccessibilityFeature;
  onClose: () => void;
}

const ARNavigationView: React.FC<ARNavigationViewProps> = ({
  buildingId,
  floorId,
  destinationFeature,
  onClose,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [arPoints, setArPoints] = useState<ARNavigationPoint[]>([]);
  const [arPaths, setArPaths] = useState<ARNavigationPath[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [building, setBuilding] = useState<BuildingPlan | undefined>();
  const [floor, setFloor] = useState<Floor | undefined>();
  const [isNavigating, setIsNavigating] = useState(false);

  // Request camera and location permissions
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      setHasPermission(
        cameraStatus === 'granted' && locationStatus === 'granted'
      );
      
      if (cameraStatus !== 'granted' || locationStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera and location permissions are required for AR navigation.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    })();
  }, []);

  // Load building and floor data
  useEffect(() => {
    const buildingData = getBuildingPlanById(buildingId);
    if (buildingData) {
      setBuilding(buildingData);
      
      const floorData = getFloorById(buildingId, floorId);
      if (floorData) {
        setFloor(floorData);
      }
    }
  }, [buildingId, floorId]);

  // Start location tracking
  useEffect(() => {
    if (!hasPermission || !building || !floor) return;
    
    let locationSubscription: Location.LocationSubscription;
    
    const startLocationTracking = async () => {
      try {
        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        setCurrentLocation(initialLocation);
        
        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: 0.5, // Update every 0.5 meters
            timeInterval: 1000, // Update every 1 second
          },
          (location) => {
            setCurrentLocation(location);
            if (isNavigating) {
              updateARNavigation(location);
            }
          }
        );
      } catch (error) {
        console.error('Error tracking location:', error);
        Alert.alert('Error', 'Failed to track location for AR navigation.');
      }
    };
    
    startLocationTracking();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [hasPermission, building, floor, isNavigating]);

  // Start navigation when destination is set
  useEffect(() => {
    if (destinationFeature && building && floor && currentLocation) {
      startNavigation();
    }
  }, [destinationFeature, building, floor, currentLocation]);

  // Start AR navigation
  const startNavigation = () => {
    if (!destinationFeature || !currentLocation || !building || !floor) return;
    
    // Find a route to the destination or create one
    const existingRoute = floor.routes.find(route => 
      route.points.some(point => 
        point.latitude === destinationFeature.coordinate.latitude && 
        point.longitude === destinationFeature.coordinate.longitude
      )
    );
    
    if (existingRoute) {
      // Use existing route
      createARPathFromRoute(existingRoute.points);
    } else {
      // Create a direct path (in a real app, you would use pathfinding)
      const directPath = [
        {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        destinationFeature.coordinate,
      ];
      
      createARPathFromRoute(directPath);
    }
    
    setIsNavigating(true);
  };

  // Create AR path from route coordinates
  const createARPathFromRoute = (routePoints: { latitude: number; longitude: number }[]) => {
    if (!building || !floor || !currentLocation) return;
    
    // Convert route points to AR points
    const arNavPoints: ARNavigationPoint[] = routePoints.map((point, index) => {
      // Convert geo coordinates to floor position
      const floorPosition = coordinateToFloorPosition(
        point,
        building.id,
        floor.id
      );
      
      if (!floorPosition) return null;
      
      // In a real app, you would convert floor position to AR space
      // This is a simplified example
      const arPosition = {
        x: floorPosition.x / 100, // Scale down for AR space
        y: 0, // On the ground
        z: floorPosition.y / 100, // Scale down for AR space
      };
      
      return {
        id: `point-${index}`,
        type: index === routePoints.length - 1 ? 'destination' : 'waypoint',
        position: arPosition,
        label: index === routePoints.length - 1 ? destinationFeature?.title : undefined,
        featureId: index === routePoints.length - 1 ? destinationFeature?.id : undefined,
      };
    }).filter(Boolean) as ARNavigationPoint[];
    
    setArPoints(arNavPoints);
    
    // Create AR path
    if (arNavPoints.length >= 2) {
      const arNavPath: ARNavigationPath = {
        id: 'main-path',
        points: arNavPoints,
        color: '#4A80F0',
        width: 0.2,
      };
      
      setArPaths([arNavPath]);
    }
  };

  // Update AR navigation based on current location
  const updateARNavigation = (location: Location.LocationObject) => {
    if (!building || !floor || !destinationFeature) return;
    
    // In a real app, you would update the AR elements based on the user's position and orientation
    // This is a simplified example
    
    // Check if user has reached the destination
    const distanceToDestination = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      destinationFeature.coordinate.latitude,
      destinationFeature.coordinate.longitude
    );
    
    if (distanceToDestination < 5) { // Within 5 meters
      Alert.alert(
        'Destination Reached',
        `You have arrived at ${destinationFeature.title}.`,
        [{ text: 'OK', onPress: () => setIsNavigating(false) }]
      );
    }
  };

  // Calculate distance between two coordinates in meters
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  // Render AR elements (in a real app, this would use AR libraries)
  const renderARElements = () => {
    // This is a placeholder for actual AR rendering
    // In a real app, you would use AR libraries to render 3D elements
    return (
      <View style={styles.arOverlay}>
        {destinationFeature && (
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationTitle}>{destinationFeature.title}</Text>
            <Text style={styles.destinationDescription}>{destinationFeature.description}</Text>
          </View>
        )}
        
        {isNavigating && (
          <View style={styles.navigationInfo}>
            <Text style={styles.navigationText}>
              Follow the blue path to your destination
            </Text>
            
            {/* Add directional arrows - this is a simplified version without true AR */}
            <View style={styles.directionalGuidance}>
              <View style={styles.arrowContainer}>
                <Text style={styles.arrowIcon}>⬆️</Text>
                <Text style={styles.arrowLabel}>10m ahead</Text>
              </View>
              
              {/* Show distance to destination */}
              <View style={styles.distanceContainer}>
                <Text style={styles.distanceText}>
                  {currentLocation && destinationFeature?.coordinate ? 
                    `${calculateDistance(
                      currentLocation.coords.latitude,
                      currentLocation.coords.longitude,
                      destinationFeature.coordinate.latitude,
                      destinationFeature.coordinate.longitude
                    ).toFixed(1)} meters to destination` : 
                    'Calculating distance...'}
                </Text>
              </View>
              
              {/* Add turn-by-turn instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionText}>
                  {arPaths.length > 0 ? 'Turn right at the next corner' : 'Proceed straight ahead'}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Add AR path visualization (simplified) */}
        {isNavigating && arPaths.length > 0 && (
          <View style={styles.arPathVisualization}>
            {arPaths.map((path, index) => (
              <View 
                key={`path-${index}`} 
                style={[
                  styles.arPathSegment,
                  { 
                    width: 20, 
                    height: 20,
                    bottom: 100 + (index * 40),
                    left: '50%'
                  }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <CameraView 
          style={styles.camera} 
          facing="back"
          ratio="16:9"
        >
          {renderARElements()}
          
          <View style={styles.controls}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            {!isNavigating && destinationFeature && (
              <TouchableOpacity style={styles.startButton} onPress={startNavigation}>
                <Text style={styles.startButtonText}>
                  Start Navigation to {destinationFeature.title}
                </Text>
              </TouchableOpacity>
            )}
            
            {isNavigating && (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={() => setIsNavigating(false)}
              >
                <Text style={styles.stopButtonText}>Stop Navigation</Text>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      ) : (
        <View style={styles.container}>
          <Text>No access to camera or location</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  arOverlay: {
    flex: 1,
    position: 'relative',
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -400, // Adjust based on your UI
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  destinationInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 16,
  },
  destinationTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  destinationDescription: {
    color: '#FFF',
    fontSize: 14,
  },
  navigationInfo: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(74, 128, 240, 0.7)',
    borderRadius: 8,
    padding: 12,
  },
  navigationText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  directionalGuidance: {
    marginTop: 20,
    alignItems: 'center',
  },
  arrowContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  arrowIcon: {
    fontSize: 40,
  },
  arrowLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  distanceContainer: {
    marginVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  distanceText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(74, 128, 240, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arPathVisualization: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  arPathSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 128, 240, 0.7)',
    borderRadius: 10,
  },
});

export default ARNavigationView; 