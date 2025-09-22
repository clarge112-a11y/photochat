#!/bin/bash

# Start development environment with both backend and frontend

echo "🚀 Starting PhotoChat development environment..."

# Function to kill processes on a port (cross-platform)
kill_port() {
    local port=$1
    echo "🧹 Cleaning up processes on port $port..."
    
    # Try different methods to kill processes
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    elif command -v netstat >/dev/null 2>&1; then
        # Alternative for systems without lsof
        netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
    elif command -v ss >/dev/null 2>&1; then
        # Another alternative
        ss -tlnp | grep ":$port " | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | xargs kill -9 2>/dev/null || true
    else
        echo "⚠️  No port killing utility found (lsof, netstat, ss). Processes may need manual cleanup."
    fi
}

# Kill any existing processes on ports 3000 and 8081
kill_port 3000
kill_port 8081

# Check if required commands exist
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Start backend server in background
echo "🔧 Starting backend server on port 3000..."
node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend started successfully (PID: $BACKEND_PID)"

# Start frontend
echo "📱 Starting frontend on port 8081..."
if command -v bunx >/dev/null 2>&1; then
    bunx rork start -p ufiq1oc3j2kk7mqxsjcec --tunnel
elif command -v npx >/dev/null 2>&1; then
    npx rork start -p ufiq1oc3j2kk7mqxsjcec --tunnel
else
    echo "❌ Neither bunx nor npx found. Please install bun or ensure npm is available."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill_port 3000
    kill_port 8081
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for frontend to exit
wait