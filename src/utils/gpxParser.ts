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
 * Extract extensions from XML
 * @param xml - XML string
 * @returns Object with extension values
 */
const extractExtensions = (xml: string): Record<string, any> => {
  const extensions: Record<string, any> = {};
  
  // Extract the extensions tag content
  const extensionsXml = extractTagContent(xml, 'extensions');
  if (!extensionsXml) return extensions;
  
  // Extract speed if available (OsmAnd specific)
  const speedXml = extractTagContent(extensionsXml, 'osmand:speed');
  if (speedXml) {
    extensions.speed = parseFloat(speedXml);
  }
  
  // Extract other extension tags
  const extensionTags = extensionsXml.match(/<[^>]+>[^<]*<\/[^>]+>/g) || [];
  extensionTags.forEach(tag => {
    const tagName = tag.match(/<([^:>]+:[^>]+)>/)?.[1];
    const tagValue = tag.match(/>([^<]+)</)?.[1];
    
    if (tagName && tagValue) {
      extensions[tagName.replace('osmand:', '')] = tagValue;
    }
  });
  
  return extensions;
};

/**
 * Parses a GPX file and returns structured data
 * @param gpxContent - The string content of a GPX file
 * @returns Parsed GPX data with tracks and waypoints
 */
export const parseGPXContent = (gpxContent: string): GPXData => {
  try {
    console.log('Parsing GPX content...');
    
    // Extract metadata
    const metadataXml = extractTagContent(gpxContent, 'metadata') || '';
    const metadata = {
      name: extractTagContent(metadataXml, 'name') || extractTagContent(metadataXml, 'n'),
      time: extractTagContent(metadataXml, 'time'),
    };
    
    console.log('Metadata:', metadata);
    
    // Extract waypoints
    const waypointTags = extractAllTags(gpxContent, 'wpt');
    console.log(`Found ${waypointTags.length} waypoints`);
    
    const waypoints: Waypoint[] = waypointTags.map(wptXml => {
      const lat = parseFloat(extractAttribute(wptXml, 'lat') || '0');
      const lon = parseFloat(extractAttribute(wptXml, 'lon') || '0');
      
      // Get name from either <name> or <n> tag (some GPX files use abbreviated tags)
      const name = extractTagContent(wptXml, 'name') || extractTagContent(wptXml, 'n') || 'Unnamed Waypoint';
      
      return {
        latitude: lat,
        longitude: lon,
        name: name,
        description: extractTagContent(wptXml, 'desc'),
        time: extractTagContent(wptXml, 'time'),
        type: extractTagContent(wptXml, 'type'),
      };
    });
    
    // Extract tracks
    const trackTags = extractAllTags(gpxContent, 'trk');
    console.log(`Found ${trackTags.length} tracks`);
    
    const tracks: Track[] = trackTags.map(trkXml => {
      // Get name from either <name> or <n> tag
      const trackName = extractTagContent(trkXml, 'name') || extractTagContent(trkXml, 'n') || 'Unnamed Track';
      const trackSegTags = extractAllTags(trkXml, 'trkseg');
      
      // Collect all points from all segments
      const points: TrackPoint[] = [];
      trackSegTags.forEach(segXml => {
        const pointTags = extractAllTags(segXml, 'trkpt');
        console.log(`Found ${pointTags.length} track points in segment`);
        
        pointTags.forEach(ptXml => {
          const lat = parseFloat(extractAttribute(ptXml, 'lat') || '0');
          const lon = parseFloat(extractAttribute(ptXml, 'lon') || '0');
          const ele = extractTagContent(ptXml, 'ele');
          const time = extractTagContent(ptXml, 'time');
          const hdop = extractTagContent(ptXml, 'hdop');
          
          // Extract extensions
          const extensions = extractExtensions(ptXml);
          
          points.push({
            latitude: lat,
            longitude: lon,
            elevation: ele ? parseFloat(ele) : undefined,
            time: time,
            speed: extensions.speed,
            hdop: hdop ? parseFloat(hdop) : undefined,
          });
        });
      });
      
      return {
        name: trackName,
        points
      };
    });
    
    const result = {
      tracks,
      waypoints,
      metadata
    };
    
    console.log(`Parsed ${result.tracks.length} tracks and ${result.waypoints.length} waypoints`);
    return result;
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