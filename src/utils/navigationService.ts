import { GeoPoint, RouteStep, NavigationRoute } from '../types';
import { getDistanceBetweenPoints, getBearingBetweenPoints } from './locationService';

// Constants for navigation
const WALKING_SPEED_METERS_PER_SECOND = 1.4; // Average walking speed
const DIRECTION_NAMES = [
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest', 'north'
];

/**
 * Converts a bearing in degrees to a cardinal direction name
 * @param bearing - Bearing in degrees (0-360)
 * @returns Cardinal direction name (e.g., "north", "southeast")
 */
export const getDirectionName = (bearing: number): string => {
  // Normalize bearing to 0-360 range
  const normalizedBearing = ((bearing % 360) + 360) % 360;
  // Convert to 0-8 index (N=0, NE=1, E=2, etc.)
  const index = Math.round(normalizedBearing / 45) % 8;
  return DIRECTION_NAMES[index];
};

/**
 * Generates a human-readable instruction for a navigation step
 * @param step - The route step
 * @param isFirstStep - Whether this is the first step in the route
 * @returns Human-readable instruction
 */
export const generateStepInstruction = (step: RouteStep, isFirstStep: boolean): string => {
  const directionName = getDirectionName(step.bearing);
  const distance = step.distance;
  
  // Format distance for human readability
  let distanceText = '';
  if (distance < 10) {
    distanceText = 'a few steps';
  } else if (distance < 100) {
    distanceText = 'about ' + Math.round(distance / 10) * 10 + ' meters';
  } else {
    distanceText = 'about ' + Math.round(distance / 100) * 100 + ' meters';
  }
  
  // Generate appropriate instruction based on step position
  if (isFirstStep) {
    return `Head ${directionName} for ${distanceText}`;
  } else {
    return `Continue ${directionName} for ${distanceText}`;
  }
};

/**
 * Calculates a navigation route between two points
 * @param start - Starting point
 * @param destination - Destination point
 * @returns A navigation route with steps
 */
export const calculateRoute = (start: GeoPoint, destination: GeoPoint): NavigationRoute => {
  // Calculate direct distance between points
  const totalDistance = getDistanceBetweenPoints(start, destination);
  
  // Calculate initial bearing
  const initialBearing = getBearingBetweenPoints(start, destination);
  
  // For a simple implementation, we'll create a direct route with just one step
  // In a real app, this would use a routing API or algorithm to find the best path
  const steps: RouteStep[] = [
    {
      startPoint: start,
      distance: totalDistance,
      bearing: initialBearing,
      instruction: generateStepInstruction({
        startPoint: start,
        distance: totalDistance,
        bearing: initialBearing,
        instruction: ''
      }, true)
    }
  ];
  
  // Calculate estimated time based on walking speed
  const estimatedTimeSeconds = totalDistance / WALKING_SPEED_METERS_PER_SECOND;
  
  return {
    origin: start,
    destination: destination,
    totalDistance: totalDistance,
    estimatedTimeSeconds: estimatedTimeSeconds,
    steps: steps
  };
};

/**
 * Calculates a more complex route with intermediate waypoints
 * This is a placeholder for a more sophisticated routing algorithm
 * @param start - Starting point
 * @param destination - Destination point
 * @param waypoints - Optional intermediate waypoints
 * @returns A navigation route with steps
 */
