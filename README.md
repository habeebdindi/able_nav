# AbleNav

AbleNav is an augmented reality navigation app for individuals with disabilities, designed to provide accessible routes and navigation assistance.

## Features

- Display accessible routes on a map
- Show waypoints with different types (elevators, ramps, restrooms, entrances)
- Track user location
- Provide navigation assistance

## Project Structure

The project follows a clean architecture with the following structure:

```
able_nav/
├── app.config.js        # Expo configuration
├── babel.config.js      # Babel configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── src/
│   ├── assets/          # Static assets (images, GPX files)
│   ├── components/      # Reusable UI components
│   ├── screens/         # Application screens
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo Go app on your mobile device

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
./start.sh
```

Or use the clean option to reinstall dependencies:

```bash
./start.sh --clean
```

4. Scan the QR code with the Expo Go app on your mobile device

## Development

### GPX Data

The application uses GPX (GPS Exchange Format) data to display routes and waypoints. The GPX data is currently hardcoded in the `HomeScreen.tsx` file, but it can be extended to load from external files.

### Map Component

The `AccessibleMap` component is responsible for displaying the map, routes, and waypoints. It uses `react-native-maps` to render the map and supports different types of waypoints with different colors.

### Location Service

The `locationService.ts` file provides functions for getting the user's location and calculating distances between points.

## Troubleshooting

If you encounter any issues, try the following:

1. Clear the Metro bundler cache:

```bash
npx expo start --clear
```

2. Reinstall dependencies:

```bash
rm -rf node_modules
npm install
```

3. Make sure you have the required Babel plugins:

```bash
npm install --save-dev @babel/plugin-transform-export-namespace-from
```

## License

This project is licensed under the MIT License.