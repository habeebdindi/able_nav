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
  
  // This is a simplified calculation and would need to be more sophisticated in a real app
  // It assumes the floor plan is aligned with north and the reference coordinates form a rectangle
  
  const { topLeft, bottomRight } = building.referenceCoordinates;
  
  // Calculate the relative position within the geo-rectangle
  const latRatio = (coordinate.latitude - topLeft.latitude) / (bottomRight.latitude - topLeft.latitude);
  const lngRatio = (coordinate.longitude - topLeft.longitude) / (bottomRight.longitude - topLeft.longitude);
  
  // Get the dimensions of the floor plan image
  // Try to get from cache first, otherwise use default values
  const cachedDimensions = getFloorImageDimensions(floorId);
  const imageWidth = cachedDimensions ? cachedDimensions.width : 1000; // pixels
  const imageHeight = cachedDimensions ? cachedDimensions.height : 800; // pixels
  
  // Calculate the position on the floor plan
  const x = Math.round(lngRatio * imageWidth);
  const y = Math.round(latRatio * imageHeight);
  
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
  
  const { topLeft, bottomRight } = building.referenceCoordinates;
  
  // Get the dimensions of the floor plan image
  // Try to get from cache first, otherwise use default values
  const cachedDimensions = getFloorImageDimensions(position.floorId);
  const imageWidth = cachedDimensions ? cachedDimensions.width : 1000; // pixels
  const imageHeight = cachedDimensions ? cachedDimensions.height : 800; // pixels
  
  // Calculate the relative position within the image
  const latRatio = position.y / imageHeight;
  const lngRatio = position.x / imageWidth;
  
  // Calculate the real-world coordinate
  const latitude = topLeft.latitude + latRatio * (bottomRight.latitude - topLeft.latitude);
  const longitude = topLeft.longitude + lngRatio * (bottomRight.longitude - topLeft.longitude);
  
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
      // These are example coordinates - you should replace with actual GPS coordinates
      referenceCoordinates: {
        topLeft: { latitude: -1.9442, longitude: 30.0619 },
        topRight: { latitude: -1.9442, longitude: 30.0629 },
        bottomLeft: { latitude: -1.9452, longitude: 30.0619 },
        bottomRight: { latitude: -1.9452, longitude: 30.0629 }
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
              coordinate: { latitude: -1.9447, longitude: 30.0624 } // Approximate - adjust as needed
            },
            {
              id: 'restroom-ground',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'Ground floor accessible restroom near Wellness Center',
              coordinate: { latitude: -1.9446, longitude: 30.0627 }
            },
            // Add other accessibility features like ramps, entrances, etc.
          ],
          routes: [
            {
              id: 'route-elevator-restroom-ground',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to restroom',
              points: [
                { latitude: -1.9447, longitude: 30.0624 }, // Elevator
                { latitude: -1.9446, longitude: 30.0626 }, // Hallway point
                { latitude: -1.9446, longitude: 30.0627 }  // Restroom
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
              coordinate: { latitude: -1.9447, longitude: 30.0624 }
            },
            {
              id: 'restroom-first',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'First floor accessible restroom near Mechanical Room',
              coordinate: { latitude: -1.9445, longitude: 30.0628 }
            }
          ],
          routes: [
            {
              id: 'route-elevator-wellness-first',
              name: 'Elevator to Wellness Center',
              description: 'Accessible route from elevator to Wellness Center',
              points: [
                { latitude: -1.9447, longitude: 30.0624 }, // Elevator
                { latitude: -1.9446, longitude: 30.0626 }, // Hallway point
                { latitude: -1.9445, longitude: 30.0627 }  // Wellness Center
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
              coordinate: { latitude: -1.9447, longitude: 30.0624 }
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