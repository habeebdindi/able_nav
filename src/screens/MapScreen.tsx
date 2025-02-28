import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AccessibilityFeature, AccessibleRoute, BuildingPlan, Floor, IndoorPosition } from '../types';
// import { getAccessibilityFeatures, getAccessibleRoutes } from '../services/mockDataService';
import { loadBuildingPlans, getBuildingPlanById, coordinateToFloorPosition, floorPositionToCoordinate, getFloorById } from '../services/floorPlanService';
import IndoorMapView from '../components/IndoorMapView';
import ARNavigationView from '../components/ARNavigationView';
import { LocationService } from '../services/locationService';
import * as Location from 'expo-location';

type MapScreenProps = {
  // We'll use hooks instead of props
};

const MapScreen: React.FC<MapScreenProps> = () => {
  // Use the navigation and route hooks from React Navigation 7
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Map'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Map'>>();
  
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: route.params?.initialLocation?.latitude || -1.9306162,
    longitude: route.params?.initialLocation?.longitude || 30.1529425,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [features, setFeatures] = useState<AccessibilityFeature[]>([]);
  const [routes, setRoutes] = useState<AccessibleRoute[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<AccessibilityFeature | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<AccessibleRoute | null>(null);
  const [showRoutesList, setShowRoutesList] = useState(false);
  
  // Indoor mapping state
  const [buildingPlans, setBuildingPlans] = useState<BuildingPlan[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingPlan | null>(null);
  const [showIndoorMap, setShowIndoorMap] = useState(false);
  const [userIndoorPosition, setUserIndoorPosition] = useState<IndoorPosition | null>(null);
  
  // AR navigation state
  const [showARNavigation, setShowARNavigation] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  
  // Feature prompt modal state
  const [showFeaturePrompt, setShowFeaturePrompt] = useState(false);

  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    // Load building plans regardless of user location
    const loadPlans = async () => {
      try {
        const plans = await loadBuildingPlans();
        setBuildingPlans(plans);
        
        // If we have location data, check if user is near any building
        if (route.params?.initialLocation) {
          const { latitude, longitude } = route.params.initialLocation;
          const nearbyBuilding = findNearbyBuilding(latitude, longitude, plans);
          if (nearbyBuilding) {
            setSelectedBuilding(nearbyBuilding);
          }
        } else {
          // If no location data, try to get current location
          try {
            const currentLocation = await LocationService.getCurrentLocation();
            if (currentLocation) {
              const nearbyBuilding = findNearbyBuilding(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude,
                plans
              );
              if (nearbyBuilding) {
                setSelectedBuilding(nearbyBuilding);
              }
            } else if (__DEV__) {
              // In development, use mock location
              const mockLocation = LocationService.getMockLocation();
              const nearbyBuilding = findNearbyBuilding(
                mockLocation.coords.latitude,
                mockLocation.coords.longitude,
                plans
              );
              if (nearbyBuilding) {
                setSelectedBuilding(nearbyBuilding);
              } else if (plans.length > 0) {
                // If no nearby building found with mock location, just select the first building for testing
                setSelectedBuilding(plans[0]);
              }
            }
          } catch (error) {
            console.error('Error getting current location:', error);
            // If no location data, just select the first building for testing
            if (plans.length > 0) {
              setSelectedBuilding(plans[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading building plans:', error);
      }
      
      setIsLoading(false);
    };
    
    loadPlans();
  }, [route.params?.initialLocation]);

  // Find a building near the user's location with expanded range
  const findNearbyBuilding = (
    latitude: number,
    longitude: number,
    buildings: BuildingPlan[]
  ): BuildingPlan | null => {
    // Define a maximum distance in kilometers to consider a building "nearby"
    const MAX_DISTANCE_KM = 2.0;
    
    // Helper function to calculate distance between two coordinates in km
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Distance in km
    };
    
    for (const building of buildings) {
      // Calculate the center point of the building
      const centerLat = (building.referenceCoordinates.topLeft.latitude + 
                         building.referenceCoordinates.bottomRight.latitude) / 2;
      const centerLon = (building.referenceCoordinates.topLeft.longitude + 
                         building.referenceCoordinates.bottomRight.longitude) / 2;
      
      // Calculate distance from user to building center
      const distance = calculateDistance(latitude, longitude, centerLat, centerLon);
      
      // If within our maximum distance, consider it nearby
      if (distance <= MAX_DISTANCE_KM) {
        console.log("Found nearby building by distance:", building.name);
        return building;
      }
    }
    
    // If no building is within range, check if we're inside any building's bounds
    for (const building of buildings) {
      const { topLeft, bottomRight } = building.referenceCoordinates;
      
      // FIXED: For southern hemisphere (negative latitudes), the comparison logic is reversed
      const isLatInRange = (latitude <= topLeft.latitude && latitude >= bottomRight.latitude);
      const isLonInRange = (longitude >= topLeft.longitude && longitude <= bottomRight.longitude);
      
      // Add logging to debug the coordinate check
      console.log(`Checking if inside building: ${building.name}`);
      console.log(`User coordinates: ${latitude}, ${longitude}`);
      console.log(`Building bounds: ${topLeft.latitude},${topLeft.longitude} to ${bottomRight.latitude},${bottomRight.longitude}`);
      console.log(`Is latitude in range: ${isLatInRange}, Is longitude in range: ${isLonInRange}`);
      
      if (isLatInRange && isLonInRange) {
        console.log("User is INSIDE the building bounds");
        return building;
      }
    }
    
    console.log("No building found near user location");
    return null;
  };

  const handleMarkerPress = (feature: AccessibilityFeature) => {
    setSelectedFeature(feature);
    setSelectedRoute(null);
    setShowRoutesList(false);
    
    // Animate to the selected feature
    mapRef.current?.animateToRegion({
      latitude: feature.coordinate.latitude,
      longitude: feature.coordinate.longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    });
  };

  const handleGetDirections = () => {
    if (selectedFeature) {
      // Find routes that include this feature
      const relatedRoutes = routes.filter(route => 
        route.points.some(point => 
          point.latitude === selectedFeature.coordinate.latitude && 
          point.longitude === selectedFeature.coordinate.longitude
        )
      );
      
      if (relatedRoutes.length > 0) {
        setSelectedRoute(relatedRoutes[0]);
      } else {
        Alert.alert(
          'Navigation',
          `No predefined routes to ${selectedFeature.title} are available.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleShowAllRoutes = () => {
    setShowRoutesList(!showRoutesList);
    setSelectedFeature(null);
  };

  const handleSelectRoute = (route: AccessibleRoute) => {
    setSelectedRoute(route);
    setShowRoutesList(false);
    
    // Fit map to show the entire route
    if (route.points.length > 0) {
      const coordinates = route.points;
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const handleEnterBuilding = () => {
    if (selectedBuilding) {
      setShowIndoorMap(true);
      
      // Set the initial floor to the ground floor
      const groundFloor = selectedBuilding.floors.find(f => f.level === 1);
      if (groundFloor) {
        setSelectedFloorId(groundFloor.id);
        console.log(`Selected floor: ${groundFloor.name} (${groundFloor.id})`);
      } else if (selectedBuilding.floors.length > 0) {
        setSelectedFloorId(selectedBuilding.floors[0].id);
        console.log(`Selected floor: ${selectedBuilding.floors[0].name} (${selectedBuilding.floors[0].id})`);
      }
      
      // Start location tracking
      const startLocationTracking = async () => {
        // Clear any existing subscription
        if (locationSubscription) {
          locationSubscription.remove();
        }
        
        console.log('Starting indoor location tracking...');
        
        // Get current location first to initialize user position immediately
        try {
          const initialLocation = await LocationService.getCurrentLocation();
          if (initialLocation && selectedBuilding) {
            console.log('Initial indoor location:', initialLocation.coords);
            
            const floorId = groundFloor ? groundFloor.id : selectedBuilding.floors[0].id;
            
            // Update indoor position immediately
            const position = coordinateToFloorPosition(
              { 
                latitude: initialLocation.coords.latitude, 
                longitude: initialLocation.coords.longitude 
              },
              selectedBuilding.id,
              floorId
            );
            
            if (position) {
              console.log('Setting initial indoor position:', position);
              setUserIndoorPosition(position);
            } else {
              console.log('Failed to calculate initial indoor position');
            }
          }
        } catch (error) {
          console.error('Error getting initial indoor location:', error);
        }
        
        // Start a new subscription
        const subscription = await LocationService.watchLocation(
          (location) => {
            console.log('Indoor location update received:', location.coords);
            // We'll use the location in the floor detection effect
          },
          (error) => {
            console.error('Error watching indoor location:', error);
          }
        );
        
        if (subscription) {
          setLocationSubscription(subscription);
        } else {
          console.warn('Failed to start indoor location tracking');
          
          // In development, use mock location for testing
          if (__DEV__) {
            // Update to use your actual position for testing, rather than the default mock
            const mockLocation = {
              coords: {
                latitude: -1.930647, 
                longitude: 30.153170,
                altitude: 0,
                accuracy: 5,
                altitudeAccuracy: 5,
                heading: 0,
                speed: 0,
              },
              timestamp: Date.now(),
            };
            
            const floorId = groundFloor ? groundFloor.id : selectedBuilding.floors[0].id;
            
            const position = coordinateToFloorPosition(
              { 
                latitude: mockLocation.coords.latitude, 
                longitude: mockLocation.coords.longitude 
              },
              selectedBuilding.id,
              floorId
            );
            
            if (position) {
              console.log('Using mock indoor position:', position);
              setUserIndoorPosition(position);
            }
          }
        }
      };
      
      startLocationTracking();
    }
  };

  const handleExitBuilding = () => {
    setShowIndoorMap(false);
    setSelectedFloorId(null);
    setUserIndoorPosition(null);
    
    // Clean up location subscription
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const handleIndoorFeaturePress = (feature: AccessibilityFeature) => {
    setSelectedFeature(feature);
    setShowFeaturePrompt(true); // Show the prompt when a feature is selected
  };

  const handleIndoorRoutePress = (route: AccessibleRoute) => {
    setSelectedRoute(route);
  };

  const handleStartARNavigation = () => {
    if (selectedBuilding && selectedFloorId && selectedFeature) {
      setShowARNavigation(true);
    } else {
      Alert.alert(
        'AR Navigation',
        'Please select a building, floor, and destination first.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCloseARNavigation = () => {
    setShowARNavigation(false);
  };

  const renderMarkerIcon = (type: string) => {
    switch (type) {
      case 'ramp':
        return '♿';
      case 'elevator':
        return '🔼';
      case 'restroom':
        return '🚻';
      case 'entrance':
        return '🚪';
      case 'parking':
        return '🅿️';
      default:
        return '📍';
    }
  };

  // Render building markers
  const renderBuildingMarkers = () => {
    return buildingPlans.map((building) => (
      <Marker
        key={building.id}
        coordinate={building.referenceCoordinates.topLeft}
        title={building.name}
        description={building.description}
        onPress={() => setSelectedBuilding(building)}
        tracksViewChanges={false}
      >
        <View style={styles.buildingMarkerContainer}>
          <Text style={styles.buildingMarkerText}>🏢</Text>
        </View>
      </Marker>
    ));
  };

  // Add a function to zoom to buildings with enhanced user experience
  const handleFindBuildings = () => {
    if (buildingPlans.length > 0) {
      // Get the first building's coordinates
      const building = buildingPlans[0];
      const centerLat = (building.referenceCoordinates.topLeft.latitude + 
                         building.referenceCoordinates.bottomRight.latitude) / 2;
      const centerLon = (building.referenceCoordinates.topLeft.longitude + 
                         building.referenceCoordinates.bottomRight.longitude) / 2;
      
      // Helper function to calculate distance between two coordinates in km
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
      };
      
      // Calculate appropriate zoom level based on building size
      const latDelta = Math.abs(building.referenceCoordinates.bottomLeft.latitude - 
                               building.referenceCoordinates.topLeft.latitude) * 1.5; // 1.5x for padding
      const lonDelta = Math.abs(building.referenceCoordinates.topRight.longitude - 
                               building.referenceCoordinates.topLeft.longitude) * 1.5; // 1.5x for padding
      
      // Ensure minimum zoom level for visibility
      const minDelta = 0.003; // Approximately 300m
      
      // Animate to the building location with appropriate zoom level
      mapRef.current?.animateToRegion({
        latitude: centerLat,
        longitude: centerLon,
        latitudeDelta: Math.max(latDelta, minDelta),
        longitudeDelta: Math.max(lonDelta, minDelta),
      }, 1000); // 1 second animation
      
      // Select the building
      setSelectedBuilding(building);
      
      // Check if user is close to the building before showing "Building Found" alert
      LocationService.getCurrentLocation().then(location => {
        if (location) {
          const userLat = location.coords.latitude;
          const userLon = location.coords.longitude;
          
          // Calculate distance from user to building
          const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
          
          if (distance <= 0.2) { // 200 meters
            // Show a brief message to the user
            Alert.alert(
              'Building Found',
              `${building.name} has been located. Tap "Enter ${building.name}" to explore inside.`,
              [{ text: 'OK' }]
            );
          } else {
            // Show a different message when building is far away
            Alert.alert(
              'Building Located',
              `${building.name} has been located on the map, but you are ${distance.toFixed(1)}km away.`,
              [{ text: 'OK' }]
            );
          }
        }
      }).catch(error => {
        console.error('Error getting current location:', error);
        // Default message if location can't be determined
        Alert.alert(
          'Building Located',
          `${building.name} has been located on the map.`,
          [{ text: 'OK' }]
        );
      });
    } else {
      Alert.alert(
        'No Buildings Found',
        'No accessible buildings are available in this area.',
        [{ text: 'OK' }]
      );
    }
  };

  const detectUserFloor = (building: BuildingPlan, location: Location.LocationObject): string | null => {
    // In a real app, this would use barometric pressure, WiFi, or beacons
    // For the demo, we'll use a more sophisticated approach that simulates real floor detection
    
    // Distance-based floor detection: each floor has "hotspot" areas that trigger floor changes
    
    // Define floor detection regions for the demo (in real app, these would be calibrated)
    const floorHotspots = {
      'leadership-floor-ground': [
        // Ground floor detected near entrance, restrooms, etc.
        { lat: -1.930795, lng: 30.152860, radius: 0.0001 }, // Main entrance
        { lat: -1.930638, lng: 30.153087, radius: 0.0001 }, // Male restroom
        { lat: -1.930647, lng: 30.153170, radius: 0.0001 }  // Elevator ground floor
      ],
      'leadership-floor-first': [
        // First floor detected near computer lab, elevator exit, etc.
        { lat: -1.930656, lng: 30.153010, radius: 0.0001 }, // Computer lab
        { lat: -1.930647, lng: 30.153170, radius: 0.0002 }, // Elevator first floor
        { lat: -1.930582, lng: 30.152950, radius: 0.0001 }  // Study room
      ],
      'leadership-floor-second': [
        // Second floor detected near meeting rooms, staff area, etc.
        { lat: -1.930727, lng: 30.153055, radius: 0.0003 }, // Updated to match your current position
        { lat: -1.930647, lng: 30.153170, radius: 0.0003 }, // Elevator second floor
        { lat: -1.930700, lng: 30.152990, radius: 0.0002 }  // Reading area
      ]
    };
    
    // For demo purposes, check if we're in a specific location range that should be second floor
    // This is a temporary fix based on the logs showing your current position
    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;
    
    // Check if user is in the range that should be second floor based on logs
    if (userLat > -1.9308 && userLat < -1.9307 && 
        userLng > 30.1530 && userLng < 30.1531) {
      console.log("Detected user on second floor based on coordinate range");
      return 'leadership-floor-second';
    }
    
    // Helper to calculate distance
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lng2 - lng1) * Math.PI) / 180;
      
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      return distance;
    };
    
    // Try to identify floor by proximity to known areas
    // Start with a high minimum distance
    let minDistance = 1000; // 1000 meters
    let detectedFloorId = null;
    
    // Check distance to each hotspot on each floor
    Object.entries(floorHotspots).forEach(([floorId, hotspots]) => {
      hotspots.forEach(hotspot => {
        const distance = calculateDistance(userLat, userLng, hotspot.lat, hotspot.lng);
        
        // If within radius of a hotspot and closer than previous matches
        if (distance < hotspot.radius * 111320 && distance < minDistance) { // 111320 meters per degree
          minDistance = distance;
          detectedFloorId = floorId;
        }
      });
    });
    
    // If no floor detected by hotspots, use time-based demo simulation
    if (!detectedFloorId && __DEV__) {
      // Cycle through floors automatically for the demo
      // Get a 3-minute cycle that changes every minute
      const cycleTimeMinutes = Math.floor(Date.now() / (60000)) % 3;
      
      switch (cycleTimeMinutes) {
        case 0:
          return building.floors[0].id; // Ground floor
        case 1:
          return building.floors[1].id; // First floor
        case 2:
          return building.floors[2].id; // Second floor
        default:
          return building.floors[0].id;
      }
    }
    
    return detectedFloorId || building.floors[0].id; // Default to ground floor
  };

  // Update the indoor position and floor when location changes
  useEffect(() => {
    if (showIndoorMap && selectedBuilding && locationSubscription) {
      console.log("Indoor position tracking active");
      
      // Get current location more frequently
      const updateInterval = 2000; // Update every 2 seconds for demo
      
      const updatePositionAndFloor = async () => {
        try {
          // Get current location
          const location = await LocationService.getCurrentLocation();
          if (location && selectedBuilding) {
            console.log(`Location update: ${location.coords.latitude}, ${location.coords.longitude}`);
            
            // Detect which floor the user is on
            const detectedFloorId = detectUserFloor(selectedBuilding, location);
            
            // If floor has changed, update the UI
            if (detectedFloorId && detectedFloorId !== selectedFloorId) {
              console.log(`Floor changed to: ${detectedFloorId}`);
              const newFloor = getFloorById(selectedBuilding.id, detectedFloorId);
              if (newFloor) {
                console.log(`Switching to floor: ${newFloor.name}`);
                setSelectedFloorId(detectedFloorId);
                
                // When floor changes, make sure to load the features and routes for this floor
                if (selectedBuilding.floors) {
                  const floor = selectedBuilding.floors.find(f => f.id === detectedFloorId);
                  if (floor) {
                    // Load features and routes for this floor
                    setFeatures(floor.features || []);
                    setRoutes(floor.routes || []);
                    console.log(`Loaded ${floor.features?.length || 0} features and ${floor.routes?.length || 0} routes for floor ${floor.name}`);
                  }
                }
              }
            }
            
            // Get the current floor (either newly detected or existing)
            const currentFloorId = detectedFloorId || selectedFloorId;
            if (!currentFloorId) return;
            
            // Update user position on the current floor
            const position = coordinateToFloorPosition(
              { 
                latitude: location.coords.latitude, 
                longitude: location.coords.longitude 
              },
              selectedBuilding.id,
              currentFloorId
            );
            
            if (position) {
              console.log(`New indoor position: x=${position.x}, y=${position.y} on floor ${currentFloorId}`);
              setUserIndoorPosition(position);
            }
          }
        } catch (error) {
          console.error('Error updating indoor position:', error);
        }
      };
      
      // Initial update
      updatePositionAndFloor();
      
      // Set up interval for regular updates
      const intervalId = setInterval(updatePositionAndFloor, updateInterval);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [showIndoorMap, selectedBuilding, selectedFloorId, locationSubscription]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading accessibility map...</Text>
        </View>
      ) : (
        <>
          {!showIndoorMap ? (
            // Outdoor map view
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
                initialRegion={region}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                showsScale
              >
                {/* Comment out mock accessibility features 
                {features.map((feature) => (
                  <Marker
                    key={feature.id}
                    coordinate={feature.coordinate}
                    title={feature.title}
                    description={feature.description}
                    onPress={() => handleMarkerPress(feature)}
                    tracksViewChanges={false}
                  >
                    <View style={styles.markerContainer}>
                      <Text style={styles.markerText}>{renderMarkerIcon(feature.type)}</Text>
                    </View>
                  </Marker>
                ))}
                */}
                
                {/* Keep building markers - this is what we want to test */}
                {renderBuildingMarkers()}
                
                {selectedRoute && (
                  <Polyline
                    coordinates={selectedRoute.points}
                    strokeColor="#4A80F0"
                    strokeWidth={4}
                    lineDashPattern={[5, 2]}
                  />
                )}
              </MapView>
              
              <View style={styles.buttonContainer}>
                {/* Add Find Buildings button */}
                <TouchableOpacity 
                  style={styles.findBuildingsButton}
                  onPress={handleFindBuildings}
                >
                  <Text style={styles.findBuildingsButtonText}>
                    Find Buildings
                  </Text>
                </TouchableOpacity>
                
                {selectedBuilding && (
                  <TouchableOpacity 
                    style={styles.buildingButton}
                    onPress={handleEnterBuilding}
                  >
                    <Text style={styles.buildingButtonText}>
                      Enter {selectedBuilding.name}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Comment out routes list since we're not using mock routes 
              {showRoutesList && (
                <View style={styles.routesListContainer}>
                  <Text style={styles.routesListTitle}>Accessible Routes</Text>
                  <ScrollView style={styles.routesList}>
                    {routes.map((route) => (
                      <TouchableOpacity
                        key={route.id}
                        style={styles.routeItem}
                        onPress={() => handleSelectRoute(route)}
                      >
                        <Text style={styles.routeName}>{route.name}</Text>
                        <Text style={styles.routeDescription}>{route.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              */}
              
              {selectedFeature && !showRoutesList && (
                <View style={styles.featureInfoCard}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureTitle}>{selectedFeature.title}</Text>
                    <Text style={styles.featureType}>{selectedFeature.type.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.featureDescription}>{selectedFeature.description}</Text>
                  <View style={styles.featureButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.directionsButton}
                      onPress={handleGetDirections}
                    >
                      <Text style={styles.directionsButtonText}>Get Directions</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.arButton}
                      onPress={handleStartARNavigation}
                    >
                      <Text style={styles.arButtonText}>AR Navigation</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {selectedRoute && !showRoutesList && (
                <View style={styles.routeInfoCard}>
                  <View style={styles.routeHeader}>
                    <Text style={styles.routeTitle}>{selectedRoute.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.routeInfoDescription}>{selectedRoute.description}</Text>
                  <Text style={styles.routeDistance}>
                    Distance: {(selectedRoute.points.length * 0.01).toFixed(2)} km
                  </Text>
                </View>
              )}
              
              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Map Legend</Text>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>♿</Text>
                  <Text style={styles.legendText}>Wheelchair Ramp</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>🔼</Text>
                  <Text style={styles.legendText}>Elevator</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>🚻</Text>
                  <Text style={styles.legendText}>Accessible Restroom</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>🚪</Text>
                  <Text style={styles.legendText}>Accessible Entrance</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>🅿️</Text>
                  <Text style={styles.legendText}>Accessible Parking</Text>
                </View>
                <View style={styles.legendItem}>
                  <Text style={styles.legendIcon}>🏢</Text>
                  <Text style={styles.legendText}>Building with Indoor Map</Text>
                </View>
              </View>
              
              {/* Development Tools UI */}
              {__DEV__ && (
                <View style={styles.devTools}>
                  <Text style={styles.devToolsTitle}>Development Tools</Text>
                  
                  {/* Add coordinate display */}
                  <View style={styles.devCoordinates}>
                    <Text style={styles.devCoordinateText}>
                      Current: {route.params?.initialLocation?.latitude.toFixed(6) || "Unknown"}, 
                      {route.params?.initialLocation?.longitude.toFixed(6) || "Unknown"}
                    </Text>
                  </View>
                  
                  {/* Add force building entry button */}
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      if (buildingPlans.length > 0) {
                        setSelectedBuilding(buildingPlans[0]);
                        handleEnterBuilding();
                      } else {
                        Alert.alert('No buildings loaded');
                      }
                    }}
                  >
                    <Text style={styles.debugButtonText}>Force Enter Building</Text>
                  </TouchableOpacity>
                  
                  {/* Add a button to toggle test mode for indoor map */}
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      // Toggle test mode - you can implement this variable in your state
                      Alert.alert(
                        'Test Mode',
                        'This would toggle test mode for the indoor map. Add this state to your component.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.debugButtonText}>Toggle Test Mode</Text>
                  </TouchableOpacity>
                  
                  {selectedBuilding && selectedFloorId && (
                    <TouchableOpacity
                      style={styles.mapperButton}
                      onPress={() => {
                        navigation.navigate('FloorPlanMapper', {
                          buildingId: selectedBuilding.id,
                          floorId: selectedFloorId
                        });
                      }}
                    >
                      <Text style={styles.mapperButtonText}>
                        Edit Floor Plan Features
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Add button to show current position on map */}
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={async () => {
                      try {
                        const location = await LocationService.getCurrentLocation();
                        if (location) {
                          Alert.alert(
                            'Current Position',
                            `Lat: ${location.coords.latitude.toFixed(6)}\nLong: ${location.coords.longitude.toFixed(6)}`
                          );
                          
                          // Center map on current location
                          mapRef.current?.animateToRegion({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.001,
                            longitudeDelta: 0.001,
                          });
                        } else {
                          Alert.alert('Error', 'Could not get current location');
                        }
                      } catch (error) {
                        console.error('Error getting position:', error);
                        Alert.alert('Error', 'Failed to get position: ' + error);
                      }
                    }}
                  >
                    <Text style={styles.debugButtonText}>Show My Position</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            // Indoor map view
            <View style={styles.indoorMapContainer}>
              <IndoorMapView
                buildingPlan={selectedBuilding!}
                initialFloorId={selectedFloorId || undefined}
                onFeaturePress={handleIndoorFeaturePress}
                onRoutePress={handleIndoorRoutePress}
                onFloorChange={(floorId) => {
                  console.log(`Floor changed to ${floorId} via UI`);
                  setSelectedFloorId(floorId);
                  
                  // When floor changes, make sure to load the features and routes for this floor
                  if (selectedBuilding && selectedBuilding.floors) {
                    const floor = selectedBuilding.floors.find(f => f.id === floorId);
                    if (floor) {
                      // Load features and routes for this floor
                      setFeatures(floor.features || []);
                      setRoutes(floor.routes || []);
                      console.log(`Loaded ${floor.features?.length || 0} features and ${floor.routes?.length || 0} routes for floor ${floor.name}`);
                    }
                  }
                }}
                showFeatures={true}
                showRoutes={true}
                userPosition={userIndoorPosition || undefined}
                selectedFeature={selectedFeature}
                selectedRoute={selectedRoute}
              />
              
              {/* Floor selector */}
              <View style={styles.floorSelectorContainer}>
                <Text style={styles.floorSelectorTitle}>Floors</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedBuilding?.floors.map((floor) => (
                    <TouchableOpacity
                      key={floor.id}
                      style={[
                        styles.floorButton,
                        selectedFloorId === floor.id && styles.floorButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedFloorId(floor.id);
                        console.log(`Manually selected floor: ${floor.name}`);
                      }}
                    >
                      <Text
                        style={[
                          styles.floorButtonText,
                          selectedFloorId === floor.id && styles.floorButtonTextActive,
                        ]}
                      >
                        {floor.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Debug info */}
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                  Current Floor: {selectedBuilding?.floors.find(f => f.id === selectedFloorId)?.name || 'Unknown'}
                </Text>
                <Text style={styles.debugText}>
                  Position: {userIndoorPosition ? `x=${userIndoorPosition.x.toFixed(0)}, y=${userIndoorPosition.y.toFixed(0)}` : 'Unknown'}
                </Text>
                <Text style={styles.debugText}>
                  Features: {features.length}, Routes: {routes.length}
                </Text>
              </View>
              
              {/* Exit button */}
              <TouchableOpacity
                style={styles.exitButton}
                onPress={handleExitBuilding}
              >
                <Text style={styles.exitButtonText}>Exit Building</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* AR Navigation overlay */}
          {showARNavigation && (
            <ARNavigationView
              buildingId={selectedBuilding?.id || ''}
              floorId={selectedFloorId || ''}
              onClose={handleCloseARNavigation}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#4A80F0',
  },
  markerText: {
    fontSize: 16,
  },
  buildingMarkerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF8C00',
  },
  buildingMarkerText: {
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  routesButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  routesButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  buildingButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  buildingButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  routesListContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routesListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  routesList: {
    maxHeight: 240,
  },
  routeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
  },
  featureInfoCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  featureType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A80F0',
    backgroundColor: '#EBF1FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  featureButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  directionsButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  directionsButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  arButton: {
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  arButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  routeInfoCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 18,
    color: '#999',
  },
  routeInfoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  legendContainer: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  exitBuildingButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 10,
  },
  exitBuildingButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  indoorFeatureInfoCard: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 15,
  },
  findBuildingsButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  findBuildingsButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featurePromptContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    maxWidth: '80%',
    maxHeight: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  promptButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  promptButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  promptCloseButton: {
    backgroundColor: '#999',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  promptCloseButtonText: {
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Development Tools Styles
  devTools: {
    position: 'absolute',
    top: 300,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
    width: 180,
  },
  devToolsTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  devCoordinates: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  devCoordinateText: {
    color: '#FFF',
    fontSize: 10,
  },
  debugButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 4,
  },
  debugButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  mapperButton: {
    backgroundColor: '#F06292',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 4,
  },
  mapperButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  indoorMapContainer: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  floorSelectorContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  floorSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  floorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  floorButtonActive: {
    backgroundColor: '#4A80F0',
  },
  floorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  floorButtonTextActive: {
    color: '#FFF',
  },
  debugContainer: {
    position: 'absolute',
    top: 80, // Move below the floor selector
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  debugText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exitButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 10,
  },
  exitButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default MapScreen; 