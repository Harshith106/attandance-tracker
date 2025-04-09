#!/bin/bash
set -e

# Start Xvfb with larger screen and more memory
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset > /dev/null 2>&1 &
export DISPLAY=:99

# Wait for Xvfb to start
sleep 2

# Verify Xvfb is running
echo "Checking if Xvfb is running..."
ps aux | grep Xvfb

# Set higher ulimits for browser stability
ulimit -n 65535 || echo "Failed to set file descriptor limit"

# Start the application with increased timeout
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 600 "app:app"
