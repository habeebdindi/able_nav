import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { GPXData, GeoPoint, NavigationRoute, RouteStep } from '../types';
import { parseGPXContent } from '../utils/gpxParser';
import { getCurrentLocation, getDistanceBetweenPoints } from '../utils/locationService';
import { 
  calculateRoute, 
  calculateComplexRoute,
  updateCurrentStep, 
  hasReachedDestination, 
  generateTurnAnnouncement,
  generateAccessibilityAnnouncement
} from '../utils/navigationService';
import AccessibleMap from '../components/AccessibleMap';
import NavigationPanel from '../components/NavigationPanel';
import { 
  speakNavigationInstruction, 
  announceAccessibilityFeature, 
  cancelAllSpeech 
} from '../utils/speechService';

// Define the paths to the GPX files in assets
const GPX_ASSET_URI = '../assets/gpx/campus_main_accessible_routes.gpx';
const KENYA_BURUNDI_CLASSROOM_GPX = '../assets/gpx/kenya-burundi-classroom.gpx';
const LEADERSHIP_CENTER_GPX = '../assets/gpx/Leadership_Center_accessible2025-03-01_14-16_Sat.gpx';
const LEADERSHIP_CENTER_ELEVATOR_GPX = '../assets/gpx/Leadership_Center_Ground_Floor_Restroom_to_Elevator2025-03-01_15-35_Sat.gpx';

// Hardcoded GPX data as fallback
const FALLBACK_GPX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gpx version="1.1" creator="OsmAnd Maps 4.9.4 (4947)" xmlns="https://www.topografix.com/GPX/1/1" xmlns:osmand="https://osmand.net/docs/technical/osmand-file-formats/osmand-gpx" xmlns:gpxtpx="https://www8.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.topografix.com/GPX/1/1 https://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>accessible 2025-03-01_03-09_Sat</name>
        <time>2025-03-01T01:09:23Z</time>
    </metadata>
    <wpt lat="-1.9291356" lon="30.152598">
        <time>2025-03-01T01:13:02Z</time>
        <name>facility_restroom_wheelchair_accessible</name>
        <desc></desc>
        <type></type>
        <extensions>
            <osmand:color>#EECC22FF</osmand:color>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>
    <trk>
        <trkseg>
            <trkpt lat="-1.9290468" lon="30.1527823">
                <ele>1582.7</ele>
                <time>2025-03-01T01:09:11Z</time>
                <hdop>14.7</hdop>
                <extensions>
                    <osmand:speed>0.2</osmand:speed>
                </extensions>
            </trkpt>
            <trkpt lat="-1.9292028" lon="30.152579">
                <ele>1580.6</ele>
                <time>2025-03-01T01:09:17Z</time>
                <hdop>36.2</hdop>
                <extensions>
                    <osmand:speed>1.1</osmand:speed>
                </extensions>
            </trkpt>
            <trkpt lat="-1.9291653" lon="30.1525965">
                <ele>1578.3</ele>
                <time>2025-03-01T01:09:23Z</time>
                <hdop>45.7</hdop>
                <extensions>
                    <osmand:speed>0.4</osmand:speed>
                </extensions>
            </trkpt>
        </trkseg>
    </trk>
