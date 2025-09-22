#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('🚀 Starting Backend Server');
console.log('📁 Working directory:', process.cwd());

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Function to update .env.local
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}
EXPO_PUBLIC_BACKEND_URL=http://localhost:${port}
`;
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Updated .env.local with port ${port} and URL http://localhost:${port}`);
}

async function startBackend() {
  try {
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Update environment file
    updateEnvFile(port);
    
    // Start the backend
    console.log(`🚀 Starting backend on port ${port}...`);
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log(`📁 Backend path: ${backendPath}`);
    
    // Use bun to run the backend
    const backend = spawn('bun', ['run', '--hot', backendPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });

    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    backend.on('close', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
      }
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Backend startup failed:', error.message);
    process.exit(1);
  }
}

startBackend();

