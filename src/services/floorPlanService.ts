import { BuildingPlan, Floor, AccessibilityFeature, AccessibleRoute, Coordinate, IndoorPosition } from '../types';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// In-memory cache for loaded floor plans
let buildingPlansCache: BuildingPlan[] = [];

/**
 * Load building plans from storage or API
 * In a real app, this would fetch from a backend API
 */
export const loadBuildingPlans = async (): Promise<BuildingPlan[]> => {
  try {
    // For now, we'll return the mock data
    // In a real app, this would fetch from an API or local storage
    buildingPlansCache = getMockBuildingPlans();
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
  
  // Get the dimensions of the floor plan image (this would need to be determined from the actual image)
  // For now, we'll use placeholder values
  const imageWidth = 1000; // pixels
  const imageHeight = 800; // pixels
  
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
  
  // Get the dimensions of the floor plan image (this would need to be determined from the actual image)
  // For now, we'll use placeholder values
  const imageWidth = 1000; // pixels
  const imageHeight = 800; // pixels
  
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
const getMockBuildingPlans = (): BuildingPlan[] => {
  return [
    {
      id: 'building-1',
      name: 'Main Campus Building',
      description: 'The main academic building on campus',
      referenceCoordinates: {
        topLeft: { latitude: 37.7850, longitude: -122.4350 },
        topRight: { latitude: 37.7850, longitude: -122.4330 },
        bottomLeft: { latitude: 37.7830, longitude: -122.4350 },
        bottomRight: { latitude: 37.7830, longitude: -122.4330 }
      },
      floors: [
        {
          id: 'floor-1',
          level: 1,
          name: 'Ground Floor',
          floorPlanUri: 'https://example.com/floorplans/building1-floor1.png', // This would be a local URI in a real app
          scale: {
            pixelsPerMeter: 20 // 20 pixels = 1 meter
          },
          features: [
            {
              id: 'feature-1',
              type: 'entrance',
              title: 'Main Entrance',
              description: 'Wheelchair accessible main entrance with automatic doors',
              coordinate: { latitude: 37.7845, longitude: -122.4348 }
            },
            {
              id: 'feature-2',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: 37.7842, longitude: -122.4340 }
            },
            {
              id: 'feature-3',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'Ground floor accessible restroom',
              coordinate: { latitude: 37.7838, longitude: -122.4335 }
            }
          ],
          routes: [
            {
              id: 'route-1',
              name: 'Entrance to Elevator',
              description: 'Accessible route from main entrance to elevator',
              points: [
                { latitude: 37.7845, longitude: -122.4348 },
                { latitude: 37.7844, longitude: -122.4345 },
                { latitude: 37.7842, longitude: -122.4340 }
              ]
            },
            {
              id: 'route-2',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to restroom',
              points: [
                { latitude: 37.7842, longitude: -122.4340 },
                { latitude: 37.7840, longitude: -122.4338 },
                { latitude: 37.7838, longitude: -122.4335 }
              ]
            }
          ]
        },
        {
          id: 'floor-2',
          level: 2,
          name: 'First Floor',
          floorPlanUri: 'https://example.com/floorplans/building1-floor2.png',
          scale: {
            pixelsPerMeter: 20
          },
          features: [
            {
              id: 'feature-4',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: 37.7842, longitude: -122.4340 }
            },
            {
              id: 'feature-5',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'First floor accessible restroom',
              coordinate: { latitude: 37.7835, longitude: -122.4338 }
            }
          ],
          routes: [
            {
              id: 'route-3',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to restroom',
              points: [
                { latitude: 37.7842, longitude: -122.4340 },
                { latitude: 37.7838, longitude: -122.4339 },
                { latitude: 37.7835, longitude: -122.4338 }
              ]
            }
          ]
        }
      ]
    },
    // Add the Leadership Center building with the floor plan you've added
    {
      id: 'building-2',
      name: 'Leadership Center',
      description: 'ALU Leadership Center with accessible facilities',
      // These are example coordinates - you would need to replace with actual GPS coordinates
      referenceCoordinates: {
        topLeft: { latitude: 37.7860, longitude: -122.4360 },
        topRight: { latitude: 37.7860, longitude: -122.4340 },
        bottomLeft: { latitude: 37.7840, longitude: -122.4360 },
        bottomRight: { latitude: 37.7840, longitude: -122.4340 }
      },
      floors: [
        {
          id: 'leadership-floor-1',
          level: 1,
          name: 'Leadership Center Ground Floor',
          // Use the local asset path for the floor plan you've added
          floorPlanUri: require('../assets/floorplans/leadership_center_ground_floor_plan_ALU.png'),
          scale: {
            pixelsPerMeter: 20 // This should be adjusted based on the actual scale of your floor plan
          },
          features: [
            {
              id: 'leadership-feature-1',
              type: 'entrance',
              title: 'Secondary Entrance',
              description: 'Wheelchair accessible main entrance',
              coordinate: { latitude: 37.7855, longitude: -122.4358 }
            },
            {
              id: 'leadership-feature-2',
              type: 'elevator',
              title: 'Central Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: 37.7850, longitude: -122.4350 }
            },
            {
              id: 'leadership-feature-3',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'Ground floor accessible restroom',
              coordinate: { latitude: 37.7845, longitude: -122.4345 }
            }
          ],
          routes: [
            {
              id: 'leadership-route-1',
              name: 'Entrance to Elevator',
              description: 'Accessible route from secondary entrance to elevator, adjacent to the wellness. Elevator leads to 1st and 2nd floor',
              points: [
                { latitude: 37.7855, longitude: -122.4358 },
                { latitude: 37.7853, longitude: -122.4354 },
                { latitude: 37.7850, longitude: -122.4350 }
              ]
            },
            {
              id: 'leadership-route-2',
              name: 'Direct access to Restroom',
              description: 'Accessible route to restroom, opposite the wellness center',
              points: [
                { latitude: 37.7850, longitude: -122.4350 },
                { latitude: 37.7848, longitude: -122.4348 },
                { latitude: 37.7845, longitude: -122.4345 }
              ]
            }
          ]
        }
      ]
    }
  ];
}; 