</gpx>`;

const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [navigatingToWaypoint, setNavigatingToWaypoint] = useState<string | null>(null);
  const [announcedWaypoints, setAnnouncedWaypoints] = useState<Set<string>>(new Set());
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState<number>(0);
  const [highlightedTrack, setHighlightedTrack] = useState<GeoPoint[] | null>(null);
  const [findingRoute, setFindingRoute] = useState<boolean>(false);
  const [isAccessibleRoute, setIsAccessibleRoute] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Memoize the parsed GPX data to prevent repeated parsing
  const parsedGpxData = useMemo(() => {
    console.log('Parsing GPX data (memoized)');
    // Parse both GPX files and merge the results
    const mainRoutes = parseGPXContent(FALLBACK_GPX);
    
    try {
      // Try to parse the kenya-burundi-classroom GPX file
      const kenyaBurundiGpx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gpx version="1.1" creator="OsmAnd Maps 4.9.4 (4947)" xmlns="https://www.topografix.com/GPX/1/1" xmlns:osmand="https://osmand.net/docs/technical/osmand-file-formats/osmand-gpx" xmlns:gpxtpx="https://www8.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.topografix.com/GPX/1/1 https://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>kenya-burundi-classroom</name>
        <time>2025-03-01T11:29:33Z</time>
    </metadata>
    <wpt lat="-1.9306339" lon="30.1536142">
        <time>2025-03-01T11:31:00Z</time>
        <name>entrance_main_wheelchair_accessible</name>
        <extensions>
            <osmand:color>#EECC22FF</osmand:color>
            <osmand:icon>special_star</osmand:icon>
            <osmand:background>square</osmand:background>
        </extensions>
    </wpt>
    <wpt lat="-1.9306235" lon="30.1535466">
        <time>2025-03-01T11:36:21Z</time>
        <name>entrance_main_wheelchair_accessible</name>
        <desc></desc>
        <type></type>
        <extensions>
            <osmand:color>#EECC22</osmand:color>
            <osmand:background>circle</osmand:background>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>
    <trk>
        <name>01-Mar-2025-1329</name>
        <trkseg>
            <trkpt lat="-1.9306715" lon="30.1536704">
                <ele>1562.5</ele>
                <time>2025-03-01T11:29:25Z</time>
            </trkpt>
            <trkpt lat="-1.9306439" lon="30.1536172">
                <ele>1562.4</ele>
                <time>2025-03-01T11:29:27Z</time>
            </trkpt>
            <trkpt lat="-1.9306091" lon="30.1534431">
                <ele>1562.6</ele>
                <time>2025-03-01T11:29:28Z</time>
            </trkpt>
            <trkpt lat="-1.9306192" lon="30.1534714">
                <ele>1562.9</ele>
                <time>2025-03-01T11:29:29Z</time>
            </trkpt>
            <trkpt lat="-1.9306244" lon="30.1534119">
                <ele>1563.3</ele>
                <time>2025-03-01T11:29:33Z</time>
            </trkpt>
        </trkseg>
    </trk>
    <extensions>
        <osmand:show_arrows>false</osmand:show_arrows>
        <osmand:show_start_finish>false</osmand:show_start_finish>
        <osmand:split_interval>0.0</osmand:split_interval>
        <osmand:split_type>no_split</osmand:split_type>
        <osmand:points_groups>
            <group name="" color="#22FFEECC" icon="special_star" background="square"/>
        </osmand:points_groups>
    </extensions>
</gpx>`;
      
      const kenyaBurundiData = parseGPXContent(kenyaBurundiGpx);
      
      // Parse the Leadership Center GPX file
      const leadershipCenterGpx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gpx version="1.1" creator="OsmAnd Maps 4.9.4 (4947)" xmlns="https://www.topografix.com/GPX/1/1" xmlns:osmand="https://osmand.net/docs/technical/osmand-file-formats/osmand-gpx" xmlns:gpxtpx="https://www8.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.topografix.com/GPX/1/1 https://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>2025-03-01_14-16_Sat</name>
        <time>2025-03-01T12:18:20Z</time>
    </metadata>
    <wpt lat="-1.9309295" lon="30.1528764">
        <time>2025-03-01T12:20:11Z</time>
        <name>entrance_main_wheelchair_accessible</name>
        <desc>Learning commons ground floor</desc>
        <type></type>
        <extensions>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>
    <wpt lat="-1.930898" lon="30.1528913">
        <time>2025-03-01T12:22:02Z</time>
        <name>entrance_main_wheelchair_accessible</name>
        <desc>Wellness center</desc>
        <type></type>
        <extensions>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>

    <wpt lat="-1.930834" lon="30.1528907">
        <time>2025-03-01T12:24:57Z</time>
        <name>facility_restroom_wheelchair_accessible</name>
        <desc>Restroom beside wellness centre</desc>
        <type></type>
        <extensions>
            <osmand:color>#EECC22FF</osmand:color>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>
    <trk>
        <name>Leadership Center Path</name>
        <trkseg>
            <trkpt lat="-1.930911" lon="30.1528804">
                <ele>1556.7</ele>
                <time>2025-03-01T12:16:12Z</time>
                <hdop>4.7</hdop>
            </trkpt>
            <trkpt lat="-1.9309111" lon="30.1528803">
                <ele>1556.7</ele>
                <time>2025-03-01T12:16:14Z</time>
                <hdop>4.5</hdop>
            </trkpt>
            <trkpt lat="-1.9309107" lon="30.1528814">
                <ele>1557</ele>
                <time>2025-03-01T12:16:16Z</time>
                <hdop>4.6</hdop>
            </trkpt>
            <trkpt lat="-1.9309453" lon="30.1528755">
                <ele>1558.5</ele>
                <time>2025-03-01T12:16:18Z</time>
                <hdop>4.7</hdop>
                <extensions>
                    <osmand:speed>1.5</osmand:speed>
                </extensions>
            </trkpt>
            <trkpt lat="-1.9308423" lon="30.1528791">
                <ele>1552.1</ele>
                <time>2025-03-01T12:18:20Z</time>
                <hdop>32.4</hdop>
            </trkpt>
        </trkseg>
    </trk>
