#!/usr/bin/env node

import { spawn } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Simple Backend Startup');
console.log('📁 Working directory:', process.cwd());

// Function to check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 10; port++) {
    const available = await checkPort(port);
    if (available) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Kill existing processes on common ports
function killExistingProcesses() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  ports.forEach(port => {
    try {
      // Kill processes using lsof and kill
      spawn('sh', ['-c', `lsof -ti:${port} | xargs kill -9`], { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors - process might not exist
    }
  });
}

async function startBackend() {
  try {
    console.log('🧹 Cleaning up existing processes...');
    killExistingProcesses();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variables
    process.env.PORT = port.toString();
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    
    console.log(`🚀 Starting backend on port ${port}...`);
    console.log(`📝 Setting EXPO_PUBLIC_BACKEND_PORT=${port} for frontend`);
    
    // Start the backend using bun
    const backendPath = join(__dirname, 'backend', 'hono.ts');
    console.log('📁 Backend path:', backendPath);
    
    const backend = spawn('bun', ['run', backendPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });
    
    backend.on('error', (error) => {
      console.error('🛑 Backend process error:', error);
      process.exit(1);
    });
    
    backend.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      if (code !== 0) {
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
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

startBackend();