#!/bin/bash

echo "🧪 Testing backend startup..."

# Kill any existing processes on port 3002
echo "🔍 Checking for existing processes on port 3002..."
if command -v lsof >/dev/null 2>&1; then
    lsof -ti:3002 | xargs -r kill -9 2>/dev/null || true
    echo "✅ Cleaned up any existing processes"
else
    echo "⚠️  lsof not available, skipping cleanup"
fi

# Wait a moment
sleep 2

# Start backend in background
echo "🚀 Starting backend..."
PORT=3002 bun backend/hono.ts &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend health
echo "🏥 Testing backend health..."
if curl -s http://localhost:3002/ > /dev/null; then
    echo "✅ Backend is responding"
    
    # Test tRPC endpoint
    echo "🔧 Testing tRPC endpoint..."
    if curl -s http://localhost:3002/api/trpc/health > /dev/null; then
        echo "✅ tRPC endpoint is working"
    else
        echo "❌ tRPC endpoint failed"
    fi
else
    echo "❌ Backend is not responding"
fi

# Clean up
echo "🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null || true
sleep 2

echo "✅ Test complete"