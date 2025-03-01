# AbleNav Project Structure

This document outlines the organization of the AbleNav project to help you understand where different components and files are located.

## Directory Structure

```
able_nav/
└── app/                      # Main application directory
    ├── App.tsx               # Main application entry point
    ├── app.json              # Expo configuration
    ├── package.json          # Dependencies and scripts
    ├── tsconfig.json         # TypeScript configuration
    ├── README.md             # Project documentation
    └── src/                  # Source code directory
        ├── assets/           # Static assets
        │   ├── gpx/          # GPX route files
        │   │   └── campus_main_accessible_routes.gpx
        │   └── images/       # App images (icons, splash, etc.)
        ├── components/       # Reusable UI components
        │   └── AccessibleMap.tsx
        ├── screens/          # Application screens
        │   └── HomeScreen.tsx
        ├── types/            # TypeScript type definitions
        │   └── index.ts
        └── utils/            # Utility functions
            ├── gpxParser.ts
            └── locationService.ts
```

## Key Files and Their Purpose

### App Configuration

- **App.tsx**: Main application component that sets up navigation
- **app.json**: Expo configuration including app name, version, and permissions

### Source Code

- **src/components/AccessibleMap.tsx**: Map component that displays routes and accessible features
- **src/screens/HomeScreen.tsx**: Main screen of the application
- **src/types/index.ts**: TypeScript type definitions for the application
- **src/utils/gpxParser.ts**: Utility for parsing GPX files
- **src/utils/locationService.ts**: Utilities for handling location services

### Assets

- **src/assets/gpx/**: Directory containing GPX files with accessible routes
- **src/assets/images/**: Directory containing app images, icons, and splash screens

## Development Workflow

1. Make changes to the source code in the `src` directory
2. Test the application using `npm start`
3. Add new GPX files to the `src/assets/gpx` directory
4. Update types in `src/types/index.ts` as needed

## Building and Deployment

- Use `expo build:android` or `expo build:ios` to create production builds
- Follow the Expo documentation for publishing to app stores 