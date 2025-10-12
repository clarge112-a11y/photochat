#!/bin/bash

# Clean Start Backend Script
# This script kills any existing backend process and starts fresh

echo "🚀 Starting PhotoChat Backend (Clean Start)..."
echo ""

# Kill any existing backend processes
echo "🔪 Killing any existing backend processes..."
pkill -f "bun.*hono" 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Verify port is free
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "❌ Port 3001 is still in use after cleanup!"
    echo "Please manually kill the process: lsof -ti:3001 | xargs kill -9"
    exit 1
fi

# Start the backend
echo "🚀 Starting backend on port 3001..."
echo ""
PORT=3001 bun backend/hono.ts
