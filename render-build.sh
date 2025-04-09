#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npm install -g pm2

# Create necessary directories
mkdir -p DATAROOT
mkdir -p LOG

# Set proper permissions
chmod -R 755 DATAROOT
chmod -R 755 LOG 