/**
 * Represents a point in a GPX track
 */
export interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  time?: string;
  speed?: number;
  hdop?: number; // Horizontal dilution of precision
}

/**
 * Represents a track in a GPX file
 */
export interface Track {
  name: string;
  points: TrackPoint[];
}

/**
 * Represents a waypoint in a GPX file
 */
export interface Waypoint {
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
  time?: string;
  type?: string;
}

/**
 * Represents metadata from a GPX file
 */
export interface GPXMetadata {
  name?: string;
  time?: string;
}

/**
 * Represents structured data from a parsed GPX file
 */
export interface GPXData {
  tracks: Track[];
  waypoints: Waypoint[];
  metadata: GPXMetadata;
}

/**
 * Represents a geographic point
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}