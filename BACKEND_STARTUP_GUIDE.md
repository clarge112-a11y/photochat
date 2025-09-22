# Backend Startup Guide

## Quick Start Commands

### Option 1: Direct bun command (Recommended)
```bash
bun backend/hono.ts
```

### Option 2: Using the startup script
```bash
node start-backend.js
```

### Option 3: Using the simple startup script
```bash
node start-backend-simple.js
```

## Testing Backend

### Test if backend is running
```bash
curl http://localhost:3000/health
```

### Test tRPC endpoints
```bash
curl http://localhost:3000/api/trpc/health
```

### Debug routes
```bash
curl http://localhost:3000/debug/routes
```

## Common Issues and Solutions

### 1. "Cannot find module" errors
- Make sure all dependencies are installed: `bun install`
- Check that TypeScript files exist in the correct paths

### 2. Port already in use
- Kill existing processes: `lsof -ti:3000 | xargs kill -9`
- Or use a different port: `PORT=3001 bun backend/hono.ts`

### 3. tRPC connection issues
- Verify backend is running on correct port
- Check CORS settings in backend/hono.ts
- Ensure frontend is pointing to correct backend URL

### 4. Database connection issues
- Check Supabase credentials in backend/lib/supabase.ts
- Test database connection: `curl http://localhost:3000/api/trpc/testDatabase`

## Environment Variables

Set these before starting the backend:
```bash
export PORT=3000
```

## Logs and Debugging

The backend includes extensive logging. Watch for:
- ✅ "Backend ready" - Backend started successfully
- 📋 "tRPC procedures available" - Shows available API endpoints
- 🔥 Database policy errors - Check database policies

## Frontend Connection

Make sure your frontend (lib/trpc.ts) is configured to connect to:
- Local development: `http://localhost:3000/api/trpc`
- Tunnel/production: Update the base URL accordingly