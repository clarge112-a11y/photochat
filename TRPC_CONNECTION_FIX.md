# tRPC Connection Fix Guide

## Problem
The tRPC client is failing to connect to the backend with "Failed to fetch" errors.

## Root Causes
1. Backend server is not running on port 3003
2. ES module configuration issues in Node.js
3. Network connectivity issues between frontend and backend

## Solutions

### 1. Start the Backend Server

Use one of these scripts to start the backend:

```bash
# Option 1: Simple working script
node start-backend-working.js

# Option 2: Test startup script
node test-backend-startup-simple.js

# Option 3: Direct bun execution
bun run backend/hono.ts

# Option 4: Using tsx (if bun fails)
npx tsx backend/hono.ts
```

### 2. Verify Backend is Running

Check these endpoints in your browser:
- http://localhost:3003/ - Health check
- http://localhost:3003/api/trpc - tRPC endpoint
- http://localhost:3003/debug/routes - Available routes

### 3. Test tRPC Connection

From the app's debug screen or console:
```javascript
import { testTRPCConnection, checkBackendHealth } from '@/lib/trpc';

// Test backend health
const healthOk = await checkBackendHealth();
console.log('Backend health:', healthOk);

// Test tRPC connection
const trpcOk = await testTRPCConnection();
console.log('tRPC connection:', trpcOk);
```

### 4. Common Issues and Fixes

#### Issue: "require is not defined in ES module scope"
**Fix**: Use the CommonJS scripts (start-backend-working.js) instead of ES module scripts.

#### Issue: "Failed to fetch"
**Fix**: 
1. Ensure backend is running on port 3003
2. Check firewall/network settings
3. Verify the correct URL is being used

#### Issue: "HTML instead of JSON"
**Fix**: Backend routing issue - check that tRPC endpoints are properly mounted.

#### Issue: Backend exits immediately
**Fix**: Check for port conflicts or missing dependencies.

### 5. Environment Variables

Set these if needed:
```bash
export PORT=3003
export EXPO_PUBLIC_BACKEND_URL=http://localhost:3003
```

### 6. Development Workflow

1. Start backend: `node start-backend-working.js`
2. Wait for "Backend is running" message
3. Start frontend: `npm start`
4. Test connection from app debug screen

## Troubleshooting Commands

```bash
# Check if port 3003 is in use
lsof -i :3003

# Kill processes on port 3003
pkill -f "port.*3003"

# Test backend directly
curl http://localhost:3003/
curl http://localhost:3003/api/trpc

# Check bun version
bun --version

# Install tsx if needed
npm install -g tsx
```

## Files Created/Modified

- `start-backend-working.js` - Reliable backend startup script
- `test-backend-startup-simple.js` - Backend testing script
- `lib/trpc.ts` - Improved error handling and connection logic
- `TRPC_CONNECTION_FIX.md` - This troubleshooting guide