</gpx>`;
      
      const leadershipCenterData = parseGPXContent(leadershipCenterGpx);
      
      // Parse the Leadership Center Elevator GPX file
      const leadershipCenterElevatorGpx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gpx version="1.1" creator="OsmAnd Maps 4.9.4 (4947)" xmlns="https://www.topografix.com/GPX/1/1" xmlns:osmand="https://osmand.net/docs/technical/osmand-file-formats/osmand-gpx" xmlns:gpxtpx="https://www8.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.topografix.com/GPX/1/1 https://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>Leadership_Center_Ground_Floor_Restroom_to_Elevator2025-03-01_15-35_Sat</name>
        <time>2025-03-01T13:36:12Z</time>
    </metadata>
    <wpt lat="-1.9308372" lon="30.1528853">
        <time>2025-03-01T13:50:47Z</time>
        <name>elevator_wheelchair_accessible</name>
        <desc>Leadership Center Ground floor elevator, can go two floors up</desc>
        <type></type>
        <extensions>
            <osmand:color>#CC22FFEE</osmand:color>
            <osmand:address></osmand:address>
        </extensions>
    </wpt>
    <trk>
        <name>Elevator Path</name>
        <trkseg>
            <trkpt lat="-1.9308503" lon="30.1528864">
                <ele>1552.3</ele>
                <time>2025-03-01T13:35:45Z</time>
                <hdop>20</hdop>
            </trkpt>
            <trkpt lat="-1.9308498" lon="30.1528868">
                <ele>1552.2</ele>
                <time>2025-03-01T13:35:52Z</time>
                <hdop>20</hdop>
            </trkpt>
            <trkpt lat="-1.9308356" lon="30.1528826">
                <ele>1551.7</ele>
                <time>2025-03-01T13:35:59Z</time>
                <hdop>20</hdop>
            </trkpt>
            <trkpt lat="-1.9308351" lon="30.1528828">
                <ele>1551.7</ele>
                <time>2025-03-01T13:36:05Z</time>
                <hdop>20</hdop>
            </trkpt>
            <trkpt lat="-1.9308313" lon="30.152884">
                <ele>1552.9</ele>
                <time>2025-03-01T13:36:12Z</time>
                <hdop>20</hdop>
            </trkpt>
        </trkseg>
    </trk>
</gpx>`;
    
    const leadershipCenterElevatorData = parseGPXContent(leadershipCenterElevatorGpx);
    
    // Merge all the data
    return {
      tracks: [
        ...mainRoutes.tracks, 
        ...kenyaBurundiData.tracks, 
        ...leadershipCenterData.tracks,
        ...leadershipCenterElevatorData.tracks
      ],
      waypoints: [
        ...mainRoutes.waypoints, 
        ...kenyaBurundiData.waypoints, 
        ...leadershipCenterData.waypoints,
        ...leadershipCenterElevatorData.waypoints
      ],
      metadata: mainRoutes.metadata // Keep the original metadata
    };
  } catch (error) {
    console.error('Error parsing additional GPX files:', error);
    // Return just the main routes if there's an error
    return mainRoutes;
  }
}, []);

