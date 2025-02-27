# AbleNav - Accessible Indoor Navigation

AbleNav is a mobile application designed to help people with mobility challenges navigate indoor spaces like schools, airports, and convention centers. It provides accessible routes, highlights accessibility features, and offers AR navigation.

## Features

- **Outdoor Navigation**: Uses Google Maps to navigate to building entrances
- **Indoor Mapping**: Displays floor plans with accessibility features
- **AR Navigation**: Provides augmented reality guidance to destinations
- **Accessibility Features**: Shows ramps, elevators, restrooms, and more
- **Custom Routes**: Suggests accessible routes based on user needs

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- iOS or Android device/emulator

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/able-nav.git
cd able-nav
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Scan the QR code with the Expo Go app on your device or press 'i' to open in iOS simulator / 'a' for Android emulator

## Using the App

### Outdoor Navigation

1. Allow location permissions when prompted
2. The app will show your current location and nearby accessibility features
3. Tap on a feature to see details and get directions
4. Tap "Show Accessible Routes" to see predefined accessible routes

### Indoor Navigation

1. When near a building with indoor maps, a building marker (🏢) will appear
2. Tap on the building marker and then tap "Enter Building"
3. The app will display the floor plan with accessibility features
4. Use the floor selector at the top to switch between floors
5. Tap on features to see details and get directions

### AR Navigation

1. Select a destination (either outdoors or indoors)
2. Tap the "AR Navigation" button
3. Allow camera permissions when prompted
4. Hold your phone up to see AR guidance to your destination
5. Follow the blue path displayed in AR to reach your destination

## Adding Floor Plans

To add your own floor plans to the app:

1. Prepare your floor plan images (PNG or JPG format)
2. In the app, go to Settings > Manage Floor Plans
3. Tap "Add New Building"
4. Enter building details and upload floor plan images
5. Mark accessibility features on the floor plan
6. Create accessible routes between features
7. Save the building

## Development

### Project Structure

- `src/components`: Reusable UI components
- `src/screens`: Main app screens
- `src/services`: API and data services
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions
- `src/navigation`: Navigation configuration
- `src/assets`: Static assets like images

### Key Technologies

- React Native
- Expo
- TypeScript
- React Navigation
- React Native Maps
- Expo Camera (for AR)
- React Native Reanimated
- React Native Gesture Handler

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This app was created as part of the Feb 2025 Student Hackathon themed "Build Things People Need: High-Value, High-Impact Solutions To Shape Communities."
- Special thanks to all contributors and testers who helped make this app accessible and useful. 