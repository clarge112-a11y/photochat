# Backend Startup Guide

## Quick Start

1. **Start the backend:**
   ```bash
   node start-backend.js
   ```

2. **Test the backend:**
   ```bash
   node test-backend.js
   ```

## What the scripts do

### `start-backend.js`
- Automatically finds an available port (3001-3011)
- Kills any existing processes on common ports
- Sets `EXPO_PUBLIC_BACKEND_PORT` in `.env.local`
- Starts the backend using Bun with TypeScript support
- Handles graceful shutdown with Ctrl+C

### `test-backend.js`
- Tests multiple ports to find a working backend
- Tests both HTTP endpoints and tRPC endpoints
- Provides clear feedback on what's working

## Troubleshooting

### "Port already in use" errors
The startup script automatically handles this by:
1. Killing existing processes on ports 3001-3005, 8080
2. Finding the next available port
3. Starting the backend on that port

### "Failed to fetch" errors in the app
1. Make sure the backend is running: `node start-backend.js`
2. Test the connection: `node test-backend.js`
3. Check that `.env.local` has the correct `EXPO_PUBLIC_BACKEND_PORT`

### Backend won't start
1. Make sure you have Bun installed: `curl -fsSL https://bun.sh/install | bash`
2. Check that `backend/hono.ts` exists
3. Try running directly: `bun backend/hono.ts`

## Manual startup (if scripts fail)

```bash
# Set the port
export PORT=3001
export AUTO_START_SERVER=true

# Start with Bun
bun backend/hono.ts
```

## Environment Variables

- `PORT`: Backend port (default: 3001)
- `AUTO_START_SERVER`: Set to 'true' to auto-start server
- `EXPO_PUBLIC_BACKEND_PORT`: Frontend uses this to connect to backend

## Available Endpoints

Once running, the backend provides:
- `GET /` - Health check
- `GET /health` - Health endpoint  
- `GET /debug/routes` - List all routes
- `GET /test-trpc` - Test tRPC router
- `POST /api/trpc/*` - tRPC endpoints (main)
- `POST /trpc/*` - tRPC endpoints (legacy)