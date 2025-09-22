# Backend Connection Fix Guide

## Problem
The tRPC client is failing to connect to the backend with "Failed to fetch" errors, indicating the backend server is not running or not accessible.

## Root Cause
The backend startup scripts were failing due to:
1. Port conflicts (EADDRINUSE errors)
2. Incomplete process cleanup
3. Zombie processes holding ports
4. Incorrect Bun serve configuration

## Solution

### 1. Use the Ultimate Backend Startup Script

Run the new robust startup script:
```bash
node start-backend-ultimate.js
```

This script will:
- ✅ Aggressively kill all existing backend processes
- ✅ Find an available port automatically (3001-3011)
- ✅ Update `.env.local` with the correct port
- ✅ Start the backend with proper Bun configuration
- ✅ Test the connection automatically
- ✅ Handle graceful shutdown

### 2. Test the Backend Connection

After starting, test the connection:
```bash
node test-backend-ultimate.js
```

This will test:
- Basic HTTP connectivity
- tRPC endpoint functionality
- Port availability

### 3. Manual Troubleshooting

If the ultimate script fails, try these steps:

#### Step 1: Kill All Backend Processes
```bash
# Kill by port
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3003 | xargs kill -9 2>/dev/null || true

# Kill by process name
pkill -f "bun.*hono" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "start-backend" 2>/dev/null || true
```

#### Step 2: Check Port Availability
```bash
# Check which ports are in use
lsof -i :3001-3005

# Test port availability
nc -z localhost 3001 && echo "Port 3001 is in use" || echo "Port 3001 is free"
```

#### Step 3: Start Backend Manually
```bash
# Set environment and start with Bun
export PORT=3001
bun run backend/hono.ts
```

### 4. Frontend Configuration

The frontend automatically detects the backend port from `.env.local`. The ultimate startup script updates this file automatically.

If you need to manually set it:
```bash
echo "EXPO_PUBLIC_BACKEND_PORT=3001" > .env.local
```

### 5. Verification

Once the backend is running, you should see:
- ✅ Backend startup messages in console
- ✅ Available routes listed
- ✅ tRPC procedures listed
- ✅ Server running on `http://localhost:PORT`

Test endpoints:
- `http://localhost:PORT/` - Health check
- `http://localhost:PORT/api/trpc/health` - tRPC health
- `http://localhost:PORT/debug/routes` - Available routes

## Key Changes Made

### 1. Fixed Backend Configuration
- Simplified Bun serve configuration
- Removed conflicting auto-start logic
- Fixed export structure for Bun compatibility

### 2. Improved Process Management
- Aggressive process cleanup using multiple methods
- Better port detection and availability checking
- Proper signal handling for graceful shutdown

### 3. Enhanced Error Handling
- Comprehensive error messages
- Automatic retry logic
- Connection testing with timeouts

### 4. Better Environment Management
- Automatic `.env.local` updates
- Port detection and configuration
- Environment variable validation

## Common Issues and Solutions

### Issue: "EADDRINUSE" Error
**Solution**: The ultimate startup script handles this automatically by finding available ports and killing existing processes.

### Issue: "Failed to fetch" in Frontend
**Solution**: 
1. Ensure backend is running: `node test-backend-ultimate.js`
2. Check `.env.local` has correct port
3. Restart Expo dev server after backend starts

### Issue: tRPC Endpoints Not Found
**Solution**: 
1. Check `/debug/routes` endpoint
2. Verify tRPC router is properly mounted
3. Check console for tRPC initialization messages

### Issue: Zombie Processes
**Solution**: The ultimate startup script uses multiple kill methods:
- `lsof` + `kill -9`
- `fuser -k`
- `pkill` with pattern matching

## Files Created/Modified

1. **start-backend-ultimate.js** - Robust backend startup script
2. **test-backend-ultimate.js** - Comprehensive connection testing
3. **setup-backend.sh** - Script setup helper
4. **backend/hono.ts** - Fixed Bun serve configuration
5. **BACKEND_FIX_COMPLETE.md** - This troubleshooting guide

## Usage Instructions

1. **Start Backend**: `node start-backend-ultimate.js`
2. **Test Backend**: `node test-backend-ultimate.js`
3. **Setup Scripts**: `bash setup-backend.sh` (makes scripts executable)

The backend should now start reliably and the frontend tRPC client should connect successfully.