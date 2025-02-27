import { AccessibilityFeature, AccessibleRoute, BuildingPlan } from '../types';

// Mock accessibility features for outdoor locations
export const getAccessibilityFeatures = (latitude: number, longitude: number): AccessibilityFeature[] => {
  return [
    {
      id: '1',
      type: 'ramp',
      title: 'Main Entrance Ramp',
      description: 'Wheelchair accessible ramp at main entrance',
      coordinate: { 
        latitude: latitude + 0.0005, 
        longitude: longitude + 0.0003 
      },
    },
    {
      id: '2',
      type: 'elevator',
      title: 'Central Elevator',
      description: 'Accessible elevator to all floors',
      coordinate: { 
        latitude: latitude + 0.001, 
        longitude: longitude + 0.0006 
      },
    },
    {
      id: '3',
      type: 'restroom',
      title: 'Accessible Restroom',
      description: 'First floor accessible restroom',
      coordinate: { 
        latitude: latitude + 0.0015, 
        longitude: longitude + 0.0009 
      },
    },
    {
      id: '4',
      type: 'entrance',
      title: 'Accessible Side Entrance',
      description: 'No-step entrance on east side of building',
      coordinate: { 
        latitude: latitude - 0.0005, 
        longitude: longitude + 0.0005 
      },
    },
    {
      id: '5',
      type: 'parking',
      title: 'Accessible Parking',
      description: '4 accessible parking spots near main entrance',
      coordinate: { 
        latitude: latitude - 0.001, 
        longitude: longitude - 0.0005 
      },
    },
  ];
};

// Mock accessible routes
export const getAccessibleRoutes = (latitude: number, longitude: number): AccessibleRoute[] => {
  return [
    {
      id: '1',
      name: 'Main Entrance to Elevator',
      description: 'Accessible route from main entrance to central elevator',
      points: [
        { latitude, longitude },
        { latitude: latitude + 0.0005, longitude: longitude + 0.0003 },
        { latitude: latitude + 0.001, longitude: longitude + 0.0006 },
      ],
    },
    {
      id: '2',
      name: 'Parking to Side Entrance',
      description: 'Accessible route from parking to side entrance',
      points: [
        { latitude: latitude - 0.001, longitude: longitude - 0.0005 },
        { latitude: latitude - 0.0005, longitude: longitude },
        { latitude: latitude - 0.0005, longitude: longitude + 0.0005 },
      ],
    },
    {
      id: '3',
      name: 'Elevator to Restroom',
      description: 'Accessible route from elevator to restroom',
      points: [
        { latitude: latitude + 0.001, longitude: longitude + 0.0006 },
        { latitude: latitude + 0.0012, longitude: longitude + 0.0007 },
        { latitude: latitude + 0.0015, longitude: longitude + 0.0009 },
      ],
    },
  ];
};

// Mock building plans
export const getBuildingPlans = (): BuildingPlan[] => {
  return [
    {
      id: '1',
      name: 'ALU Main Building',
      description: 'African Leadership University main campus building',
      referenceCoordinates: {
        topLeft: { latitude: -1.9442, longitude: 30.0619 },
        topRight: { latitude: -1.9442, longitude: 30.0629 },
        bottomLeft: { latitude: -1.9452, longitude: 30.0619 },
        bottomRight: { latitude: -1.9452, longitude: 30.0629 }
      },
      floors: [
        {
          id: 'f1',
          level: 1,
          name: 'Ground Floor',
          floorPlanUri: 'https://example.com/floor-plans/alu-ground-floor.png',
          scale: {
            pixelsPerMeter: 10
          },
          features: [
            {
              id: 'f1-1',
              type: 'entrance',
              title: 'Main Entrance',
              description: 'Wheelchair accessible main entrance',
              coordinate: { latitude: 0, longitude: 0 }, // Indoor coordinates would be different
            },
            {
              id: 'f1-2',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: 0, longitude: 0 },
            },
            {
              id: 'f1-3',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'Ground floor accessible restroom',
              coordinate: { latitude: 0, longitude: 0 },
            },
          ],
          routes: [
            {
              id: 'r1-1',
              name: 'Entrance to Elevator',
              description: 'Accessible route from entrance to elevator',
              points: [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 0 },
              ],
            },
          ],
        },
        {
          id: 'f2',
          level: 2,
          name: 'First Floor',
          floorPlanUri: 'https://example.com/floor-plans/alu-first-floor.png',
          scale: {
            pixelsPerMeter: 10
          },
          features: [
            {
              id: 'f2-1',
              type: 'elevator',
              title: 'Main Elevator',
              description: 'Accessible elevator to all floors',
              coordinate: { latitude: 0, longitude: 0 },
            },
            {
              id: 'f2-2',
              type: 'restroom',
              title: 'Accessible Restroom',
              description: 'First floor accessible restroom',
              coordinate: { latitude: 0, longitude: 0 },
            },
          ],
          routes: [
            {
              id: 'r2-1',
              name: 'Elevator to Restroom',
              description: 'Accessible route from elevator to restroom',
              points: [
                { latitude: 0, longitude: 0 },
                { latitude: 0, longitude: 0 },
              ],
            },
          ],
        },
      ],
    },
  ];
}; 