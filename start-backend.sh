#!/bin/bash

# Start Backend Script
# This script starts the Hono backend server on port 3001

echo "🚀 Starting PhotoChat Backend..."
echo ""

# Check if port 3001 is already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3001 is already in use!"
    echo ""
    echo "Options:"
    echo "1. Kill the existing process: pkill -f 'bun.*hono'"
    echo "2. Use a different port: PORT=3002 bun backend/hono.ts"
    echo ""
    read -p "Kill existing process and restart? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔪 Killing existing backend process..."
        pkill -f "bun.*hono"
        sleep 2
    else
        echo "❌ Exiting..."
        exit 1
    fi
fi

# Start the backend
echo "🚀 Starting backend on port 3001..."
echo ""
PORT=3001 bun backend/hono.ts
