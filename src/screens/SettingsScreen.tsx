import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // Settings state
  const [voiceNavigation, setVoiceNavigation] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [vibrationFeedback, setVibrationFeedback] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);
  const [showAllAccessibility, setShowAllAccessibility] = useState(true);

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: () => {
            setVoiceNavigation(true);
            setHighContrast(false);
            setLargeText(false);
            setVibrationFeedback(true);
            setAutoZoom(true);
            setShowAllAccessibility(true);
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About AbleNav',
      'AbleNav v1.0.0\n\nAbleNav is an accessibility navigation app designed to help people with disabilities navigate public spaces with confidence.\n\nThis app was created as part of the Feb 2025 Student Hackathon themed "Build Things People Need: High-Value, High-Impact Solutions To Shape Communities."',
      [{ text: 'OK' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Help & Support',
      'For help and support, please contact us at support@ablenav.com or visit our website at www.ablenav.com.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Voice Navigation</Text>
              <Text style={styles.settingDescription}>Enable voice prompts for navigation</Text>
            </View>
            <Switch
              value={voiceNavigation}
              onValueChange={setVoiceNavigation}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>High Contrast</Text>
              <Text style={styles.settingDescription}>Increase contrast for better visibility</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Large Text</Text>
              <Text style={styles.settingDescription}>Increase text size throughout the app</Text>
            </View>
            <Switch
              value={largeText}
              onValueChange={setLargeText}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Vibration Feedback</Text>
              <Text style={styles.settingDescription}>Vibrate when approaching accessibility features</Text>
            </View>
            <Switch
              value={vibrationFeedback}
              onValueChange={setVibrationFeedback}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Map Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Auto-Zoom</Text>
              <Text style={styles.settingDescription}>Automatically zoom to show relevant features</Text>
            </View>
            <Switch
              value={autoZoom}
              onValueChange={setAutoZoom}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Show All Accessibility Features</Text>
              <Text style={styles.settingDescription}>Display all accessibility features on the map</Text>
            </View>
            <Switch
              value={showAllAccessibility}
              onValueChange={setShowAllAccessibility}
              trackColor={{ false: '#D1D1D6', true: '#4A80F0' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity 
            style={styles.buttonItem}
            onPress={handleAbout}
          >
            <Text style={styles.buttonText}>About AbleNav</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.buttonItem}
            onPress={handleHelp}
          >
            <Text style={styles.buttonText}>Help & Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonItem, styles.resetButton]}
            onPress={handleResetSettings}
          >
            <Text style={styles.resetButtonText}>Reset All Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  buttonText: {
    fontSize: 16,
    color: '#4A80F0',
    fontWeight: '600',
  },
  resetButton: {
    borderBottomWidth: 0,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

export default SettingsScreen; 