import { BuildingPlan, Floor, AccessibilityFeature, AccessibleRoute, Coordinate, IndoorPosition } from '../types';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// In-memory cache for loaded floor plans
let buildingPlansCache: BuildingPlan[] = [];

// Cache for image dimensions to avoid recalculating
const imageDimensionsCache = new Map<string, { width: number, height: number }>();

/**
 * Load building plans from storage or API
 * In a real app, this would fetch from a backend API
 */
export const loadBuildingPlans = async (): Promise<BuildingPlan[]> => {
  try {
    // For now, we'll return the mock data
    // In a real app, this would fetch from an API or local storage
    buildingPlansCache = getBuildingPlans();
    return buildingPlansCache;
  } catch (error) {
    console.error('Error loading building plans:', error);
    Alert.alert('Error', 'Failed to load building plans');
    return [];
  }
};

/**
 * Get a building plan by ID
 */
export const getBuildingPlanById = (id: string): BuildingPlan | undefined => {
  return buildingPlansCache.find(plan => plan.id === id);
};

/**
 * Get a floor by ID within a building
 */
export const getFloorById = (buildingId: string, floorId: string): Floor | undefined => {
  const building = getBuildingPlanById(buildingId);
  if (!building) return undefined;
  
  return building.floors.find(floor => floor.id === floorId);
};

/**
 * Set image dimensions for a floor
 */
export const setFloorImageDimensions = (
  floorId: string,
  dimensions: { width: number, height: number }
): void => {
  imageDimensionsCache.set(floorId, dimensions);
};

/**
 * Get image dimensions for a floor
 */
export const getFloorImageDimensions = (
  floorId: string
): { width: number, height: number } | undefined => {
  return imageDimensionsCache.get(floorId);
};

/**
 * Convert a real-world coordinate to a position on the floor plan
 */
export const coordinateToFloorPosition = (
  coordinate: Coordinate,
  buildingId: string,
  floorId: string
): IndoorPosition | null => {
  const floor = getFloorById(buildingId, floorId);
  const building = getBuildingPlanById(buildingId);
  
  if (!floor || !building) return null;
  
  const { topLeft, topRight, bottomLeft, bottomRight } = building.referenceCoordinates;
  
  // Calculate the building's width and height in degrees
  const buildingWidthLng = Math.abs(topRight.longitude - topLeft.longitude);
  const buildingHeightLat = Math.abs(bottomLeft.latitude - topLeft.latitude);
  
  // Check if the coordinate is within the building bounds (with some margin)
  const margin = 0.0002; // Approximately 20 meters
  if (
    coordinate.latitude < (topLeft.latitude - margin) ||
    coordinate.latitude > (bottomLeft.latitude + margin) ||
    coordinate.longitude < (topLeft.longitude - margin) ||
    coordinate.longitude > (topRight.longitude + margin)
  ) {
    console.warn('Coordinate is outside building bounds:', coordinate);
    // Return a position at the edge of the floor plan as fallback
    const cachedDimensions = getFloorImageDimensions(floorId);
    const imageWidth = cachedDimensions ? cachedDimensions.width : 1000;
    const imageHeight = cachedDimensions ? cachedDimensions.height : 800;
    
    return {
      buildingId,
      floorId,
      x: Math.round(imageWidth / 2),
      y: Math.round(imageHeight / 2),
      coordinate
    };
  }
  
  // Calculate the relative position within the geo-rectangle
  // This handles non-rectangular buildings better by using bilinear interpolation
  
  // First, normalize the latitude and longitude to [0,1] range within the building
  const normalizedLat = (coordinate.latitude - topLeft.latitude) / buildingHeightLat;
  const normalizedLng = (coordinate.longitude - topLeft.longitude) / buildingWidthLng;
  
  // Get the dimensions of the floor plan image
  const cachedDimensions = getFloorImageDimensions(floorId);
  const imageWidth = cachedDimensions ? cachedDimensions.width : 1000;
  const imageHeight = cachedDimensions ? cachedDimensions.height : 800;
  
  // Calculate the position on the floor plan
  // For a rectangular floor plan, this is a simple scaling
  const x = Math.round(normalizedLng * imageWidth);
  const y = Math.round(normalizedLat * imageHeight);
  
  return {
    buildingId,
    floorId,
    x,
    y,
    coordinate
  };
};

/**
 * Convert a floor plan position to a real-world coordinate
 */
