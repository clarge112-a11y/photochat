#!/usr/bin/env node

// Simple backend startup script with proper error handling
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Backend Server (Fixed)');
console.log('📁 Working directory:', process.cwd());

// Kill any existing backend processes
console.log('🧹 Cleaning up existing processes...');
try {
  require('child_process').execSync('pkill -f "bun.*backend/hono.ts" || true', { stdio: 'ignore' });
  require('child_process').execSync('pkill -f "node.*backend" || true', { stdio: 'ignore' });
  require('child_process').execSync('lsof -ti:3001 | xargs kill -9 || true', { stdio: 'ignore' });
  console.log('✅ Cleanup completed');
} catch (error) {
  console.log('ℹ️ No existing processes to clean up');
}

// Find available port
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  for (const port of ports) {
    if (await checkPort(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Update .env.local with the port
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}\nEXPO_PUBLIC_BACKEND_URL=http://localhost:${port}\n`;
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env.local with port ${port}`);
  } catch (error) {
    console.warn('⚠️ Could not update .env.local:', error.message);
  }
}

// Start the backend
async function startBackend() {
  try {
    const port = await findAvailablePort();
    console.log(`✅ Found available port: ${port}`);
    
    updateEnvFile(port);
    
    // Set environment variables
    process.env.PORT = port.toString();
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    process.env.EXPO_PUBLIC_BACKEND_URL = `http://localhost:${port}`;
    
    console.log(`🚀 Starting backend on port ${port}...`);
    
    // Check if backend file exists
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    if (!fs.existsSync(backendPath)) {
      throw new Error(`Backend file not found: ${backendPath}`);
    }
    
    console.log('📁 Backend path:', backendPath);
    
    // Start with bun (preferred) or node
    let command, args;
    
    try {
      // Try bun first
      require('child_process').execSync('which bun', { stdio: 'ignore' });
      command = 'bun';
      args = ['run', backendPath];
      console.log('🟢 Using Bun to start backend');
    } catch {
      // Fallback to tsx/node
      try {
        require('child_process').execSync('which tsx', { stdio: 'ignore' });
        command = 'npx';
        args = ['tsx', backendPath];
        console.log('🟡 Using tsx to start backend');
      } catch {
        command = 'node';
        args = ['-r', 'ts-node/register', backendPath];
        console.log('🔴 Using node with ts-node to start backend');
      }
    }
    
    const backend = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        EXPO_PUBLIC_BACKEND_PORT: port.toString(),
        EXPO_PUBLIC_BACKEND_URL: `http://localhost:${port}`,
      },
    });
    
    backend.on('error', (error) => {
      console.error('❌ Backend startup error:', error.message);
      process.exit(1);
    });
    
    backend.on('exit', (code, signal) => {
      if (signal) {
        console.log(`🛑 Backend stopped by signal: ${signal}`);
      } else {
        console.log(`🛑 Backend exited with code: ${code}`);
      }
      process.exit(code || 0);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, stopping backend...');
      backend.kill('SIGTERM');
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, stopping backend...');
      backend.kill('SIGTERM');
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

// Start the backend
startBackend().catch((error) => {
  console.error('❌ Startup failed:', error.message);
  process.exit(1);
});