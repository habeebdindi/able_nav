import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { NavigationRoute, RouteStep } from '../types';
import { formatTravelTime } from '../utils/navigationService';
import { speakNavigationInstruction, stopSpeaking } from '../utils/speechService';

interface NavigationPanelProps {
  route: NavigationRoute;
  currentStepIndex: number;
  onClose: () => void;
  isAccessibleRoute?: boolean;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  route,
  currentStepIndex,
  onClose,
  isAccessibleRoute = false
}) => {
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState<boolean>(true);
  const [lastSpokenStepIndex, setLastSpokenStepIndex] = useState<number>(-1);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  const currentStep = route.steps[currentStepIndex];
  const nextStep = currentStepIndex < route.steps.length - 1 ? route.steps[currentStepIndex + 1] : null;
  
  // Speak the current step instruction when it changes
  useEffect(() => {
    if (voiceGuidanceEnabled && currentStepIndex !== lastSpokenStepIndex) {
      speakCurrentInstruction();
      setLastSpokenStepIndex(currentStepIndex);
    }
  }, [currentStepIndex, voiceGuidanceEnabled]);
  
  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);
  
  // Speak the current instruction
  const speakCurrentInstruction = () => {
    if (currentStep) {
      setIsSpeaking(true);
      speakNavigationInstruction(currentStep.instruction)
        .then(() => {
          // Add a small delay to account for speech duration
          setTimeout(() => setIsSpeaking(false), 500);
        })
        .catch(() => setIsSpeaking(false));
    }
  };
  
  // Toggle voice guidance
  const toggleVoiceGuidance = () => {
    const newState = !voiceGuidanceEnabled;
    setVoiceGuidanceEnabled(newState);
    
    if (!newState) {
      // Stop any ongoing speech if turning off
      stopSpeaking();
    } else {
      // Speak current instruction if turning on
      speakCurrentInstruction();
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Navigation</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {route.totalDistance < 1000 
            ? `${Math.round(route.totalDistance)}m` 
            : `${(route.totalDistance / 1000).toFixed(1)}km`}
        </Text>
        <Text style={styles.summaryText}>
          {formatTravelTime(route.estimatedTimeSeconds)}
        </Text>
      </View>
      
      {isAccessibleRoute && (
        <View style={styles.accessibleRouteInfo}>
          <Text style={styles.accessibleRouteText}>
            ♿ Following accessible route, elevators, and accessible facilities
          </Text>
        </View>
      )}
      
      <View style={styles.voiceGuidanceContainer}>
        <View style={styles.voiceGuidanceInfo}>
          <Text style={styles.voiceGuidanceText}>Voice Guidance</Text>
          {isSpeaking && (
            <View style={styles.speakingIndicator}>
              <Text style={styles.speakingIndicatorText}>Speaking...</Text>
            </View>
          )}
        </View>
        <Switch
          value={voiceGuidanceEnabled}
          onValueChange={toggleVoiceGuidance}
          trackColor={{ false: '#d1d1d1', true: '#a8c7fa' }}
          thumbColor={voiceGuidanceEnabled ? '#1a73e8' : '#f4f3f4'}
        />
      </View>
      
      <View style={styles.currentStep}>
        <Text style={styles.currentStepText}>{currentStep.instruction}</Text>
        <TouchableOpacity 
          style={[
            styles.speakButton,
            isSpeaking && styles.speakButtonActive
          ]}
          onPress={speakCurrentInstruction}
          disabled={isSpeaking}
        >
          <Text style={styles.speakButtonText}>🔊</Text>
        </TouchableOpacity>
      </View>
      
      {nextStep && (
        <View style={styles.nextStep}>
          <Text style={styles.nextStepLabel}>Next:</Text>
          <Text style={styles.nextStepText}>{nextStep.instruction}</Text>
        </View>
      )}
      
      <ScrollView style={styles.allSteps}>
        <Text style={styles.allStepsLabel}>All Steps:</Text>
        {route.steps.map((step, index) => (
          <View 
            key={`step-${index}`} 
            style={[
              styles.stepItem,
              index === currentStepIndex && styles.currentStepItem
            ]}
          >
            <Text style={[
              styles.stepNumber,
              index === currentStepIndex && styles.currentStepNumber
            ]}>
              {index + 1}
            </Text>
            <Text style={[
              styles.stepText,
              index === currentStepIndex && styles.currentStepItemText
            ]}>
              {step.instruction}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#757575',
    lineHeight: 24,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  voiceGuidanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  voiceGuidanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceGuidanceText: {
    fontSize: 14,
    color: '#333',
  },
  speakingIndicator: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  speakingIndicatorText: {
    fontSize: 12,
    color: '#1a73e8',
  },
  currentStep: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#1a73e8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStepText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  speakButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  speakButtonActive: {
    backgroundColor: '#a8c7fa',
  },
  speakButtonText: {
    fontSize: 18,
    color: 'white',
  },
  nextStep: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  nextStepLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 14,
    color: '#333',
  },
  allSteps: {
    maxHeight: 200,
    padding: 16,
  },
  allStepsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentStepItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 8,
    fontSize: 12,
    color: '#333',
  },
  currentStepNumber: {
    backgroundColor: '#1a73e8',
    color: 'white',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  currentStepItemText: {
    fontWeight: '600',
  },
  accessibleRouteInfo: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  accessibleRouteText: {
    fontSize: 14,
    color: '#2e7d32',
    textAlign: 'center',
  },
});

export default NavigationPanel; 