export const floorPositionToCoordinate = (
  position: IndoorPosition
): Coordinate | null => {
  const building = getBuildingPlanById(position.buildingId);
  
  if (!building) return null;
  
  const { topLeft, topRight, bottomLeft, bottomRight } = building.referenceCoordinates;
  
  // Calculate the building's width and height in degrees
  const buildingWidthLng = Math.abs(topRight.longitude - topLeft.longitude);
  const buildingHeightLat = Math.abs(bottomLeft.latitude - topLeft.latitude);
  
  // Get the dimensions of the floor plan image
  const cachedDimensions = getFloorImageDimensions(position.floorId);
  const imageWidth = cachedDimensions ? cachedDimensions.width : 1000;
  const imageHeight = cachedDimensions ? cachedDimensions.height : 800;
  
  // Calculate the relative position within the image [0,1]
  const normalizedX = position.x / imageWidth;
  const normalizedY = position.y / imageHeight;
  
  // Calculate the real-world coordinate using the normalized position
  const latitude = topLeft.latitude + normalizedY * buildingHeightLat;
  const longitude = topLeft.longitude + normalizedX * buildingWidthLng;
  
  return { latitude, longitude };
};

/**
 * Upload a floor plan image
 * In a real app, this would upload to a server or store locally
 */
export const uploadFloorPlan = async (
  uri: string,
  buildingId: string,
  floorLevel: number
): Promise<string> => {
  try {
    // In a real app, this would upload the image to a server or copy it to app storage
    // For now, we'll just return the URI
    return uri;
  } catch (error) {
    console.error('Error uploading floor plan:', error);
    throw new Error('Failed to upload floor plan');
  }
};

/**
 * Add accessibility feature to a floor
 */