export const calculateComplexRoute = (
  start: GeoPoint, 
  destination: GeoPoint,
  waypoints: GeoPoint[] = []
): NavigationRoute => {
  // If no waypoints, use simple direct routing
  if (waypoints.length === 0) {
    return calculateRoute(start, destination);
  }
  
  // Include waypoints in the route
  const allPoints = [start, ...waypoints, destination];
  const steps: RouteStep[] = [];
  let totalDistance = 0;
  
  // Create steps between each consecutive pair of points
  for (let i = 0; i < allPoints.length - 1; i++) {
    const currentPoint = allPoints[i];
    const nextPoint = allPoints[i + 1];
    
    const segmentDistance = getDistanceBetweenPoints(currentPoint, nextPoint);
    const bearing = getBearingBetweenPoints(currentPoint, nextPoint);
    
    const step: RouteStep = {
      startPoint: currentPoint,
      distance: segmentDistance,
      bearing: bearing,
      instruction: generateStepInstruction({
        startPoint: currentPoint,
        distance: segmentDistance,
        bearing: bearing,
        instruction: ''
      }, i === 0)
    };
    
    steps.push(step);
    totalDistance += segmentDistance;
  }
  
  // Calculate estimated time based on walking speed
  const estimatedTimeSeconds = totalDistance / WALKING_SPEED_METERS_PER_SECOND;
  
  return {
    origin: start,
    destination: destination,
    totalDistance: totalDistance,
    estimatedTimeSeconds: estimatedTimeSeconds,
    steps: steps
  };
};

/**
 * Updates the current step index based on user location
 * @param currentLocation - Current user location
 * @param route - The navigation route
 * @param currentStepIndex - Current step index
 * @returns Updated step index
 */
export const updateCurrentStep = (
  currentLocation: GeoPoint,
  route: NavigationRoute,
  currentStepIndex: number
): number => {
  // If we're on the last step, check if we've reached the destination
  if (currentStepIndex >= route.steps.length - 1) {
    const distanceToDestination = getDistanceBetweenPoints(currentLocation, route.destination);
    // If within 10 meters of destination, stay on last step
    if (distanceToDestination <= 10) {
      return currentStepIndex;
    }
  }
  
  // Check if we've completed the current step
  const currentStep = route.steps[currentStepIndex];
  const nextStepStartPoint = currentStepIndex < route.steps.length - 1 
    ? route.steps[currentStepIndex + 1].startPoint 
    : route.destination;
  
  const distanceToNextPoint = getDistanceBetweenPoints(currentLocation, nextStepStartPoint);
  
  // If we're closer to the next point than a threshold (20 meters), move to next step
  if (distanceToNextPoint < 20) {
    return Math.min(currentStepIndex + 1, route.steps.length - 1);
  }
  
  return currentStepIndex;
};

/**
 * Checks if the user has reached the destination
 * @param currentLocation - Current user location
 * @param destination - Destination point
 * @param thresholdMeters - Distance threshold in meters (default: 10m)
 * @returns Whether the user has reached the destination
 */
export const hasReachedDestination = (
  currentLocation: GeoPoint,
  destination: GeoPoint,
  thresholdMeters: number = 10
): boolean => {
  const distance = getDistanceBetweenPoints(currentLocation, destination);
  return distance <= thresholdMeters;
};

/**
 * Finds the nearest waypoint to a given location
 * @param location - Current location
 * @param waypoints - List of waypoints
 * @returns The nearest waypoint and its distance
 */
export const findNearestWaypoint = (
  location: GeoPoint,
  waypoints: GeoPoint[]
): { waypoint: GeoPoint; distance: number } | null => {
  if (!waypoints.length) return null;
  
  let nearestWaypoint = waypoints[0];
  let shortestDistance = getDistanceBetweenPoints(location, waypoints[0]);
  
  waypoints.forEach(waypoint => {
    const distance = getDistanceBetweenPoints(location, waypoint);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestWaypoint = waypoint;
    }
  });
  
  return {
    waypoint: nearestWaypoint,
    distance: shortestDistance,
  };
};

/**
 * Formats a distance in meters to a human-readable string
 * @param distance - Distance in meters
 * @returns Formatted distance string
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)} meters`;
  } else {
    return `${(distance / 1000).toFixed(1)} km`;
  }
};

/**
 * Estimates travel time based on distance
 * @param distance - Distance in meters
 * @param speed - Walking speed in m/s (default: 1.4 m/s or 5 km/h)
 * @returns Estimated travel time in seconds
 */
export const estimateTravelTime = (distance: number, speed: number = 1.4): number => {
  return distance / speed;
};

