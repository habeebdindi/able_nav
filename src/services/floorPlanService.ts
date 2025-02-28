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
  
  // Log the input for debugging during demo
  console.log(`Converting coordinate for floor: ${floor.name}`);
  console.log(`Coordinate: ${coordinate.latitude}, ${coordinate.longitude}`);
  
  const { topLeft, topRight, bottomLeft, bottomRight } = building.referenceCoordinates;
  
  // Calculate the building's width and height in degrees
  const buildingWidthLng = Math.abs(topRight.longitude - topLeft.longitude);
  const buildingHeightLat = Math.abs(topLeft.latitude - bottomLeft.latitude);
  
  // Increase the margin to allow for GPS inaccuracy
  const margin = 0.0005; // Approximately 50 meters
  
  // Check if the coordinate is within the building bounds (with margin)
  // FIXED: Southern hemisphere (negative latitude) comparison
  const isOutsideBounds = 
    coordinate.latitude > (topLeft.latitude + margin) ||   // Too far north
    coordinate.latitude < (bottomLeft.latitude - margin) || // Too far south
    coordinate.longitude < (topLeft.longitude - margin) ||  // Too far west
    coordinate.longitude > (topRight.longitude + margin);   // Too far east
    
  if (isOutsideBounds) {
    console.warn('Coordinate is outside building bounds:', coordinate);
    // For demo purposes, we'll still show a position at the building's center
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
  
  // Get the cached dimensions of the floor plan image
  const cachedDimensions = getFloorImageDimensions(floorId);
  const imageWidth = cachedDimensions ? cachedDimensions.width : 1000;
  const imageHeight = cachedDimensions ? cachedDimensions.height : 800;
  
  // FLOOR-SPECIFIC ANCHOR POINTS
  // Each floor has specific reference points for accurate positioning
  let xOffset = 0;
  let yOffset = 0;
  
  switch (floor.id) {
    case 'leadership-floor-ground':
      // Ground floor - positions based on the elevator location
      // The elevator is our reference point at coordinate {latitude: -1.930647, longitude: 30.153170}
      // We know from the floor plan that the elevator (L0-09) is located at specific pixel positions
      xOffset = 0;
      yOffset = 0;
      break;
      
    case 'leadership-floor-first':
      // First floor - position based on first floor elevator location
      // The elevator is our reference point, marked as L1-16 on the plans
      xOffset = 0; 
      yOffset = 0;
      break;
      
    case 'leadership-floor-second':
      // Second floor - position based on second floor elevator location
      // The elevator is our reference point, marked as L2-10 on the plans
      xOffset = 0;
      yOffset = 0;
      break;
      
    default:
      // No offsets for unknown floors
      xOffset = 0;
      yOffset = 0;
  }
  
  // FIXED: Normalization math for southern hemisphere
  // Calculate the relative position within the geo-rectangle
  const normalizedLng = (coordinate.longitude - topLeft.longitude) / buildingWidthLng;
  const normalizedLat = (coordinate.latitude - topLeft.latitude) / buildingHeightLat;
  
  // Constrain to [0,1] range in case GPS puts us slightly outside
  const constrainedLng = Math.max(0, Math.min(1, normalizedLng));
  const constrainedLat = Math.max(0, Math.min(1, normalizedLat));
  
  // Calculate the position on the floor plan with floor-specific offsets
  // We flip the Y coordinate because image Y increases downward but latitude increases upward
  const x = Math.round(constrainedLng * imageWidth) + xOffset;
  const y = Math.round((1 - constrainedLat) * imageHeight) + yOffset;
  
  console.log(`Floor ${floor.name} position: x=${x}, y=${y}`);
  
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
      // GPS coordinates for the corners of the building - UPDATED with a slightly larger area
      referenceCoordinates: {
        topLeft: {
          latitude: -1.9307996622349982, // Slightly more negative (further north)
          longitude: 30.15253934189284   // Slightly smaller (further west)
        },
        topRight: {
          latitude: -1.9307996622349982, // Slightly more negative (further north)
          longitude: 30.153260658107158  // Slightly larger (further east)
        },
        bottomLeft: {
          latitude: -1.930400337765002,  // Slightly less negative (further south)
          longitude: 30.15253934189284   // Slightly smaller (further west)
        },
        bottomRight: {
          latitude: -1.930400337765002,  // Slightly less negative (further south)
          longitude: 30.153260658107158  // Slightly larger (further east)
        }
      },
      floors: [
        {
          id: 'leadership-floor-ground',
          level: 1,
          name: 'Ground Floor',
          floorPlanUri: require('../assets/floorplans/inside_leadership_center_ground_floor_plan-map_ALU.png'),
          scale: {
            pixelsPerMeter: 20 // Updated from 34.5 to 20 based on floor plans
          },
          features: [
            {
              id: 'elevator-ground',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.930647,
                longitude: 30.153170
              }
            },
            {
              id: 'restroom-male-ground',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'Ground floor accessible male restroom',
              coordinate: {
                latitude: -1.930638,
                longitude: 30.153087
              }
            },
            {
              id: 'restroom-female-ground',
              type: 'restroom',
              title: 'Female Restroom',
              description: 'Ground floor accessible female restroom',
              coordinate: {
                latitude: -1.930627,
                longitude: 30.153092
              }
            },
            {
              id: 'entrance-main',
              type: 'entrance',
              title: 'Main Entrance',
              description: 'Main accessible entrance to the Leadership Center',
              coordinate: {
                latitude: -1.930795,
                longitude: 30.152860
              }
            },
            {
              id: 'ramp-entrance',
              type: 'ramp',
              title: 'Entrance Ramp',
              description: 'Wheelchair accessible ramp at the main entrance',
              coordinate: {
                latitude: -1.930778,
                longitude: 30.152845
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
                  latitude: -1.930795,
                  longitude: 30.152860
                },
                {
                  latitude: -1.930715,
                  longitude: 30.153000
                },
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                }
              ]
            },
            {
              id: 'route-elevator-restroom-ground',
              name: 'Elevator to Restrooms',
              description: 'Accessible route from elevator to the restrooms',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930638,
                  longitude: 30.153090
                },
                {
                  latitude: -1.930627,
                  longitude: 30.153092
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
            pixelsPerMeter: 20 // Updated from 34.5 to 20 based on floor plans
          },
          features: [
            {
              id: 'elevator-first',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.930647,
                longitude: 30.153170
              }
            },
            {
              id: 'restroom-male-first',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'First floor accessible male restroom',
              coordinate: {
                latitude: -1.930638,
                longitude: 30.153087
              }
            },
            {
              id: 'restroom-female-first',
              type: 'restroom',
              title: 'Female Restroom',
              description: 'First floor accessible female restroom',
              coordinate: {
                latitude: -1.930627,
                longitude: 30.153092
              }
            },
            {
              id: 'computer-lab',
              type: 'other',
              title: 'Computer Lab',
              description: 'Accessible computer lab with adjustable desks',
              coordinate: {
                latitude: -1.930656,
                longitude: 30.153010
              }
            },
            {
              id: 'study-room-first',
              type: 'other',
              title: 'Accessible Study Room',
              description: 'First floor quiet study room with accessible furniture',
              coordinate: {
                latitude: -1.930582,
                longitude: 30.152950
              }
            }
          ],
          routes: [
            {
              id: 'route-elevator-restroom-first',
              name: 'Elevator to Restrooms',
              description: 'Accessible route from elevator to the restrooms',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930642,
                  longitude: 30.153120
                },
                {
                  latitude: -1.930638,
                  longitude: 30.153087
                },
                {
                  latitude: -1.930630,
                  longitude: 30.153090
                },
                {
                  latitude: -1.930627,
                  longitude: 30.153092
                }
              ]
            },
            {
              id: 'route-elevator-computer-lab',
              name: 'Elevator to Computer Lab',
              description: 'Accessible route from elevator to the computer lab',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930652,
                  longitude: 30.153090
                },
                {
                  latitude: -1.930656,
                  longitude: 30.153010
                }
              ]
            },
            {
              id: 'route-computer-lab-study-room',
              name: 'Computer Lab to Study Room',
              description: 'Accessible route from computer lab to study room',
              points: [
                {
                  latitude: -1.930656,
                  longitude: 30.153010
                },
                {
                  latitude: -1.930620,
                  longitude: 30.152980
                },
                {
                  latitude: -1.930582,
                  longitude: 30.152950
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
            pixelsPerMeter: 20 // Updated from 34.5 to 20 based on floor plans
          },
          features: [
            {
              id: 'elevator-second',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator connecting all floors',
              coordinate: {
                latitude: -1.930647,
                longitude: 30.153170
              }
            },
            {
              id: 'restroom-male-second',
              type: 'restroom',
              title: 'Male Restroom',
              description: 'Second floor accessible male restroom',
              coordinate: {
                latitude: -1.930638,
                longitude: 30.153087
              }
            },
            {
              id: 'restroom-female-second',
              type: 'restroom',
              title: 'Female Restroom',
              description: 'Second floor accessible female restroom',
              coordinate: {
                latitude: -1.930627,
                longitude: 30.153092
              }
            },
            {
              id: 'meeting-room-second',
              type: 'other',
              title: 'Accessible Meeting Room',
              description: 'Second floor meeting room with accessible furniture',
              coordinate: {
                latitude: -1.930575,
                longitude: 30.153050
              }
            },
            {
              id: 'reading-area-second',
              type: 'other',
              title: 'Reading Area',
              description: 'Quiet reading area with accessible seating',
              coordinate: {
                latitude: -1.930700,
                longitude: 30.152990
              }
            },
            {
              id: 'charging-station-second',
              type: 'other',
              title: 'Charging Station',
              description: 'Accessible charging station for mobility devices',
              coordinate: {
                latitude: -1.930662,
                longitude: 30.153220
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
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930642,
                  longitude: 30.153120
                },
                {
                  latitude: -1.930638,
                  longitude: 30.153087
                },
                {
                  latitude: -1.930632,
                  longitude: 30.153090
                },
                {
                  latitude: -1.930627,
                  longitude: 30.153092
                }
              ]
            },
            {
              id: 'route-elevator-meeting-room',
              name: 'Elevator to Meeting Room',
              description: 'Accessible route from elevator to the meeting room',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930610,
                  longitude: 30.153110
                },
                {
                  latitude: -1.930575,
                  longitude: 30.153050
                }
              ]
            },
            {
              id: 'route-elevator-reading-area',
              name: 'Elevator to Reading Area',
              description: 'Accessible route from elevator to the reading area',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930670,
                  longitude: 30.153080
                },
                {
                  latitude: -1.930700,
                  longitude: 30.152990
                }
              ]
            },
            {
              id: 'route-elevator-charging-station',
              name: 'Elevator to Charging Station',
              description: 'Accessible route to mobility device charging station',
              points: [
                {
                  latitude: -1.930647,
                  longitude: 30.153170
                },
                {
                  latitude: -1.930655,
                  longitude: 30.153195
                },
                {
                  latitude: -1.930662,
                  longitude: 30.153220
                }
              ]
            }
          ]
        }
      ]
    }
  ];
};

/**
 * Update the scale of a floor
 */
export const updateFloorScale = (floorId: string, pixelsPerMeter: number): void => {
  // Find the floor in the building plans cache
  for (const building of buildingPlansCache) {
    const floor = building.floors.find(f => f.id === floorId);
    if (floor) {
      // Update the scale
      floor.scale.pixelsPerMeter = pixelsPerMeter;
      console.log(`Updated floor ${floorId} scale to ${pixelsPerMeter} pixels/meter`);
      break;
    }
  }
}