import * as Speech from 'expo-speech';

/**
 * Options for speech synthesis
 */
export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

/**
 * Default speech options
 */
const defaultOptions: SpeechOptions = {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.9, // Slightly slower for better comprehension
  volume: 1.0,
};

/**
 * Speaks the provided text using text-to-speech
 * @param text The text to speak
 * @param options Speech options (optional)
 * @returns Promise that resolves when speech starts
 */
export const speak = async (text: string, options?: SpeechOptions): Promise<void> => {
  try {
    // Stop any ongoing speech before starting new one
    await stopSpeaking();
    
    // Merge default options with provided options
    const speechOptions = { ...defaultOptions, ...options };
    
    // Start speaking
    await Speech.speak(text, speechOptions);
    console.log('Speaking:', text);
  } catch (error) {
    console.error('Speech error:', error);
  }
};

/**
 * Stops any ongoing speech
 */
export const stopSpeaking = async (): Promise<void> => {
  try {
    await Speech.stop();
    console.log('Speech stopped');
  } catch (error) {
    console.error('Error stopping speech:', error);
  }
};

/**
 * Cancels all speech and clears the speech queue
 * This is more aggressive than stopSpeaking and should be used when
 * completely ending a navigation session
 */
export const cancelAllSpeech = async (): Promise<void> => {
  try {
    // First stop any current speech
    await Speech.stop();
    
    // Then try to cancel any queued speech
    // This is a more aggressive approach than just stopping
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    console.log('All speech cancelled');
  } catch (error) {
    console.error('Error cancelling all speech:', error);
  }
};

/**
 * Checks if the device is currently speaking
 * @returns Promise that resolves to a boolean indicating if speaking
 */
export const isSpeaking = async (): Promise<boolean> => {
  try {
    return await Speech.isSpeakingAsync();
  } catch (error) {
    console.error('Error checking speech status:', error);
    return false;
  }
};

/**
 * Speaks navigation instructions
 * @param instruction The navigation instruction to speak
 */
export const speakNavigationInstruction = async (instruction: string): Promise<void> => {
  // Use a slightly different voice configuration for navigation instructions
  const navigationOptions: SpeechOptions = {
    ...defaultOptions,
    pitch: 1.1, // Slightly higher pitch for emphasis
    rate: 0.85, // Slower rate for clarity
  };
  
  await speak(instruction, navigationOptions);
};

/**
 * Speaks accessibility information with a different voice configuration
 * @param text The accessibility information to speak
 */
export const speakAccessibilityInfo = async (text: string): Promise<void> => {
  // Use a different voice configuration for accessibility information
  const accessibilityOptions: SpeechOptions = {
    ...defaultOptions,
    pitch: 1.0,
    rate: 0.8, // Slower rate for better comprehension of accessibility details
    volume: 1.0,
  };
  
  await speak(text, accessibilityOptions);
};

/**
 * Generates and speaks a description for an accessibility feature
 * @param featureType The type of accessibility feature
 * @param name The name of the feature
 * @param description Additional description
 */
export const announceAccessibilityFeature = async (
  featureType: string,
  name: string,
  description?: string
): Promise<void> => {
  let announcement = '';
  
  // Generate appropriate announcement based on feature type
  if (featureType.includes('elevator')) {
    announcement = `Elevator nearby. ${name}.`;
  } else if (featureType.includes('ramp')) {
    announcement = `Accessible ramp nearby. ${name}.`;
  } else if (featureType.includes('restroom') || featureType.includes('bathroom')) {
    announcement = `Accessible restroom nearby. ${name}.`;
  } else if (featureType.includes('entrance') || featureType.includes('exit')) {
    announcement = `Accessible ${featureType} nearby. ${name}.`;
  } else if (featureType.includes('wheelchair')) {
    announcement = `Wheelchair accessible feature nearby. ${name}.`;
  } else {
    announcement = `Accessibility feature nearby. ${name}.`;
  }
  
  // Add description if available
  if (description) {
    announcement += ` ${description}`;
  }
  
  await speakAccessibilityInfo(announcement);
}; 