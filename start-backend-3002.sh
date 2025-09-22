#!/bin/bash

echo "🚀 Starting backend on port 3002..."

# Kill any existing processes on port 3002
if command -v lsof >/dev/null 2>&1; then
    echo "🔍 Checking for existing processes on port 3002..."
    EXISTING_PID=$(lsof -ti:3002)
    if [ ! -z "$EXISTING_PID" ]; then
        echo "🛑 Killing existing process on port 3002 (PID: $EXISTING_PID)"
        kill -9 $EXISTING_PID
        sleep 2
    else
        echo "✅ Port 3002 is available"
    fi
else
    echo "⚠️  lsof not available, skipping port check"
fi

# Set port and start backend
export PORT=3002
echo "🌐 Starting backend server on port $PORT..."

# Use bun to run the TypeScript file directly
bun backend/hono.ts