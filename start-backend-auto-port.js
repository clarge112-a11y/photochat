#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

console.log('🚀 Finding available port for backend...');

// Function to check if a port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
};

// Function to find an available port starting from a given port
const findAvailablePort = async (startPort = 3003) => {
  for (let port = startPort; port <= startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
};

const startServer = async () => {
  try {
    const port = await findAvailablePort(3003);
    console.log(`✅ Found available port: ${port}`);
    
    console.log(`🌐 Starting backend server on port ${port}...`);
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    
    // Set environment variable for port
    const env = { ...process.env, PORT: port.toString() };
    
    const backend = spawn('bun', [backendPath], {
      stdio: 'inherit',
      env: env,
      cwd: process.cwd()
    });

    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });

    backend.on('close', (code) => {
      console.log(`🛑 Backend process exited with code ${code || 0}`);
      if (code && code !== 0) {
        process.exit(code);
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    console.log(`💡 Backend will be available at http://localhost:${port}`);
    console.log(`💡 Update your frontend to use port ${port} if needed`);
    
  } catch (error) {
    console.error('❌ Failed to find available port:', error.message);
    process.exit(1);
  }
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error.message || 'Unknown error');
  process.exit(1);
});