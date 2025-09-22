#!/bin/bash

echo "🚀 Testing backend directly with bun..."
echo "📁 Current directory: $(pwd)"
echo "📁 Backend file: backend/hono.ts"

# Check if backend file exists
if [ ! -f "backend/hono.ts" ]; then
    echo "❌ Backend file not found!"
    exit 1
fi

echo "✅ Backend file exists"
echo "🔧 Starting backend with bun..."

# Set port and run
export PORT=3000
bun backend/hono.ts