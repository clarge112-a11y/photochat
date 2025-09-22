import { serve } from '@hono/node-server';
import app from './backend/hono.ts';

const port = Number(process.env.PORT || 3001);

console.log(`🚀 Starting backend server on port ${port}...`);
console.log(`📁 Working directory: ${process.cwd()}`);

try {
  const server = serve({
    fetch: app.fetch,
    port: port,
  });
  
  console.log(`✅ Backend server running at http://localhost:${port}`);
  console.log('💡 Press Ctrl+C to stop the server');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend server...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down backend server...');
    process.exit(0);
  });
  
} catch (error) {
  console.error(`❌ Failed to start server on port ${port}:`, error);
  process.exit(1);
}