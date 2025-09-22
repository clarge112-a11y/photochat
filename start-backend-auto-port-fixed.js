import { spawn } from 'child_process';
import { createServer } from 'net';

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find available port starting from 3001
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= 3010; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found between 3001-3010');
}

async function startBackend() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    console.log(`✅ Found available port: ${port}`);
    
    console.log('🚀 Starting backend server...');
    
    // Set environment variables
    process.env.PORT = port.toString();
    process.env.NODE_ENV = 'development';
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    
    console.log(`📝 Setting EXPO_PUBLIC_BACKEND_PORT=${port} for frontend`);
    
    // Start the backend using bun (which handles TypeScript natively)
    const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        EXPO_PUBLIC_BACKEND_PORT: port.toString()
      }
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });
    
    backendProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`🛑 Backend process exited with code ${code}`);
        process.exit(code);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGINT');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error starting backend:', error.message);
    process.exit(1);
  }
}

startBackend();