import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Location from 'expo-location';

type HomeScreenProps = {
  // We'll use hooks instead of props
};

const HomeScreen: React.FC<HomeScreenProps> = () => {
  // Use the navigation hook from React Navigation 7
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      try {
        setIsLoading(true);
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      } catch (error) {
        setErrorMsg('Could not get your location');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleNavigateToMap = () => {
    if (location) {
      navigation.navigate('Map', {
        initialLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      });
    } else {
      Alert.alert(
        'Location Not Available',
        'We need your location to show accessible routes. Please enable location services and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello!</Text>
          <Text style={styles.tagline}>Let's find accessible routes for you</Text>
        </View>
        
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Your Location</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4A80F0" />
          ) : errorMsg ? (
            <View>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => navigation.replace('Home')}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : location ? (
            <View>
              <Text style={styles.locationText}>
                Lat: {location.coords.latitude.toFixed(6)}, Long: {location.coords.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={handleNavigateToMap}
              >
                <Text style={styles.mapButtonText}>View Accessibility Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.locationText}>Determining your location...</Text>
          )}
        </View>
        
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            >
              <View style={styles.quickAccessIcon}>
                <Text style={styles.iconText}>🦽</Text>
              </View>
              <Text style={styles.quickAccessText}>Wheelchair Routes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            >
              <View style={styles.quickAccessIcon}>
                <Text style={styles.iconText}>🔍</Text>
              </View>
              <Text style={styles.quickAccessText}>Find Facilities</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            >
              <View style={styles.quickAccessIcon}>
                <Text style={styles.iconText}>🏫</Text>
              </View>
              <Text style={styles.quickAccessText}>Campus Map</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.quickAccessIcon}>
                <Text style={styles.iconText}>⚙️</Text>
              </View>
              <Text style={styles.quickAccessText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About AbleNav</Text>
          <Text style={styles.infoText}>
            AbleNav helps people with disabilities navigate public spaces with confidence.
            Our app provides detailed accessibility information for buildings and outdoor spaces.
          </Text>
          <TouchableOpacity 
            style={styles.learnMoreButton}
            onPress={() => Alert.alert('About AbleNav', 'AbleNav is a hackathon project for the Feb 2025 Student Hackathon themed "Build Things People Need: High-Value, High-Impact Solutions To Shape Communities."')}
          >
            <Text style={styles.learnMoreButtonText}>Learn More</Text>
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
  header: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tagline: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginBottom: 16,
  },
  mapButton: {
    backgroundColor: '#4A80F0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAccessSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAccessItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 24,
  },
  quickAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 32,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  learnMoreButton: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  learnMoreButtonText: {
    color: '#4A80F0',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen; 