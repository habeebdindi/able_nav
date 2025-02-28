import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens from barrel file
import { HomeScreen, MapScreen, SettingsScreen, OnboardingScreen } from '../screens';
import FloorPlanMapperScreen from '../screens/FloorPlanMapperScreen';

// Define the type for our stack navigator
export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Map: { initialLocation?: { latitude: number; longitude: number } };
  Settings: undefined;
  FloorPlanMapper: { buildingId: string, floorId: string }; // Add the new screen
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4A80F0',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'AbleNav' }}
        />
        <Stack.Screen 
          name="Map" 
          component={MapScreen} 
          options={{ title: 'Accessibility Map' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="FloorPlanMapper"
          component={FloorPlanMapperScreen}
          options={{ title: 'Floor Plan Mapper' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;