const initializeApp = useCallback(async () => {
  // Prevent multiple initializations
  if (isInitialized) return;
  
  try {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    // Use the memoized parsed data instead of parsing again
    setGpxData(parsedGpxData);
    
    // Debug info
    setDebugInfo(`Tracks: ${parsedGpxData.tracks.length}, Waypoints: ${parsedGpxData.waypoints.length}`);
    
    // Validate the parsed data
    if (!parsedGpxData.tracks || parsedGpxData.tracks.length === 0) {
      console.warn('No tracks found in GPX data');
    }
    
    if (!parsedGpxData.waypoints || parsedGpxData.waypoints.length === 0) {
      console.warn('No waypoints found in GPX data');
    }
    
    // Get user location
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
      } else {
        console.warn('Could not get user location');
      }
    } catch (locationError) {
      console.error('Error getting location:', locationError);
      // Continue without location
    }
    
    setLoading(false);
    setIsInitialized(true);
  } catch (err) {
    console.error('Error initializing app:', err);
    setError('Failed to load navigation data. Please try again.');
    setLoading(false);
  }
}, [isInitialized, parsedGpxData]);

// Initialize app only once
useEffect(() => {
  if (!isInitialized) {
    initializeApp();
  }
}, [isInitialized, initializeApp]);

// Set up location tracking in a separate useEffect
useEffect(() => {
  // Only set up location tracking if the app is initialized
  if (!isInitialized) return;
  
  console.log('Setting up location tracking');
  
  const locationInterval = setInterval(async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        
        // Update navigation step if navigating
        if (navigationRoute && userLocation && navigatingToWaypoint) {
          // Check if user has reached destination
          if (hasReachedDestination(location, navigationRoute.destination)) {
            // Navigation complete
            speakNavigationInstruction("You have arrived at your destination.");
            Alert.alert(
              'Destination Reached',
              `You have arrived at ${navigatingToWaypoint}`,
              [{ text: 'OK', onPress: handleCloseNavigation }]
            );
          } else {
            // Update current step based on user location
            const updatedStepIndex = updateCurrentStep(
              location, 
              navigationRoute, 
              currentStepIndex
            );
            
            if (updatedStepIndex !== currentStepIndex) {
              setCurrentStepIndex(updatedStepIndex);
              // Automatically announce the new step
              const stepInstruction = navigationRoute.steps[updatedStepIndex].instruction;
              speakNavigationInstruction(stepInstruction);
            }
            
            // Check for turn announcements
            const currentTime = Date.now();
            // Only make announcements every 10 seconds to avoid too frequent interruptions
            if (currentTime - lastAnnouncementTime > 10000) {
              // Check for upcoming turns
              const turnAnnouncement = generateTurnAnnouncement(
                location,
                navigationRoute,
                currentStepIndex
              );
              
              if (turnAnnouncement && turnAnnouncement !== lastAnnouncement) {
                speakNavigationInstruction(turnAnnouncement);
                setLastAnnouncement(turnAnnouncement);
                setLastAnnouncementTime(currentTime);
              }
              
              // Check for nearby accessibility features if no turn announcement
              else if (gpxData && gpxData.waypoints) {
                const accessibilityAnnouncement = generateAccessibilityAnnouncement(
                  location,
                  gpxData.waypoints,
                  announcedWaypoints
                );
                
                if (accessibilityAnnouncement) {
                  // Use the specialized accessibility announcement function
                  const waypoint = gpxData.waypoints.find(wp => 
                    `${wp.latitude.toFixed(6)},${wp.longitude.toFixed(6)}` === accessibilityAnnouncement.waypointId
                  );
                  
                  if (waypoint && waypoint.name) {
                    // Extract feature type from the name
                    const featureType = waypoint.name.toLowerCase();
                    const displayName = waypoint.name.replace(/_/g, ' ');
                    
                    // Announce the accessibility feature
                    announceAccessibilityFeature(
                      featureType,
                      displayName,
                      waypoint.description
                    );
                  } else {
                    // Fallback to regular announcement if waypoint not found
                    speakNavigationInstruction(accessibilityAnnouncement.announcement);
                  }
                  
                  setLastAnnouncement(accessibilityAnnouncement.announcement);
                  setLastAnnouncementTime(currentTime);
                  
                  // Add to announced waypoints to avoid repeating
                  const updatedAnnouncedWaypoints = new Set(announcedWaypoints);
                  updatedAnnouncedWaypoints.add(accessibilityAnnouncement.waypointId);
                  setAnnouncedWaypoints(updatedAnnouncedWaypoints);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, 5000); // Update every 5 seconds
  
  return () => {
    clearInterval(locationInterval);
  };
}, [isInitialized, navigationRoute, userLocation, currentStepIndex, navigatingToWaypoint, announcedWaypoints, lastAnnouncement, lastAnnouncementTime, gpxData]);

const handleRefreshLocation = async () => {
  try {
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
    } else {
      Alert.alert('Location Error', 'Unable to get your current location. Please check your location permissions.');
    }
  } catch (err) {
    console.error('Error refreshing location:', err);
    Alert.alert('Error', 'Failed to update your location. Please try again.');
  }
};

// Handle navigation to waypoint
const handleNavigateToWaypoint = (waypoint: GeoPoint, waypointName: string) => {
  // Prevent duplicate navigation to the same waypoint
  if (navigatingToWaypoint === waypointName) {
    return;
  }
  
  if (userLocation && gpxData) {
    // Show loading indicator while finding route
    setFindingRoute(true);
    setDebugInfo("Finding the best accessible route...");
    
    // Use setTimeout to allow the UI to update before heavy computation
    setTimeout(() => {
      try {
        // Find the nearest point on any track to the user's current location
        let nearestTrackPoint: GeoPoint | null = null;
        let minDistanceToTrack = Infinity;
        let trackIndex = -1;
        
        gpxData.tracks.forEach((track, tIndex) => {
          if (track.points && track.points.length > 0) {
            track.points.forEach(point => {
              const distance = getDistanceBetweenPoints(userLocation, point);
              if (distance < minDistanceToTrack) {
                minDistanceToTrack = distance;
                nearestTrackPoint = point;
                trackIndex = tIndex;
              }
            });
          }
        });
        
        // Find the nearest point on the track to the destination waypoint
        let nearestTrackPointToDestination: GeoPoint | null = null;
        let minDistanceToDestination = Infinity;
        
        if (trackIndex >= 0 && gpxData.tracks[trackIndex].points) {
          gpxData.tracks[trackIndex].points.forEach(point => {
            const distance = getDistanceBetweenPoints(waypoint, point);
            if (distance < minDistanceToDestination) {
              minDistanceToDestination = distance;
              nearestTrackPointToDestination = point;
            }
          });
        }
        
        let route: NavigationRoute;
        
        // If we found points on the track close to both user and destination
        if (nearestTrackPoint && nearestTrackPointToDestination) {
          // First, guide user to the nearest point on the track
          const routeToTrack = calculateRoute(userLocation, nearestTrackPoint);
          
          // Then, create a route that follows the track to the destination
          // Find indices of nearest points
          const trackPoints = gpxData.tracks[trackIndex].points;
          const startIndex = trackPoints.findIndex(
            p => p.latitude === nearestTrackPoint?.latitude && p.longitude === nearestTrackPoint?.longitude
          );
          const endIndex = trackPoints.findIndex(
            p => p.latitude === nearestTrackPointToDestination?.latitude && 
                p.longitude === nearestTrackPointToDestination?.longitude
          );
          
          // Determine direction along track (forward or backward)
          const trackSegment = startIndex <= endIndex 
            ? trackPoints.slice(startIndex, endIndex + 1)
            : trackPoints.slice(endIndex, startIndex + 1).reverse();
          
          // Highlight the accessible track segment
          setHighlightedTrack(trackSegment);
          
          // Create waypoints from track segment
          const trackWaypoints = trackSegment.slice(1, -1); // Exclude start and end
          
          // Calculate route through track waypoints
          const routeAlongTrack = calculateComplexRoute(
            nearestTrackPoint,
            nearestTrackPointToDestination,
            trackWaypoints
          );
          
          // Finally, guide from track to actual destination
          const routeToDestination = calculateRoute(nearestTrackPointToDestination, waypoint);
          
          // Combine all routes
          const totalDistance = routeToTrack.totalDistance + 
                               routeAlongTrack.totalDistance + 
                               routeToDestination.totalDistance;
          
          const estimatedTimeSeconds = routeToTrack.estimatedTimeSeconds + 
                                     routeAlongTrack.estimatedTimeSeconds + 
                                     routeToDestination.estimatedTimeSeconds;
          
          // Combine all steps
          const allSteps = [
            ...routeToTrack.steps.map((step: RouteStep) => ({
              ...step,
              instruction: step.instruction + " to reach the accessible route"
            })),
            ...routeAlongTrack.steps.map((step: RouteStep) => ({
              ...step,
              instruction: step.instruction + " along the accessible route"
            })),
            ...routeToDestination.steps.map((step: RouteStep) => ({
              ...step,
              instruction: step.instruction + " to reach your destination"
            }))
          ];
          
          route = {
            origin: userLocation,
            destination: waypoint,
            totalDistance,
            estimatedTimeSeconds,
            steps: allSteps
          };
          
          // Set flag for accessible route
          setIsAccessibleRoute(true);
          
          // Add debug info about the route
          setDebugInfo(`Navigating to: ${waypointName} via accessible route. Total distance: ${Math.round(totalDistance)}m`);
          
          // Announce start of navigation with accessible route
          speakNavigationInstruction(`Starting navigation to ${waypointName.replace(/_/g, ' ')} using an accessible routes and facilities.`);
        } else {
          // Fallback to direct route if we couldn't find suitable track points
          route = calculateRoute(userLocation, waypoint);
          setHighlightedTrack(null);
          setIsAccessibleRoute(false);
          setDebugInfo(`Navigating directly to: ${waypointName}, Distance: ${Math.round(route.totalDistance)}m`);
          
          // Announce start of navigation with direct route
          speakNavigationInstruction(`Starting navigation to ${waypointName.replace(/_/g, ' ')}. No accessible route found, using direct path.`);
        }
        
        setNavigationRoute(route);
        setNavigatingToWaypoint(waypointName);
        setCurrentStepIndex(0);
        
        console.log('Navigation started:', {
          destination: waypointName,
          steps: route.steps.length,
          distance: route.totalDistance,
          isAccessible: isAccessibleRoute
        });
      } catch (err: any) {
        console.error('Error calculating route:', err);
        setDebugInfo(`Error finding route: ${err.message || 'Unknown error'}`);
      } finally {
        setFindingRoute(false);
      }
    }, 100);
  } else {
    Alert.alert('Location Error', 'Unable to start navigation without your current location.');
  }
};

// Handle closing navigation
const handleCloseNavigation = () => {
  // Stop any ongoing speech using our dedicated function
  cancelAllSpeech();
  
  // Clear navigation state
  setNavigationRoute(null);
  setNavigatingToWaypoint(null);
  setCurrentStepIndex(0);
  setAnnouncedWaypoints(new Set());
  setLastAnnouncement(null);
  setHighlightedTrack(null);
  setIsAccessibleRoute(false);
  setDebugInfo(`Navigation cancelled`);
  
  // Add a flag to prevent further announcements
  setLastAnnouncementTime(Date.now() + 1000000); // Set to far future to prevent new announcements
  
  console.log('Navigation cancelled and all announcements stopped');
};

if (loading) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1a73e8" />
      <Text style={styles.loadingText}>Loading navigation data...</Text>
    </SafeAreaView>
  );
}

if (error) {
  return (
    <SafeAreaView style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {
          initializeApp();
        }}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

return (
  <SafeAreaView style={styles.container}>
    {debugInfo && (
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>{debugInfo}</Text>
        {findingRoute && <ActivityIndicator size="small" color="#1a73e8" style={styles.debugLoader} />}
      </View>
    )}
    <View style={styles.mapContainer}>
      <AccessibleMap 
        gpxData={gpxData || undefined}
        userLocation={userLocation || undefined}
        initialRegion={
          userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : gpxData && gpxData.tracks.length > 0 && gpxData.tracks[0].points.length > 0 ? {
            latitude: gpxData.tracks[0].points[0].latitude,
            longitude: gpxData.tracks[0].points[0].longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : undefined
        }
        onNavigateToWaypoint={handleNavigateToWaypoint}
        highlightedTrack={highlightedTrack || undefined}
        navigationRoute={navigationRoute || undefined}
      />
    </View>
    
    {navigationRoute && navigatingToWaypoint && (
      <View style={styles.navigationPanelContainer}>
        <NavigationPanel
          route={navigationRoute}
          currentStepIndex={currentStepIndex}
          onClose={handleCloseNavigation}
          isAccessibleRoute={isAccessibleRoute}
        />
      </View>
    )}
    
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleRefreshLocation}
      >
        <Text style={styles.buttonText}>Refresh Location</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  debugLoader: {
    marginLeft: 10,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#1a73e8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationPanelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
  },
});

export default HomeScreen; 