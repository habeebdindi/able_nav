// Accessibility feature types
export type FeatureType = 'ramp' | 'elevator' | 'restroom' | 'entrance' | 'parking' | 'other';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface AccessibilityFeature {
  id: string;
  type: FeatureType;
  title: string;
  description: string;
  coordinate: Coordinate;
}

export interface AccessibleRoute {
  id: string;
  name: string;
  description: string;
  points: Coordinate[];
}

export interface BuildingPlan {
  id: string;
  name: string;
  description: string;
  floors: Floor[];
  // Add reference coordinates to position the floor plan on the real world map
  referenceCoordinates: {
    topLeft: Coordinate;
    topRight: Coordinate;
    bottomLeft: Coordinate;
    bottomRight: Coordinate;
  };
}

export interface Floor {
  id: string;
  level: number;
  name: string;
  features: AccessibilityFeature[];
  routes: AccessibleRoute[];
  // Add the image URI for the floor plan
  floorPlanUri: string;
  // Add scale information to convert pixels to real-world coordinates
  scale: {
    pixelsPerMeter: number;
  };
}

// Indoor positioning types
export interface IndoorPosition {
  buildingId: string;
  floorId: string;
  // Position on the floor plan image (in pixels)
  x: number;
  y: number;
  // Optional real-world coordinates if available
  coordinate?: Coordinate;
}

// AR navigation types
export interface ARNavigationPoint {
  id: string;
  type: 'waypoint' | 'destination' | 'feature';
  position: {
    x: number;
    y: number;
    z: number;
  };
  label?: string;
  featureId?: string;
}

export interface ARNavigationPath {
  id: string;
  points: ARNavigationPoint[];
  color: string;
  width: number;
}

// User settings
export interface UserSettings {
  voiceNavigation: boolean;
  highContrast: boolean;
  largeText: boolean;
  vibrationFeedback: boolean;
  autoZoom: boolean;
  showAllAccessibility: boolean;
  preferredARMode: 'full' | 'minimal' | 'off';
} 