export const addAccessibilityFeature = (
  feature: Omit<AccessibilityFeature, 'id'>,
  buildingId: string,
  floorId: string
): AccessibilityFeature | null => {
  const building = getBuildingPlanById(buildingId);
  if (!building) return null;
  
  const floorIndex = building.floors.findIndex(f => f.id === floorId);
  if (floorIndex === -1) return null;
  
  const newFeature: AccessibilityFeature = {
    ...feature,
    id: `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  building.floors[floorIndex].features.push(newFeature);
  
  return newFeature;
};

/**
 * Add an accessible route to a floor
 */
export const addAccessibleRoute = (
  route: Omit<AccessibleRoute, 'id'>,
  buildingId: string,
  floorId: string
): AccessibleRoute | null => {
  const building = getBuildingPlanById(buildingId);
  if (!building) return null;
  
  const floorIndex = building.floors.findIndex(f => f.id === floorId);
  if (floorIndex === -1) return null;
  
  const newRoute: AccessibleRoute = {
    ...route,
    id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  building.floors[floorIndex].routes.push(newRoute);
  
  return newRoute;
};

/**
 * Detailed building plans for ALU Leadership Center
 * Based on architectural drawings
 */
const getBuildingPlans = (): BuildingPlan[] => {
  return [
    {
      id: 'leadership-center',
      name: 'ALU Leadership Center',
      description: 'Learning Commons with accessible facilities',
      // GPS coordinates for the corners of the building
      referenceCoordinates: {
        topLeft: {
          latitude: -1.9307796622349982,
          longitude: 30.15263934189284
        },
        topRight: {
          latitude: -1.9307796622349982,
          longitude: 30.153160658107158
        },
        bottomLeft: {
          latitude: -1.930420337765002,
          longitude: 30.15263934189284
        },
        bottomRight: {
          latitude: -1.930420337765002,
          longitude: 30.153160658107158
        }
      },
      floors: [
        {
          id: 'leadership-floor-ground',
          level: 1,
          name: 'Ground Floor',
          floorPlanUri: require('../assets/floorplans/inside_leadership_center_ground_floor_plan-map_ALU.png'),
          scale: {
            pixelsPerMeter: 34.5 // Based on calculations from floor plan measurements
          },
          features: [
            {
              id: 'elevator-ground',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.9306431189363997,
                longitude: 30.15288957367571
              }
            },
            {
              id: 'restroom-male-ground',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'Ground floor accessible male restroom',
              coordinate: {
                latitude: -1.9306718648939993,
                longitude: 30.152978197432148
              }
            },
            {
              id: 'restroom-female-ground',
              type: 'restroom',
              title: 'Female Restroom',
              description: 'Ground floor accessible female restroom',
              coordinate: {
                latitude: -1.9306898311174991,
                longitude: 30.152978197432148
              }
            },
            {
              id: 'entrance-main',
              type: 'entrance',
              title: 'Main Entrance',
              description: 'Main accessible entrance to the Leadership Center',
              coordinate: {
                latitude: -1.9307616960114984,
                longitude: 30.1529
              }
            }
          ],
          routes: [
            {
              id: 'route-entrance-elevator-ground',
              name: 'Entrance to Elevator',
              description: 'Accessible route from main entrance to the elevator',
              points: [
                {
                  latitude: -1.9307616960114984,
                  longitude: 30.1529
                },
                {
                  latitude: -1.9307024074739991,
                  longitude: 30.1529
                },
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15288957367571
                }
              ]
            },
            {
              id: 'route-elevator-restroom-ground',
              name: 'Elevator to Restrooms',
              description: 'Accessible route from elevator to the restrooms',
              points: [
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15288957367571
                },
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15293478684644
                },
                {
                  latitude: -1.9306718648939993,
                  longitude: 30.152978197432148
                },
                {
                  latitude: -1.9306808480057491,
                  longitude: 30.152978197432148
                },
                {
                  latitude: -1.9306898311174991,
                  longitude: 30.152978197432148
                }
              ]
            }
          ]
        },
        {
          id: 'leadership-floor-first',
          level: 2,
          name: 'First Floor',
          floorPlanUri: require('../assets/floorplans/inside_leadership_center_first_floor_plan-map_ALU.png'),
          scale: {
            pixelsPerMeter: 34.5 // Same scale as ground floor for consistency
          },
          features: [
            {
              id: 'elevator-first',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.9306431189363997,
                longitude: 30.15288957367571
              }
            },
            {
              id: 'restroom-male-first',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'First floor accessible male restroom',
              coordinate: {
                latitude: -1.9306718648939993,
                longitude: 30.152978197432148
              }
            },
            {
              id: 'computer-lab',
              type: 'other',
              title: 'Computer Lab',
              description: 'Accessible computer lab for students',
              coordinate: {
                latitude: -1.9306538986704995,
                longitude: 30.15303032905358
              }
            }
          ],
          routes: [
            {
              id: 'route-elevator-restroom-first',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to the restroom',
              points: [
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15288957367571
                },
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15293478684644
                },
                {
                  latitude: -1.9306718648939993,
                  longitude: 30.152978197432148
                }
              ]
            },
            {
              id: 'route-elevator-computer-lab',
              name: 'Elevator to Computer Lab',
              description: 'Accessible route from elevator to the computer lab',
              points: [
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15288957367571
                },
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15295739342715
                },
                {
                  latitude: -1.9306538986704995,
                  longitude: 30.15303032905358
                }
              ]
            }
          ]
        },
        {
          id: 'leadership-floor-second',
          level: 3,
          name: 'Second Floor',
          floorPlanUri: require('../assets/floorplans/inside_leadership_center_second_floor_plan-map_ALU.png'),
          scale: {
            pixelsPerMeter: 34.5 // Same scale as other floors for consistency
          },
          features: [
            {
              id: 'elevator-second',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.9306431189363997,
                longitude: 30.15288957367571
              }
            },
            {
              id: 'restroom-male-second',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'Second floor accessible male restroom',
              coordinate: {
                latitude: -1.9306718648939993,
                longitude: 30.152978197432148
              }
            },
            {
              id: 'restroom-female-second',
              type: 'restroom',
              title: 'Female Restroom',
              description: 'Second floor accessible female restroom',
              coordinate: {
                latitude: -1.9306898311174991,
                longitude: 30.152978197432148
              }
            }
          ],
          routes: [
            {
              id: 'route-elevator-restroom-second',
              name: 'Elevator to Restrooms',
              description: 'Accessible route from elevator to the restrooms',
              points: [
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15288957367571
                },
                {
                  latitude: -1.9306431189363997,
                  longitude: 30.15293478684644
                },
                {
                  latitude: -1.9306718648939993,
                  longitude: 30.152978197432148
                },
                {
                  latitude: -1.9306808480057491,
                  longitude: 30.152978197432148
                },
                {
                  latitude: -1.9306898311174991,
                  longitude: 30.152978197432148
                }
              ]
            }
          ]
        }
      ]
    }
  ];
};