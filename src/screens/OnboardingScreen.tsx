import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to AbleNav</Text>
        <Text style={styles.subtitle}>
          Navigate public spaces with confidence
        </Text>
      </View>
      
      <View style={styles.imageContainer}>
        {/* Placeholder for an illustration - you can replace with your own image */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Accessibility Navigation</Text>
        </View>
      </View>
      
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text>🧭</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Accessible Routes</Text>
            <Text style={styles.featureDescription}>
              Find wheelchair-friendly paths and entrances
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text>🔊</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Voice Navigation</Text>
            <Text style={styles.featureDescription}>
              Audio cues for visually impaired users
            </Text>
          </View>
        </View>
        
        <View style={styles.featureItem}>
          <View style={styles.featureIcon}>
            <Text>🏢</Text>
          </View>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>Building Plans</Text>
            <Text style={styles.featureDescription}>
              Detailed indoor accessibility information
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  imagePlaceholder: {
    width: 280,
    height: 200,
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#4A80F0',
    fontWeight: 'bold',
  },
  featuresContainer: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4A80F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen; 