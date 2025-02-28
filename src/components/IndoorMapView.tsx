import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BuildingPlan, Floor, AccessibilityFeature, AccessibleRoute, IndoorPosition, FeatureType } from '../types';
import { 
  coordinateToFloorPosition, 
  floorPositionToCoordinate, 
  setFloorImageDimensions 
} from '../services/floorPlanService';

interface IndoorMapViewProps {
  buildingPlan: BuildingPlan;
  initialFloorId?: string;
  onFeaturePress?: (feature: AccessibilityFeature) => void;
  onRoutePress?: (route: AccessibleRoute) => void;
  showFeatures?: boolean;
  showRoutes?: boolean;
  userPosition?: IndoorPosition;
  selectedFeature?: AccessibilityFeature | null;
  selectedRoute?: AccessibleRoute | null;
}

// Define context types
type PinchContext = {
  startScale: number;
};

type PanContext = {
  startX: number;
  startY: number;
};

const IndoorMapView: React.FC<IndoorMapViewProps> = ({
  buildingPlan,
  initialFloorId,
  onFeaturePress,
  onRoutePress,
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
  const [useTestMode] = useState(true);

  // Animation values for pan and zoom
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastScale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);

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
      
      // Reset pan and zoom when changing floors
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      lastScale.value = 1;
      lastTranslateX.value = 0;
      lastTranslateY.value = 0;
    }
  }, [currentFloor, useTestMode]);

  // Handle pinch gesture for zooming
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_: any, ctx: any) => {
      ctx.startScale = scale.value;
    },
    onActive: (event: any, ctx: any) => {
      scale.value = Math.max(0.5, Math.min(5, ctx.startScale * event.scale));
    },
    onEnd: () => {
      lastScale.value = scale.value;
    },
  });

  // Handle pan gesture for moving around the map
  const panHandler = useAnimatedGestureHandler({
    onStart: (_: any, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event: any, ctx: any) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    },
  });

  // Animated styles for the map container
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Handle floor change
  const handleFloorChange = (floor: Floor) => {
    setCurrentFloor(floor);
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

  // Render user position
  const renderUserPosition = () => {
    if (useTestMode) {
      // Show a test user position in the center
      const x = imageSize.width / 2;
      const y = imageSize.height / 2;
      
      return (
        <View
          style={[
            styles.userPosition,
            { left: x, top: y },
          ]}
        >
          <View style={styles.userPositionInner} />
        </View>
      );
    }
    
    if (!userPosition) return null;
    
    try {
      return (
        <View
          style={[
            styles.userPosition,
            { left: userPosition.x, top: userPosition.y },
          ]}
        >
          <View style={styles.userPositionInner} />
        </View>
      );
    } catch (error) {
      console.error('Error rendering user position:', error);
      return null;
    }
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
    <GestureHandlerRootView style={styles.container}>
      {/* Floor selector */}
      <ScrollView
        horizontal
        style={styles.floorSelector}
        contentContainerStyle={styles.floorSelectorContent}
        showsHorizontalScrollIndicator={false}
      >
        {buildingPlan.floors.map((floor) => (
          <TouchableOpacity
            key={floor.id}
            style={[
              styles.floorButton,
              currentFloor.id === floor.id && styles.selectedFloorButton,
            ]}
            onPress={() => handleFloorChange(floor)}
          >
            <Text
              style={[
                styles.floorButtonText,
                currentFloor.id === floor.id && styles.selectedFloorButtonText,
              ]}
            >
              {floor.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map container */}
      <View style={styles.mapContainer}>
        <PinchGestureHandler
          onGestureEvent={pinchHandler}
          onHandlerStateChange={pinchHandler}
        >
          <Animated.View style={styles.mapWrapper}>
            <PanGestureHandler
              onGestureEvent={panHandler}
              onHandlerStateChange={panHandler}
              minDist={10} // Add minimum distance to prevent accidental pans
              avgTouches // Use average touches for smoother panning
            >
              <Animated.View style={[styles.floorPlanContainer, animatedStyles]}>
                {/* Navigation View - Replace ImageBackground with a custom view */}
                {renderNavigationView()}
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              scale.value = withSpring(Math.min(scale.value + 0.5, 5));
              lastScale.value = scale.value;
            }}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              scale.value = withSpring(Math.max(scale.value - 0.5, 0.5));
              lastScale.value = scale.value;
            }}
          >
            <Text style={styles.controlButtonText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              scale.value = withSpring(1);
              translateX.value = withSpring(0);
              translateY.value = withSpring(0);
              lastScale.value = 1;
              lastTranslateX.value = 0;
              lastTranslateY.value = 0;
            }}
          >
            <Text style={styles.controlButtonText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
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
  floorSelector: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    maxHeight: 50,
  },
  floorSelectorContent: {
    paddingHorizontal: 8,
  },
  floorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedFloorButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  floorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedFloorButtonText: {
    color: '#fff',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  floorPlanContainer: {
    padding: 16,
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
});

export default IndoorMapView; 