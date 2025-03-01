#!/bin/bash

# This script reorganizes the AbleNav project structure
# It moves files from the app directory to the root directory

# Create necessary directories
mkdir -p src/assets/images
mkdir -p src/assets/gpx
mkdir -p src/components
mkdir -p src/screens
mkdir -p src/types
mkdir -p src/utils

# Copy node_modules if it exists in the app directory
if [ -d "app/node_modules" ]; then
  echo "Copying node_modules from app directory..."
  cp -r app/node_modules .
fi

# Copy assets if they exist
if [ -d "app/assets" ]; then
  echo "Copying assets from app directory..."
  cp -r app/assets/* src/assets/
fi

# Copy source files if they exist
if [ -d "app/src" ]; then
  echo "Copying source files from app directory..."
  
  # Copy components
  if [ -d "app/src/components" ]; then
    cp -r app/src/components/* src/components/
  fi
  
  # Copy screens
  if [ -d "app/src/screens" ]; then
    cp -r app/src/screens/* src/screens/
  fi
  
  # Copy types
  if [ -d "app/src/types" ]; then
    cp -r app/src/types/* src/types/
  fi
  
  # Copy utils
  if [ -d "app/src/utils" ]; then
    cp -r app/src/utils/* src/utils/
  fi
  
  # Copy assets
  if [ -d "app/src/assets" ]; then
    cp -r app/src/assets/* src/assets/
  fi
fi

echo "Project reorganization complete!"
echo "You can now run 'npm install' and 'npm start' to run the app." 