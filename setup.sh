#!/bin/bash

# Exit on error
set -e

echo "Setting up R2 File Explorer development environment..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install worker dependencies
echo "Installing worker dependencies..."
cd worker
npm install
cd ..

echo "Setup complete! You can now run 'npm run dev' to start the development environment."