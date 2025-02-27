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
  ImageBackground,
} from 'react-native';
import { PanGestureHandler, PinchGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BuildingPlan, Floor, AccessibilityFeature, AccessibleRoute, IndoorPosition } from '../types';
import { coordinateToFloorPosition, floorPositionToCoordinate } from '../services/floorPlanService';

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
      
      // In a real app, you would load the image and get its dimensions
      // For now, we'll use placeholder values
      setImageSize({ width: 1000, height: 800 });
      setIsLoading(false);
      
      // Reset pan and zoom when changing floors
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      lastScale.value = 1;
      lastTranslateX.value = 0;
      lastTranslateY.value = 0;
    }
  }, [currentFloor]);

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

    return currentFloor.features.map((feature) => {
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
          onPress={() => onFeaturePress && onFeaturePress(feature)}
        >
          <Text style={styles.featureIcon}>{renderFeatureIcon(feature.type)}</Text>
        </TouchableOpacity>
      );
    });
  };

  // Render route paths
  const renderRoutePaths = () => {
    if (!showRoutes) return null;

    return currentFloor.routes.map((route) => {
      const isSelected = selectedRoute?.id === route.id;

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

      // Create SVG path
      const pathData = pathPoints.reduce((path, point, index) => {
        return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
      }, '');

      return (
        <TouchableOpacity
          key={route.id}
          style={styles.routeContainer}
          onPress={() => onRoutePress && onRoutePress(route)}
        >
          <svg width={imageSize.width} height={imageSize.height}>
            <path
              d={pathData}
              stroke={isSelected ? '#FF4500' : '#4A80F0'}
              strokeWidth={isSelected ? 4 : 2}
              fill="none"
              strokeDasharray={isSelected ? '' : '5,3'}
            />
          </svg>
        </TouchableOpacity>
      );
    });
  };

  // Render user position marker
  const renderUserPosition = () => {
    if (!userPosition || userPosition.floorId !== currentFloor.id) return null;

    return (
      <View
        style={[
          styles.userPositionMarker,
          { left: userPosition.x, top: userPosition.y },
        ]}
      >
        <View style={styles.userPositionDot} />
        <View style={styles.userPositionRing} />
      </View>
    );
  };

  // Helper function to render feature icons
  const renderFeatureIcon = (type: string) => {
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

  return (
    <GestureHandlerRootView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Loading floor plan...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          {/* Floor selector */}
          <View style={styles.floorSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {buildingPlan.floors
                .sort((a, b) => b.level - a.level) // Sort floors in descending order
                .map((floor) => (
                  <TouchableOpacity
                    key={floor.id}
                    style={[
                      styles.floorButton,
                      floor.id === currentFloor.id && styles.selectedFloorButton,
                    ]}
                    onPress={() => handleFloorChange(floor)}
                  >
                    <Text
                      style={[
                        styles.floorButtonText,
                        floor.id === currentFloor.id && styles.selectedFloorButtonText,
                      ]}
                    >
                      {floor.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          {/* Map view with gestures */}
          <PinchGestureHandler
            onGestureEvent={pinchHandler}
            onHandlerStateChange={pinchHandler}
          >
            <Animated.View>
              <PanGestureHandler
                onGestureEvent={panHandler}
                onHandlerStateChange={panHandler}
              >
                <Animated.View style={[styles.floorPlanContainer, animatedStyles]}>
                  {/* Floor plan image */}
                  <ImageBackground
                    source={{ uri: currentFloor.floorPlanUri }}
                    style={[styles.floorPlan, { width: imageSize.width, height: imageSize.height }]}
                    resizeMode="contain"
                  >
                    {/* Route paths */}
                    {renderRoutePaths()}
                    
                    {/* Feature markers */}
                    {renderFeatureMarkers()}
                    
                    {/* User position */}
                    {renderUserPosition()}
                  </ImageBackground>
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
      )}
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
  },
  floorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  selectedFloorButton: {
    backgroundColor: '#4A80F0',
  },
  floorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedFloorButtonText: {
    color: '#FFF',
  },
  floorPlanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 100,
  },
  floorPlan: {
    position: 'relative',
  },
  featureMarker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#4A80F0',
    justifyContent: 'center',
    alignItems: 'center',
    // Adjust position so the marker is centered on the point
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  selectedFeatureMarker: {
    borderColor: '#FF4500',
    backgroundColor: '#FFF8F5',
  },
  featureIcon: {
    fontSize: 16,
  },
  routeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  userPositionMarker: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    // Adjust position so the marker is centered on the point
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  userPositionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4285F4',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userPositionRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(66, 133, 244, 0.5)',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A80F0',
  },
});

export default IndoorMapView; 