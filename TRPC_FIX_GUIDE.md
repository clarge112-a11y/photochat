# tRPC Connection Fix Guide

## Problem
The tRPC client is failing to connect to the backend with "Failed to fetch" errors.

## Root Cause
The backend server is not running or not accessible on port 3003.

## Solution

### Quick Fix
Run this command to start the backend and test the connection:
```bash
node fix-backend.js
```

This script will:
1. Check if the backend is already running
2. Start the backend if it's not running
3. Test the tRPC connection
4. Keep the backend running

### Manual Steps

1. **Start the backend manually:**
   ```bash
   # Option 1: Using the fixed startup script
   node start-backend-fixed.js
   
   # Option 2: Direct bun execution
   bun backend/hono.ts
   
   # Option 3: Using tsx (if bun is not available)
   npx tsx backend/hono.ts
   ```

2. **Test the connection:**
   ```bash
   # Test basic backend health
   curl http://localhost:3003/
   
   # Test tRPC health endpoint
   curl http://localhost:3003/api/trpc/health
   
   # Or use the test script
   node test-backend-connection.js
   ```

3. **Verify in your app:**
   - The app should now be able to connect to the backend
   - Check the browser console for tRPC connection logs
   - Look for "tRPC test successful" messages

## Troubleshooting

### If backend won't start:
- Make sure bun is installed: `curl -fsSL https://bun.sh/install | bash`
- Or install tsx: `npm install -g tsx`
- Check if port 3003 is already in use: `lsof -i :3003`

### If tRPC still fails:
- Check the browser console for detailed error messages
- Verify the backend URL in the tRPC client configuration
- Make sure the backend is accessible from your development environment

### Common Issues:
1. **Port conflicts**: Another service might be using port 3003
2. **Firewall**: Local firewall might be blocking the connection
3. **Network**: Development tunnel or proxy issues

## Backend URLs
- Health check: http://localhost:3003/
- tRPC endpoint: http://localhost:3003/api/trpc
- Debug routes: http://localhost:3003/debug/routes

## Files Modified
- `lib/trpc.ts` - Enhanced URL detection and error handling
- `backend/hono.ts` - Fixed auto-start logic
- `fix-backend.js` - Comprehensive backend startup and testing
- `start-backend-fixed.js` - Reliable backend startup script
- `test-backend-connection.js` - Connection testing utility