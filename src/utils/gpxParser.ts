import * as FileSystem from 'expo-file-system';
import { GPXData, Track, TrackPoint, Waypoint } from '../types';

// Define extended interface for Point to include extensions
interface ExtendedPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
  extensions?: {
    speed?: number;
    hdop?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Simple function to extract value between XML tags
 * @param xml - XML string
 * @param tag - Tag name to extract
 * @returns The content between the tags or undefined
 */
const extractTagContent = (xml: string, tag: string): string | undefined => {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'is');
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
};

/**
 * Extract attribute value from an XML tag
 * @param xml - XML string
 * @param attr - Attribute name
 * @returns The attribute value or undefined
 */
const extractAttribute = (xml: string, attr: string): string | undefined => {
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : undefined;
};

/**
 * Extract all occurrences of a tag from XML
 * @param xml - XML string
 * @param tag - Tag name to extract
 * @returns Array of tag contents
 */
const extractAllTags = (xml: string, tag: string): string[] => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>|<${tag}[^>]*\/>`, 'g');
  const matches = xml.match(regex) || [];
  return matches;
};

/**
 * Parses a GPX file and returns structured data
 * @param gpxContent - The string content of a GPX file
 * @returns Parsed GPX data with tracks and waypoints
 */
export const parseGPXContent = (gpxContent: string): GPXData => {
  try {
    // Extract metadata
    const metadataXml = extractTagContent(gpxContent, 'metadata') || '';
    const metadata = {
      name: extractTagContent(metadataXml, 'name'),
      time: extractTagContent(metadataXml, 'time'),
    };
    
    // Extract waypoints
    const waypointTags = extractAllTags(gpxContent, 'wpt');
    const waypoints: Waypoint[] = waypointTags.map(wptXml => {
      const lat = parseFloat(extractAttribute(wptXml, 'lat') || '0');
      const lon = parseFloat(extractAttribute(wptXml, 'lon') || '0');
      
      return {
        latitude: lat,
        longitude: lon,
        name: extractTagContent(wptXml, 'name') || 'Unnamed Waypoint',
        description: extractTagContent(wptXml, 'desc'),
        time: extractTagContent(wptXml, 'time'),
        type: extractTagContent(wptXml, 'type'),
      };
    });
    
    // Extract tracks
    const trackTags = extractAllTags(gpxContent, 'trk');
    const tracks: Track[] = trackTags.map(trkXml => {
      const trackName = extractTagContent(trkXml, 'name') || 'Unnamed Track';
      const trackSegTags = extractAllTags(trkXml, 'trkseg');
      
      // Collect all points from all segments
      const points: TrackPoint[] = [];
      trackSegTags.forEach(segXml => {
        const pointTags = extractAllTags(segXml, 'trkpt');
        pointTags.forEach(ptXml => {
          const lat = parseFloat(extractAttribute(ptXml, 'lat') || '0');
          const lon = parseFloat(extractAttribute(ptXml, 'lon') || '0');
          const ele = extractTagContent(ptXml, 'ele');
          const time = extractTagContent(ptXml, 'time');
          
          points.push({
            latitude: lat,
            longitude: lon,
            elevation: ele ? parseFloat(ele) : undefined,
            time: time,
          });
        });
      });
      
      return {
        name: trackName,
        points
      };
    });
    
    return {
      tracks,
      waypoints,
      metadata
    };
  } catch (error) {
    console.error('Error parsing GPX content:', error);
    
    // Return empty data structure on error
    return {
      tracks: [],
      waypoints: [],
      metadata: {
        name: 'Error parsing GPX',
        time: new Date().toISOString(),
      }
    };
  }
};