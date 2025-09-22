#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

console.log('🚀 Starting Backend Server');
console.log('📁 Working directory:', process.cwd());

// Function to kill processes on specific ports
async function killPortProcesses(ports) {
  console.log('🧹 Cleaning up existing processes...');
  
  for (const port of ports) {
    try {
      // Kill processes using the port
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      console.log(`✅ Cleaned up port ${port}`);
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }
  
  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Function to check if port is available
async function isPortAvailable(port) {
  try {
    const { stdout } = await execAsync(`lsof -i:${port}`);
    return stdout.trim() === '';
  } catch (error) {
    // If lsof fails, assume port is available
    return true;
  }
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

// Function to set environment variable for frontend
function setFrontendEnv(port) {
  try {
    // Set environment variable for current process
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} for frontend`);
  } catch (error) {
    console.warn('⚠️ Could not set environment variable:', error.message);
  }
}

// Main function
async function main() {
  try {
    // Clean up existing processes
    await killPortProcesses([3001, 3002, 3003, 3004, 3005, 8080]);
    
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment for frontend
    setFrontendEnv(port);
    
    // Start backend server
    console.log(`🚀 Starting backend on port ${port}...`);
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log('📁 Backend path:', backendPath);
    
    // Check if backend file exists
    if (!fs.existsSync(backendPath)) {
      throw new Error(`Backend file not found: ${backendPath}`);
    }
    
    // Start the backend using tsx (TypeScript runner)
    const backendProcess = spawn('npx', ['tsx', backendPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });
    
    // Handle process events
    backendProcess.on('error', (error) => {
      console.error('🛑 Backend process error:', error);
      process.exit(1);
    });
    
    backendProcess.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      process.exit(code || 0);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend server...');
      backendProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend server...');
      backendProcess.kill('SIGTERM');
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Startup script failed:', error);
  process.exit(1);
});