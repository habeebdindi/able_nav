import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { BuildingPlan, Floor, AccessibilityFeature, AccessibleRoute, IndoorPosition, FeatureType } from '../types';
import { 
  coordinateToFloorPosition, 
  floorPositionToCoordinate, 
  setFloorImageDimensions,
  updateFloorScale
} from '../services/floorPlanService';

interface IndoorMapViewProps {
  buildingPlan: BuildingPlan;
  initialFloorId?: string;
  onFeaturePress?: (feature: AccessibilityFeature) => void;
  onRoutePress?: (route: AccessibleRoute) => void;
  onFloorChange?: (floorId: string) => void;
  showFeatures?: boolean;
  showRoutes?: boolean;
  userPosition?: IndoorPosition;
  selectedFeature?: AccessibilityFeature | null;
  selectedRoute?: AccessibleRoute | null;
}

const IndoorMapView: React.FC<IndoorMapViewProps> = ({
  buildingPlan,
  initialFloorId,
  onFeaturePress,
  onRoutePress,
  onFloorChange,
  showFeatures = true,
  showRoutes = true,
  userPosition,
  selectedFeature,
  selectedRoute,
}) => {
  // Find the initial floor or use the first floor
  const initialFloor = initialFloorId
    ? buildingPlan.floors.find(f => f.id === initialFloorId)
    : buildingPlan.floors[0];

  const [currentFloor, setCurrentFloor] = useState<Floor>(initialFloor || buildingPlan.floors[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  // Enable test mode for development
  const [useTestMode] = useState(false);
  
  // Add scale tester state variables
  const [testPixelsPerMeter, setTestPixelsPerMeter] = useState<number>(20); // Start with 20 as default
  const [showScaleTester, setShowScaleTester] = useState(false);
  const [userIndoorPosition, setUserIndoorPosition] = useState<IndoorPosition | undefined>(userPosition);
  
  // Add state variables for touch handling
  const [touchCount, setTouchCount] = useState(0);
  const [lastTouchTime, setLastTouchTime] = useState(0);

  // Load floor plan image dimensions
  useEffect(() => {
    if (currentFloor) {
      setIsLoading(true);
      
      if (useTestMode) {
        // Use fixed dimensions for test mode
        const dimensions = { width: 800, height: 600 };
        setImageSize(dimensions);
        setFloorImageDimensions(currentFloor.id, dimensions);
        setIsLoading(false);
      } else {
        // Original image loading code
        // Handle different types of image sources
        const imageSource = typeof currentFloor.floorPlanUri === 'string' 
          ? currentFloor.floorPlanUri 
          : typeof currentFloor.floorPlanUri === 'object' && 'uri' in currentFloor.floorPlanUri
            ? currentFloor.floorPlanUri.uri
            : null;
        
        if (imageSource) {
          // Get the image dimensions for URL or URI
          Image.getSize(
            imageSource,
            (width, height) => {
              console.log(`Image loaded - Width: ${width}, Height: ${height}`);
              const dimensions = { width, height };
              setImageSize(dimensions);
              // Update the dimensions cache in floorPlanService
              setFloorImageDimensions(currentFloor.id, dimensions);
              setIsLoading(false);
            },
            (error) => {
              console.error('Error loading floor plan dimensions:', error);
              // Fallback to default dimensions
              const dimensions = { width: 1000, height: 800 };
              setImageSize(dimensions);
              // Update the dimensions cache with defaults
              setFloorImageDimensions(currentFloor.id, dimensions);
              setIsLoading(false);
              Alert.alert('Warning', 'Could not load floor plan dimensions. Using default values instead.');
            }
          );
        } else if (typeof currentFloor.floorPlanUri === 'number') {
          // For local assets (require()), use resolveAssetSource to get dimensions
          try {
            const resolvedSource = Image.resolveAssetSource(currentFloor.floorPlanUri);
            if (resolvedSource && resolvedSource.width && resolvedSource.height) {
              console.log(`Local asset loaded - Width: ${resolvedSource.width}, Height: ${resolvedSource.height}`);
              const dimensions = { width: resolvedSource.width, height: resolvedSource.height };
              setImageSize(dimensions);
              // Update the dimensions cache for local assets
              setFloorImageDimensions(currentFloor.id, dimensions);
            } else {
              // If resolving fails, use default dimensions
              console.warn('Could not resolve local asset dimensions, using defaults');
              const dimensions = { width: 1000, height: 800 };
              setImageSize(dimensions);
              // Update the dimensions cache with defaults
              setFloorImageDimensions(currentFloor.id, dimensions);
            }
            setIsLoading(false);
          } catch (error) {
            console.error('Error loading local asset dimensions:', error);
            const dimensions = { width: 1000, height: 800 };
            setImageSize(dimensions);
            // Update the dimensions cache with defaults
            setFloorImageDimensions(currentFloor.id, dimensions);
            setIsLoading(false);
            Alert.alert('Warning', 'Could not load local floor plan dimensions. Using default values instead.');
          }
        } else {
          // Handle any other unexpected cases
          console.warn('Unknown floor plan URI format, using default dimensions');
          const dimensions = { width: 1000, height: 800 };
          setImageSize(dimensions);
          // Update the dimensions cache with defaults
          setFloorImageDimensions(currentFloor.id, dimensions);
          setIsLoading(false);
        }
      }
    }
  }, [currentFloor, useTestMode]);

  // Add function to handle map touch events for floor changing
  const handleMapTouch = () => {
    const now = Date.now();
    
    // Reset touch count if it's been more than 1 second since last touch
    if (now - lastTouchTime > 1000) {
      setTouchCount(1);
    } else {
      setTouchCount(touchCount + 1);
    }
    
    // Record the touch time
    setLastTouchTime(now);
    
    // If we've hit 3 quick taps, show floor selector
    if (touchCount >= 2) {
      // Triple tap detected - show floor selection dialog
      showFloorChangeDialog();
      setTouchCount(0);
    }
  };

  // Add function to show a quick floor selector dialog
  const showFloorChangeDialog = () => {
    if (!buildingPlan) return;
    
    Alert.alert(
      "Developer Tools",
      "Select Floor to Demo",
      buildingPlan.floors.map(floor => ({
        text: floor.name,
        onPress: () => {
          // Force floor change
          setCurrentFloor(floor);
          
          // Also update in parent component via callback if available
          if (onFloorChange) {
            onFloorChange(floor.id);
          }
          
          // Show confirmation
          Alert.alert("Floor Changed", `Now showing ${floor.name}`);
        }
      })).concat([
        {
          text: "Cancel",
          onPress: () => {} // Add empty onPress handler to satisfy TypeScript
        }
      ])
    );
  };

  // Render feature markers
  const renderFeatureMarkers = () => {
    if (!showFeatures) return null;

    if (useTestMode) {
      // Generate test features in a grid pattern
      const testFeatures = [
        { id: 'test-elevator', type: 'elevator' as FeatureType, x: 100, y: 100 },
        { id: 'test-restroom', type: 'restroom' as FeatureType, x: 300, y: 100 },
        { id: 'test-ramp', type: 'ramp' as FeatureType, x: 500, y: 100 },
        { id: 'test-entrance', type: 'entrance' as FeatureType, x: 100, y: 300 },
        { id: 'test-parking', type: 'parking' as FeatureType, x: 300, y: 300 },
        { id: 'test-other', type: 'other' as FeatureType, x: 500, y: 300 },
      ];

      return testFeatures.map((feature) => {
        const isSelected = selectedFeature?.id === feature.id;
        
        return (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.featureMarker,
              { left: feature.x, top: feature.y },
              isSelected && styles.selectedFeatureMarker,
            ]}
            onPress={() => {
              if (onFeaturePress) {
                // Create a mock feature object
                const mockFeature: AccessibilityFeature = {
                  id: feature.id,
                  type: feature.type,
                  title: `Test ${feature.type.charAt(0).toUpperCase() + feature.type.slice(1)}`,
                  description: `This is a test ${feature.type} for demonstration purposes.`,
                  coordinate: { latitude: 0, longitude: 0 }, // Dummy coordinates
                };
                onFeaturePress(mockFeature);
              }
            }}
          >
            <Text style={styles.featureIcon}>{renderFeatureIcon(feature.type as FeatureType)}</Text>
          </TouchableOpacity>
        );
      });
    }

    // Original code for real data
    return currentFloor.features.map((feature) => {
      try {
        // Convert geo coordinates to floor plan position
        const position = coordinateToFloorPosition(
          feature.coordinate,
          buildingPlan.id,
          currentFloor.id
        );

        if (!position) return null;

        const isSelected = selectedFeature?.id === feature.id;

        return (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.featureMarker,
              { left: position.x, top: position.y },
              isSelected && styles.selectedFeatureMarker,
            ]}
            onPress={() => {
              if (onFeaturePress) {
                onFeaturePress(feature);
              }
            }}
          >
            <Text style={styles.featureIcon}>{renderFeatureIcon(feature.type as FeatureType)}</Text>
          </TouchableOpacity>
        );
      } catch (error) {
        console.error('Error rendering feature marker:', error);
        return null;
      }
    });
  };

  // Render route paths
  const renderRoutePaths = () => {
    if (!showRoutes) return null;

    if (useTestMode) {
      // Generate test routes
      const testRoutes = [
        { 
          id: 'test-route-1', 
          name: 'Test Route 1',
          points: [
            { x: 100, y: 100 }, // Elevator
            { x: 200, y: 150 }, // Hallway point
            { x: 300, y: 100 }, // Restroom
          ],
          isSelected: selectedRoute?.id === 'test-route-1'
        },
        { 
          id: 'test-route-2', 
          name: 'Test Route 2',
          points: [
            { x: 100, y: 300 }, // Entrance
            { x: 200, y: 300 }, // Hallway point
            { x: 300, y: 300 }, // Stairs
          ],
          isSelected: selectedRoute?.id === 'test-route-2'
        },
        { 
          id: 'test-route-3', 
          name: 'Test Route 3',
          points: [
            { x: 300, y: 100 }, // Restroom
            { x: 400, y: 200 }, // Hallway point
            { x: 500, y: 300 }, // Information
          ],
          isSelected: selectedRoute?.id === 'test-route-3'
        },
      ];

      return testRoutes.map((route) => {
        return (
          <View key={route.id} style={styles.routeContainer}>
            {route.points.slice(0, -1).map((point, index) => {
              try {
                const nextPoint = route.points[index + 1];
                if (!nextPoint) return null;
                
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
                const length = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                );

                return (
                  <TouchableOpacity
                    key={`segment-${index}`}
                    style={[
                      styles.routeSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: length,
                        transform: [{ rotate: `${angle}rad` }],
                        backgroundColor: route.isSelected ? '#4CAF50' : '#2196F3',
                        height: route.isSelected ? 6 : 4,
                      },
                    ]}
                    onPress={() => {
                      if (onRoutePress) {
                        // Create a mock route object
                        const mockRoute: AccessibleRoute = {
                          id: route.id,
                          name: route.name,
                          description: `This is a test route for demonstration purposes.`,
                          points: route.points.map(() => ({ latitude: 0, longitude: 0 })), // Dummy coordinates
                        };
                        onRoutePress(mockRoute);
                      }
                    }}
                  />
                );
              } catch (error) {
                console.error('Error rendering route segment:', error);
                return null;
              }
            })}
          </View>
        );
      });
    }

    // Original code for real data
    return currentFloor.routes.map((route) => {
      const isSelected = selectedRoute?.id === route.id;

      try {
        // Convert route points to floor plan positions
        const pathPoints = route.points.map((point) => {
          const position = coordinateToFloorPosition(
            point,
            buildingPlan.id,
            currentFloor.id
          );
          return position ? { x: position.x, y: position.y } : null;
        }).filter(Boolean) as { x: number; y: number }[];

        if (pathPoints.length < 2) return null;

        // Create connected line segments
        return (
          <View key={route.id} style={styles.routeContainer}>
            {pathPoints.slice(0, -1).map((point, index) => {
              try {
                const nextPoint = pathPoints[index + 1];
                if (!nextPoint) return null;
                
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
                const length = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                );

                return (
                  <TouchableOpacity
                    key={`segment-${index}`}
                    style={[
                      styles.routeSegment,
                      {
                        left: point.x,
                        top: point.y,
                        width: length,
                        transform: [{ rotate: `${angle}rad` }],
                        backgroundColor: isSelected ? '#4CAF50' : '#2196F3',
                        height: isSelected ? 6 : 4,
                      },
                    ]}
                    onPress={() => {
                      if (onRoutePress) {
                        onRoutePress(route);
                      }
                    }}
                  />
                );
              } catch (error) {
                console.error('Error rendering route segment:', error);
                return null;
              }
            })}
          </View>
        );
      } catch (error) {
        console.error('Error rendering route:', error);
        return null;
      }
    });
  };

  // Add this function to test different scale values
  const applyTestScale = () => {
    if (!currentFloor?.scale) return;
    
    // Create a temporary modified floor with the test scale
    const testFloor = {
      ...currentFloor,
      scale: {
        ...currentFloor.scale,
        pixelsPerMeter: testPixelsPerMeter
      }
    };
    
    // Recalculate positions of all features using the test scale
    if (buildingPlan && userPosition?.coordinate) {
      const newPosition = coordinateToFloorPosition(
        userPosition.coordinate,
        buildingPlan.id,
        testFloor.id
      );
      
      if (newPosition) {
        console.log(`Test position with ${testPixelsPerMeter} pixels/meter:`);
        console.log(`X: ${newPosition.x}, Y: ${newPosition.y}`);
        
        // Update user position with new calculated position
        setUserIndoorPosition(newPosition);
        
        // Temporarily update floor scale in cache for all calculations
        if (currentFloor) {
          // This assumes you have a way to temporarily modify the floor scale
          // You could add this function to your floorPlanService
          updateFloorScale(currentFloor.id, testPixelsPerMeter);
        }
      }
    }
  };

  // Render user position
  const renderUserPosition = () => {
    // Use the local state if available, otherwise fall back to the prop
    const position = userIndoorPosition || userPosition;
    
    if (!position) {
      console.log("No user position available to render");
      return null;
    }
    
    console.log(`Rendering user position at x=${position.x}, y=${position.y} on floor ${position.floorId}`);
    
    return (
      <View
        style={[
          styles.userPosition,
          {
            left: position.x,
            top: position.y,
            width: 20,  // Make the position marker larger
            height: 20, // Make the position marker larger
            backgroundColor: 'rgba(0, 122, 255, 0.3)',
            borderRadius: 10,
            borderWidth: 2,
            borderColor: '#007AFF',
            zIndex: 1000, // Ensure it's on top of other elements
          },
        ]}
      >
        <View style={[
          styles.userPositionInner,
          {
            width: 10,
            height: 10,
            backgroundColor: '#007AFF',
            borderRadius: 5,
          }
        ]} />
      </View>
    );
  };

  // Render feature icon
  const renderFeatureIcon = (type: FeatureType) => {
    try {
      switch (type) {
        case 'elevator':
          return '🔼';
        case 'restroom':
          return '🚻';
        case 'ramp':
          return '♿';
        case 'entrance':
          return '🚪';
        case 'parking':
          return '🅿️';
        case 'other':
          return 'ℹ️';
        default:
          return '📍';
      }
    } catch (error) {
      console.error('Error rendering feature icon:', error);
      return '📍';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading floor plan...</Text>
      </View>
    );
  }

  // Render the navigation view with error boundary
  const renderNavigationView = () => {
    try {
      return (
        <View style={[styles.navigationView, { width: imageSize.width, height: imageSize.height }]}>
          {useTestMode && (
            // Add grid lines for test mode
            <View style={styles.gridContainer}>
              {/* Horizontal grid lines */}
              {Array.from({ length: 6 }).map((_, i) => (
                <View 
                  key={`h-${i}`} 
                  style={[
                    styles.gridLine, 
                    styles.horizontalLine, 
                    { top: i * 100 }
                  ]} 
                />
              ))}
              
              {/* Vertical grid lines */}
              {Array.from({ length: 8 }).map((_, i) => (
                <View 
                  key={`v-${i}`} 
                  style={[
                    styles.gridLine, 
                    styles.verticalLine, 
                    { left: i * 100 }
                  ]} 
                />
              ))}
              
              {/* Add labels */}
              <Text style={[styles.gridLabel, { top: 10, left: 10 }]}>Test Navigation View</Text>
              <Text style={[styles.gridLabel, { bottom: 10, right: 10 }]}>Floor: {currentFloor.name}</Text>
            </View>
          )}
          
          {/* Route paths */}
          {renderRoutePaths()}
          
          {/* Feature markers */}
          {renderFeatureMarkers()}
          
          {/* User position */}
          {renderUserPosition()}
        </View>
      );
    } catch (error) {
      console.error('Error rendering navigation view:', error);
      return (
        <View style={[styles.navigationViewError, { width: imageSize.width, height: imageSize.height }]}>
          <Text style={styles.errorText}>Error displaying navigation view</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Add a current floor indicator at the top of the screen instead */}
      <View style={styles.currentFloorIndicator}>
        <Text style={styles.currentFloorText}>
          {currentFloor?.name || 'Detecting Floor...'}
        </Text>
      </View>

      {/* Map container */}
      <View style={styles.mapContainer}>
        {/* Enhanced ScrollView with horizontal and vertical scrolling */}
        <ScrollView 
          horizontal={true}
          contentContainerStyle={styles.scrollContainer}
          maximumZoomScale={3}
          minimumZoomScale={0.5}
          bouncesZoom={true}
          showsHorizontalScrollIndicator={true}
          showsVerticalScrollIndicator={true}
        >
          <ScrollView
            contentContainerStyle={styles.innerScrollContainer}
          >
            {/* Add a touchable wrapper around the navigation view */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleMapTouch}
            >
              {renderNavigationView()}
            </TouchableOpacity>
          </ScrollView>
        </ScrollView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // No zoom functionality in this simplified version
              Alert.alert('Info', 'Use pinch gesture to zoom in');
            }}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              // No zoom functionality in this simplified version
              Alert.alert('Info', 'Use pinch gesture to zoom out');
            }}
          >
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          
          {/* Add scale tester UI */}
          {__DEV__ && (
            <View>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => setShowScaleTester(!showScaleTester)}
              >
                <Text style={styles.debugButtonText}>Scale Tester</Text>
              </TouchableOpacity>
              
              {showScaleTester && (
                <View style={styles.scaleTester}>
                  <Text style={styles.scaleTitle}>pixels/meter: {testPixelsPerMeter}</Text>
                  
                  <View style={styles.scaleControls}>
                    <TouchableOpacity 
                      style={styles.scaleButton}
                      onPress={() => setTestPixelsPerMeter(Math.max(5, testPixelsPerMeter - 5))}
                    >
                      <Text style={styles.scaleButtonText}>-5</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.scaleButton}
                      onPress={() => setTestPixelsPerMeter(Math.max(1, testPixelsPerMeter - 1))}
                    >
                      <Text style={styles.scaleButtonText}>-1</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.scaleButton}
                      onPress={() => setTestPixelsPerMeter(testPixelsPerMeter + 1)}
                    >
                      <Text style={styles.scaleButtonText}>+1</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.scaleButton}
                      onPress={() => setTestPixelsPerMeter(testPixelsPerMeter + 5)}
                    >
                      <Text style={styles.scaleButtonText}>+5</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.applyButton}
                    onPress={applyTestScale}
                  >
                    <Text style={styles.applyButtonText}>Apply & Test</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    minHeight: Dimensions.get('window').height,
    minWidth: Dimensions.get('window').width,
  },
  innerScrollContainer: {
    padding: 10,
  },
  // Remove these style entries
  // floorSelector: {
  //   position: 'absolute',
  //   top: 16,
  //   left: 16,
  //   right: 16,
  //   zIndex: 10,
  //   maxHeight: 50,
  // },
  // floorSelectorContent: {
  //   paddingHorizontal: 8,
  // },
  // floorButton: {
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   backgroundColor: 'rgba(255, 255, 255, 0.9)',
  //   borderRadius: 20,
  //   marginHorizontal: 4,
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  // },
  // selectedFloorButton: {
  //   backgroundColor: '#2196F3',
  //   borderColor: '#1976D2',
  // },
  // floorButtonText: {
  //   fontSize: 14,
  //   fontWeight: '500',
  //   color: '#333',
  // },
  // selectedFloorButtonText: {
  //   color: '#fff',
  // },
  
  // Add new styles for the current floor indicator
  currentFloorIndicator: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  currentFloorText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  navigationView: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navigationViewError: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffcccc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cc0000',
    textAlign: 'center',
  },
  routeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  routeSegment: {
    position: 'absolute',
    height: 4,
    transformOrigin: 'left',
  },
  featureMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    zIndex: 5,
  },
  selectedFeatureMarker: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 6,
  },
  featureIcon: {
    fontSize: 16,
  },
  userPosition: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    zIndex: 10,
  },
  userPositionInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  mapControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 20,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  horizontalLine: {
    width: '100%',
    height: 0,
  },
  verticalLine: {
    width: 0,
    height: '100%',
  },
  gridLabel: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 5,
    borderRadius: 4,
  },
  // Add scale tester styles
  debugButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 4,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  scaleTester: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    alignItems: 'center',
    width: 160,
  },
  scaleTitle: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 8,
  },
  scaleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  scaleButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scaleButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  applyButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default IndoorMapView; 