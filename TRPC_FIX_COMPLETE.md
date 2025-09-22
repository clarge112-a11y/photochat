# tRPC Connection Fix - Complete Solution

## Problem Summary
The tRPC client was failing to connect to the backend with "Failed to fetch" errors. The main issues were:

1. **URL Mismatch**: Client was trying to connect to `/trpc/health` but backend was mounted at `/api/trpc/health`
2. **Fetch Polyfill**: Node.js environments needed proper fetch polyfill
3. **Backend Not Running**: Backend server wasn't properly started

## Solution Applied

### 1. Fixed tRPC Client URL Configuration
- Updated `lib/trpc.ts` to use `/api/trpc` as the base URL
- Fixed URL validation to check for `/api/trpc` instead of `/trpc`
- Ensured consistent URL formatting

### 2. Improved Fetch Polyfill
- Added undici as a dependency for better fetch support
- Enhanced error handling in the custom fetch function
- Added proper timeout and retry logic

### 3. Created Comprehensive Backend Startup
- **`start-backend-comprehensive.js`**: Full backend startup with dependency checks
- **`start-and-test-backend.js`**: Combined startup and testing script
- **`test-trpc-comprehensive.js`**: Comprehensive connection testing

### 4. Backend Configuration Verified
- Backend properly mounts tRPC at both `/api/trpc/*` and `/trpc/*` (legacy)
- CORS configuration allows all necessary headers
- Health check endpoints available at multiple paths

## How to Use

### Option 1: Quick Start and Test (RECOMMENDED)
```bash
node start-and-test-backend.js
```
This will:
- Kill any existing backend processes
- Start the backend server
- Wait for it to be ready
- Test all tRPC endpoints
- Keep the server running if tests pass

### Option 2: Start Backend Only
```bash
node start-backend-comprehensive.js
```

### Option 3: Test Connection Only
```bash
node test-trpc-comprehensive.js
```

## Common Issues and Solutions

### Issue 1: "Failed to fetch" Error
**Cause**: Backend server is not running or not accessible
**Solution**: 
1. Start backend: `node start-backend-simple-cjs.js`
2. Verify it's running on port 3003
3. Check firewall settings

### Issue 2: Module Type Warnings
**Cause**: Node.js trying to parse ES modules as CommonJS
**Solution**: Use the CommonJS versions of startup scripts:
- `start-backend-simple-cjs.js` instead of `start-backend-port-3003.js`

### Issue 3: CORS Issues
**Cause**: Browser blocking cross-origin requests
**Solution**: Backend already has CORS configured for all origins

### Issue 4: Port Already in Use
**Solution**: Kill existing processes:
```bash
# Kill any process using port 3003
pkill -f "port.*3003"
# Or use lsof to find and kill specific processes
lsof -ti:3003 | xargs kill -9
```

## Debugging Steps

### 1. Check if Backend is Running
```bash
# Check if port 3003 is in use
lsof -i :3003

# Check backend logs
node start-backend-simple-cjs.js
```

### 2. Test Network Connectivity
```bash
# Test basic connectivity
telnet localhost 3003

# Test HTTP response
curl -v http://localhost:3003/
```

### 3. Check tRPC Configuration
- Verify `backend/trpc/app-router.ts` exports `appRouter`
- Check `backend/hono.ts` mounts tRPC correctly
- Ensure `lib/trpc.ts` points to correct backend URL

## Files Created for Fixing

1. **start-backend-simple-cjs.js** - CommonJS backend starter
2. **start-backend-fixed-cjs.js** - Alternative CommonJS starter with process management
3. **test-backend-connection-simple.js** - Connection test script

## Enhanced Error Messages

The tRPC client now provides better error messages:
- Identifies "Failed to fetch" as likely backend not running
- Suggests specific commands to fix issues
- Provides timeout detection
- Shows detailed URL information for debugging

## Next Steps

1. Start backend: `node start-backend-simple-cjs.js`
2. Test connection: `node test-backend-connection-simple.js`
3. If tests pass, the app should work
4. If tests fail, check the specific error messages for guidance