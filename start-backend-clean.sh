#!/bin/bash

echo "🧹 Cleaning up existing backend processes..."

# Kill processes on common backend ports
for port in 3001 3002 3003 8080; do
    echo "Checking port $port..."
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
done

echo "🔍 Finding available port..."
for port in 3001 3002 3003 3004 3005; do
    if ! lsof -i:$port >/dev/null 2>&1; then
        echo "✅ Found available port: $port"
        export PORT=$port
        export EXPO_PUBLIC_BACKEND_PORT=$port
        break
    fi
done

if [ -z "$PORT" ]; then
    echo "❌ No available ports found"
    exit 1
fi

echo "🚀 Starting backend on port $PORT..."
echo "📝 Setting EXPO_PUBLIC_BACKEND_PORT=$PORT for frontend"

# Start the backend using bun
cd /home/user/rork-app
exec bun run backend/hono.ts --port $PORT