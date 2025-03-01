#!/bin/bash

# Clear node_modules and reinstall dependencies if needed
if [ "$1" == "--clean" ]; then
  echo "Cleaning node_modules and reinstalling dependencies..."
  rm -rf node_modules
  npm install --legacy-peer-deps
fi

# Install the required Babel plugin if it's not already installed
if ! npm list @babel/plugin-transform-export-namespace-from --depth=0 | grep -q "@babel/plugin-transform-export-namespace-from"; then
  echo "Installing required Babel plugin..."
  npm install --save-dev @babel/plugin-transform-export-namespace-from
fi

# Clear Metro bundler cache and start the app
echo "Starting AbleNav with clean cache..."
npx expo start --clear 