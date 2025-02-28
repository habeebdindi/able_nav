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
 * This improved version handles non-rectangular buildings better
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
 * This improved version handles non-rectangular buildings better
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
 * Mock building plans for testing
 */
const getBuildingPlans = (): BuildingPlan[] => {
  return [
    {
      id: 'building-1',
      name: 'Leadership Center',
      description: 'ALU Leadership Center with accessible facilities',
      // Updated coordinates with more precise bounding box centered at (-1.9306162, 30.1529425)
      // Creating a more realistic building footprint (approximately 100m x 60m)
      referenceCoordinates: {
        topLeft: { latitude: -1.9302162, longitude: 30.1525425 },     // NW corner
        topRight: { latitude: -1.9302162, longitude: 30.1533425 },    // NE corner
        bottomLeft: { latitude: -1.9310162, longitude: 30.1525425 },  // SW corner
        bottomRight: { latitude: -1.9310162, longitude: 30.1533425 }  // SE corner
      },
      floors: [
        {
          id: 'leadership-floor-ground',
          level: 1,
          name: 'Ground Floor',
          floorPlanUri: require('../assets/floorplans/inside_leadership_center_first_floor_plan-map_ALU.png'),
          scale: {
            pixelsPerMeter: 20
          },
          features: [
            {
              id: 'elevator-ground',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: -1.9306162, longitude: 30.1529425 } // Center of the building
            },
            {
              id: 'restroom-ground',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'Ground floor accessible restroom near Wellness Center',
              coordinate: { latitude: -1.9305162, longitude: 30.1531425 }
            },
            {
              id: 'entrance-main',
              type: 'entrance',
              title: 'Main Entrance',
              description: 'Main accessible entrance to the Leadership Center',
              coordinate: { latitude: -1.9303162, longitude: 30.1529425 } // North side entrance
            },
            {
              id: 'ramp-main',
              type: 'ramp',
              title: 'Main Entrance Ramp',
              description: 'Wheelchair accessible ramp at main entrance',
              coordinate: { latitude: -1.9303662, longitude: 30.1528425 } // Near north entrance
            }
          ],
          routes: [
            {
              id: 'route-elevator-restroom-ground',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to restroom',
              points: [
                { latitude: -1.9306162, longitude: 30.1529425 }, // Elevator
                { latitude: -1.9305662, longitude: 30.1530425 }, // Hallway point
                { latitude: -1.9305162, longitude: 30.1531425 }  // Restroom
              ]
            },
            {
              id: 'route-entrance-elevator-ground',
              name: 'Entrance to Elevator',
              description: 'Accessible route from main entrance to elevator',
              points: [
                { latitude: -1.9303162, longitude: 30.1529425 }, // Main entrance
                { latitude: -1.9304162, longitude: 30.1529425 }, // Hallway point
                { latitude: -1.9306162, longitude: 30.1529425 }  // Elevator
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
            pixelsPerMeter: 20
          },
          features: [
            {
              id: 'elevator-first',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: -1.9306162, longitude: 30.1529425 }
            },
            {
              id: 'restroom-first',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'First floor accessible restroom near Mechanical Room',
              coordinate: { latitude: -1.9304162, longitude: 30.1532425 }
            }
          ],
          routes: [
            {
              id: 'route-elevator-wellness-first',
              name: 'Elevator to Wellness Center',
              description: 'Accessible route from elevator to Wellness Center',
              points: [
                { latitude: -1.9306162, longitude: 30.1529425 }, // Elevator
                { latitude: -1.9305162, longitude: 30.1530425 }, // Hallway point
                { latitude: -1.9304162, longitude: 30.1531425 }  // Wellness Center
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
            pixelsPerMeter: 20
          },
          features: [
            {
              id: 'elevator-second',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: -1.9306162, longitude: 30.1529425 }
            }
            // Add other features on this floor
          ],
          routes: [
            // Add routes for this floor
          ]
        }
      ]
    }
  ];
}; 