#!/bin/bash

echo "🔍 Checking for processes on port 3000..."
PORT_3000_PID=$(lsof -ti:3000)
if [ ! -z "$PORT_3000_PID" ]; then
    echo "🛑 Killing process on port 3000 (PID: $PORT_3000_PID)"
    kill -9 $PORT_3000_PID
    sleep 2
fi

echo "🔍 Checking for processes on port 3001..."
PORT_3001_PID=$(lsof -ti:3001)
if [ ! -z "$PORT_3001_PID" ]; then
    echo "🛑 Killing process on port 3001 (PID: $PORT_3001_PID)"
    kill -9 $PORT_3001_PID
    sleep 2
fi

echo "🚀 Starting backend on port 3001..."
export PORT=3001
bun backend/hono.ts