import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
// import { serve } from "@hono/node-server"; // Not needed for Bun
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// Create Hono app
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'trpc-accept', 'x-trpc-source', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: false,
  maxAge: 86400,
}));

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  console.log('Request headers:', Object.fromEntries(c.req.raw.headers.entries()));
  await next();
  const duration = Date.now() - start;
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`);
});

// Error handling middleware
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Request error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Mount tRPC router - Primary endpoint at /api/trpc
// IMPORTANT: Use /api/trpc/* to properly handle all tRPC routes
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path, type }) => {
      console.error('[tRPC Error]', { path, type, error: error.message });
      console.error('[tRPC Error stack]', error.stack);
      if (error.message.includes('infinite recursion')) {
        console.error('🔥 Database policy recursion detected.');
      }
    },
  })
);

// Legacy /trpc routes for backward compatibility
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path, type }) => {
      console.error('[tRPC Error - Legacy]', { path, type, error: error.message });
      console.error('[tRPC Error stack - Legacy]', error.stack);
      if (error.message.includes('infinite recursion')) {
        console.error('🔥 Database policy recursion detected.');
      }
    },
  })
);

// Health check endpoints
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Backend is running", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Aliases under /api for easier testing from the app's debug screen
app.get("/api", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Backend is running (alias)", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    message: "Backend is operational", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/api/health", (c) => {
  return c.json({ 
    status: "healthy", 
    message: "Backend is operational (alias)", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Audio processing endpoint
app.post("/processAudio", (c) => {
  return c.json({ success: true, message: 'Audio processed' });
});

// Debug endpoint to show all available routes
app.get("/debug/routes", (c) => {
  return c.json({
    message: "Available routes",
    routes: [
      "GET /",
      "GET /api",
      "GET /health", 
      "GET /api/health", 
      "POST /processAudio",
      "GET /debug/routes",
      "GET /api/debug/routes",
      "GET /test-trpc",
      "GET /api/test-trpc",
      "* /api/trpc/* (tRPC endpoints)",
      "* /api/trpc (tRPC base endpoint)",
      "* /trpc/* (tRPC endpoints, legacy)",
      "* /trpc (tRPC base endpoint, legacy)"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/debug/routes", (c) => {
  return c.json({
    message: "Available routes",
    routes: [
      "GET /",
      "GET /api",
      "GET /health", 
      "GET /api/health", 
      "POST /processAudio",
      "GET /debug/routes",
      "GET /api/debug/routes",
      "GET /test-trpc",
      "GET /api/test-trpc",
      "* /api/trpc/* (tRPC endpoints)",
      "* /api/trpc (tRPC base endpoint)",
      "* /trpc/* (tRPC endpoints, legacy)",
      "* /trpc (tRPC base endpoint, legacy)"
    ],
    timestamp: new Date().toISOString()
  });
});

// Test tRPC endpoint directly
app.get("/test-trpc", async (c) => {
  try {
    console.log('Testing tRPC router directly...');
    return c.json({
      message: "tRPC router is accessible",
      routerKeys: Object.keys(appRouter._def.procedures),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('tRPC router test failed:', error);
    return c.json({
      error: "tRPC router test failed",
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Alias for test-trpc under /api
app.get("/api/test-trpc", async (c) => {
  try {
    console.log('Testing tRPC router directly via /api...');
    return c.json({
      message: "tRPC router is accessible (/api)",
      routerKeys: Object.keys(appRouter._def.procedures),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('tRPC router test failed (/api):', error);
    return c.json({
      error: "tRPC router test failed (/api)",
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Catch-all route for debugging 404s (must be last)
app.all("*", (c) => {
  console.log(`404 - Route not found: ${c.req.method} ${c.req.url}`);
  console.log('Request headers:', Object.fromEntries(c.req.raw.headers.entries()));
  return c.json({
    error: "Route not found",
    method: c.req.method,
    path: c.req.url,
    url: c.req.url,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    message: "This route does not exist. Available routes: /, /health, /processAudio, /debug/routes, /test-trpc, /api/trpc/*, /api/trpc, /trpc/*, /trpc",
    timestamp: new Date().toISOString()
  }, 404);
});

console.log('🚀 Hono backend initialized');
console.log('Available routes:');
console.log('  GET  / - Health check');
console.log('  GET  /health - Health endpoint');
console.log('  POST /processAudio - Audio processing');
console.log('  GET  /debug/routes - Debug routes');
console.log('  GET  /test-trpc - Test tRPC router');
console.log('  *    /api/trpc/* - tRPC endpoints (primary)');
console.log('  *    /api/trpc - tRPC base endpoint (primary)');
console.log('  *    /trpc/* - tRPC endpoints (legacy)');
console.log('  *    /trpc - tRPC base endpoint (legacy)');
console.log('✅ Backend ready');
console.log('📋 tRPC procedures available:', Object.keys(appRouter._def.procedures));
console.log('🔍 Expected health endpoint: /api/trpc/health');
console.log('🔍 Expected ping endpoint: /api/trpc/ping');
console.log('🔍 tRPC router structure:', JSON.stringify(Object.keys(appRouter._def.procedures), null, 2));

// Export the Hono app for Bun serve
export { app };

// Default export for Bun serve
export default {
  port: Number(process.env.PORT || 3001),
  hostname: '0.0.0.0',
  fetch: app.fetch,
};