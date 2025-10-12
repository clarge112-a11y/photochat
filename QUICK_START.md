# Quick Start Guide

## Start the Backend

Choose one of these methods:

### Method 1: Using the shell script (Recommended)
```bash
chmod +x start-backend.sh
./start-backend.sh
```

### Method 2: Using Bun directly
```bash
PORT=3001 bun backend/hono.ts
```

### Method 3: Using the existing script
```bash
node start-backend-working.js
```

## Start the App

In a **new terminal window**:

```bash
npm start
```

## Verify Everything Works

### 1. Check Backend
Open http://localhost:3001 in your browser. You should see:
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

### 2. Test tRPC
```bash
node test-trpc-connection-simple.js
```

Should show all green checkmarks ✅

### 3. Test the App
- Open the app in your browser or mobile device
- Try signing in or signing up
- View chats
- Send messages

## Common Issues

### Backend won't start - Port already in use
```bash
# Kill existing backend
pkill -f "bun.*hono"

# Or use a different port
PORT=3002 bun backend/hono.ts
```

### tRPC connection fails
1. Make sure backend is running: `curl http://localhost:3001/`
2. Check .env.local has correct EXPO_PUBLIC_BACKEND_URL
3. Restart both backend and app

### Supabase errors
1. Check .env.local has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
2. Verify Supabase project is not paused at https://supabase.com/dashboard
3. Clear app cache: `rm -rf .expo` and restart

## What Was Fixed

✅ Supabase API key error - Fixed by removing custom fetch wrapper
✅ tRPC 404 errors - Fixed by updating route mounting to use wildcards
✅ Network request failures - Backend now properly handles all tRPC requests

See FIXES_SUMMARY.md for detailed technical information.
