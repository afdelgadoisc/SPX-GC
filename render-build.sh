#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Starting Build Process ==="
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

npm install
npm install -g pm2

# Create necessary directories
echo "Creating DATAROOT and LOG directories..."
mkdir -p DATAROOT
mkdir -p LOG

# Verify ASSETS directory
echo "Checking ASSETS directory..."
if [ -d "ASSETS" ]; then
    echo "ASSETS directory exists. Contents:"
    ls -la ASSETS/
    if [ -d "ASSETS/templates" ]; then
        echo "Templates directory exists. Contents:"
        ls -la ASSETS/templates/
    else
        echo "Creating templates directory..."
        mkdir -p ASSETS/templates
    fi
else
    echo "Creating ASSETS directory structure..."
    mkdir -p ASSETS/templates
fi

# Set proper permissions
chmod -R 755 DATAROOT
chmod -R 755 LOG
chmod -R 755 ASSETS

echo "=== Build Process Complete ==="
echo "Final directory structure:"
ls -la
echo "ASSETS directory structure:"
ls -la ASSETS/ 