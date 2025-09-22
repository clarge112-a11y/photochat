# Backend Connection Troubleshooting Guide

## Quick Fix Summary

The main issues were:

1. **Backend supabase client incompatibility**: The backend was trying to use React Native's AsyncStorage
2. **Missing TypeScript runner**: The backend needs tsx to run TypeScript files
3. **Import path issues**: Backend files were importing from wrong paths

## What I Fixed

### 1. Created Backend-Specific Supabase Client
- **File**: `backend/lib/supabase.ts`
- **Issue**: Backend was trying to use React Native's AsyncStorage
- **Fix**: Created a Node.js compatible supabase client without AsyncStorage

### 2. Updated Import Paths
- **Files**: 
  - `backend/trpc/create-context.ts`
  - `backend/trpc/routes/chat/create/route.ts`
  - `backend/trpc/routes/call/route.ts`
- **Issue**: Wrong relative paths to supabase client
- **Fix**: Updated to use the new backend supabase client

### 3. Improved Server Scripts
- **Files**: 
  - `server.js` - Enhanced with better error handling
  - `start-dev.sh` - Made more robust and cross-platform
  - `start-backend.js` - Simple backend-only starter
  - `test-backend.js` - Backend testing script
  - `health-check.js` - Health check utility

## How to Start the Backend

### Option 1: Backend Only (Recommended for testing)
```bash
node start-backend.js
```

### Option 2: Full Development Environment
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 3: Manual Backend Start
```bash
npx tsx backend/hono.ts
```

## Testing the Backend

### 1. Health Check Script
```bash
node health-check.js
```

### 2. Manual Health Check
Visit these URLs in your browser:
- http://localhost:3000/ - Basic health check
- http://localhost:3000/health - Health endpoint
- http://localhost:3000/api/trpc/health - tRPC health check
- http://localhost:3000/debug/routes - Available routes

### 3. Backend Test Script
```bash
node test-backend.js
```

## Common Issues and Solutions

### Issue: "Failed to fetch"
**Cause**: Backend is not running or not accessible
**Solution**: 
1. Start backend with `node start-backend.js`
2. Check if port 3000 is available
3. Run health check: `node health-check.js`

### Issue: "Cannot find module"
**Cause**: Missing dependencies or wrong import paths
**Solution**:
1. Install tsx: `npm install -g tsx`
2. Check if all files exist in correct locations

### Issue: "HTML instead of JSON"
**Cause**: tRPC endpoint not found, getting app HTML instead
**Solution**:
1. Verify backend is running on correct port
2. Check tRPC routes are properly mounted
3. Test with: http://localhost:3000/api/trpc/health

### Issue: Database connection errors
**Cause**: Supabase client configuration issues
**Solution**:
1. Backend now uses separate supabase client
2. Check database policies if needed
3. Test with: http://localhost:3000/api/trpc/testDatabase

## File Structure After Fixes

```
backend/
├── lib/
│   └── supabase.ts          # Backend-specific supabase client
├── trpc/
│   ├── create-context.ts    # Updated imports
│   ├── app-router.ts        # Main router
│   └── routes/
│       ├── chat/create/route.ts  # Updated imports
│       └── call/route.ts         # Updated imports
└── hono.ts                  # Main backend server

# Helper scripts
├── start-backend.js         # Backend-only starter
├── start-dev.sh            # Full dev environment
├── test-backend.js         # Backend testing
├── health-check.js         # Health check utility
└── server.js               # Enhanced server script
```

## Next Steps

1. **Start the backend**: `node start-backend.js`
2. **Test health**: `node health-check.js`
3. **Start frontend**: Use your normal frontend start command
4. **Test tRPC**: The app should now connect successfully

## Debug Commands

```bash
# Test backend startup
node test-backend.js

# Check backend health
node health-check.js

# Start backend only
node start-backend.js

# Start full environment
./start-dev.sh

# Manual backend start
npx tsx backend/hono.ts
```

The backend should now start properly and the tRPC connection should work!