/**
 * Formats travel time in seconds to a human-readable string
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTravelTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)} minutes`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

/**
 * Generates an announcement for an upcoming turn
 * @param currentLocation - Current user location
 * @param route - The navigation route
 * @param currentStepIndex - Current step index
 * @returns Announcement text or null if no announcement needed
 */
export const generateTurnAnnouncement = (
  currentLocation: GeoPoint,
  route: NavigationRoute,
  currentStepIndex: number
): string | null => {
  // If we're on the last step, check if we're approaching the destination
  if (currentStepIndex >= route.steps.length - 1) {
    const distanceToDestination = getDistanceBetweenPoints(currentLocation, route.destination);
    
    // Announce when approaching destination
    if (distanceToDestination <= 50 && distanceToDestination > 20) {
      return "Your destination is 50 meters ahead.";
    } else if (distanceToDestination <= 20) {
      return "You have arrived at your destination.";
    }
    
    return null;
  }
  
  // Check if we're approaching the next turn
  const nextStep = route.steps[currentStepIndex + 1];
  const distanceToNextTurn = getDistanceBetweenPoints(currentLocation, nextStep.startPoint);
  
  // Announce upcoming turns at different distances
  if (distanceToNextTurn <= 100 && distanceToNextTurn > 50) {
    const direction = getDirectionName(nextStep.bearing);
    return `In 100 meters, turn ${direction}.`;
  } else if (distanceToNextTurn <= 50 && distanceToNextTurn > 20) {
    const direction = getDirectionName(nextStep.bearing);
    return `In 50 meters, turn ${direction}.`;
  } else if (distanceToNextTurn <= 20 && distanceToNextTurn > 5) {
    const direction = getDirectionName(nextStep.bearing);
    return `Turn ${direction} now.`;
  }
  
  return null;
};

/**
 * Generates an announcement for nearby accessibility features
 * @param currentLocation - Current user location
 * @param waypoints - List of waypoints with accessibility features
 * @param announcedWaypoints - Set of already announced waypoint IDs
 * @returns Announcement text and waypoint ID, or null if no announcement needed
 */
export const generateAccessibilityAnnouncement = (
  currentLocation: GeoPoint,
  waypoints: Array<GeoPoint & { name?: string; description?: string }>,
  announcedWaypoints: Set<string>
): { announcement: string; waypointId: string } | null => {
  // Find nearby accessibility features that haven't been announced yet
  const nearbyFeatures = waypoints.filter(waypoint => {
    // Generate a unique ID for the waypoint
    const waypointId = `${waypoint.latitude.toFixed(6)},${waypoint.longitude.toFixed(6)}`;
    
    // Skip if already announced
    if (announcedWaypoints.has(waypointId)) {
      return false;
    }
    
    // Check if within announcement range (30 meters)
    const distance = getDistanceBetweenPoints(currentLocation, waypoint);
    return distance <= 30;
  });
  
  if (nearbyFeatures.length === 0) {
    return null;
  }
  
  // Get the closest feature
  const closestFeature = nearbyFeatures.reduce((closest, current) => {
    const closestDistance = getDistanceBetweenPoints(currentLocation, closest);
    const currentDistance = getDistanceBetweenPoints(currentLocation, current);
    return currentDistance < closestDistance ? current : closest;
  }, nearbyFeatures[0]);
  
  // Generate a unique ID for the waypoint
  const waypointId = `${closestFeature.latitude.toFixed(6)},${closestFeature.longitude.toFixed(6)}`;
  
  // Generate announcement based on feature type
  const featureName = closestFeature.name || 'Point of interest';
  const distance = Math.round(getDistanceBetweenPoints(currentLocation, closestFeature));
  const direction = getDirectionName(getBearingBetweenPoints(currentLocation, closestFeature));
  
  let announcement = `${featureName} ${distance} meters ${direction} of you.`;
  
  // Add description if available
  if (closestFeature.description) {
    announcement += ` ${closestFeature.description}`;
  }
  
  return {
    announcement,
    waypointId
  };
}; 