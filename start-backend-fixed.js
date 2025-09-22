#!/usr/bin/env node

// Backend restart script with tRPC fixes
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Backend with tRPC Fixes');
console.log('📁 Working directory:', process.cwd());

// Kill any existing backend processes
console.log('🧹 Killing existing backend processes...');
try {
  spawn('pkill', ['-f', 'backend'], { stdio: 'inherit' });
  spawn('pkill', ['-f', 'hono'], { stdio: 'inherit' });
  spawn('pkill', ['-f', '3001'], { stdio: 'inherit' });
} catch (error) {
  // Ignore errors - processes might not exist
}

// Wait a moment for processes to die
setTimeout(() => {
  console.log('🚀 Starting fresh backend...');
  
  // Set environment variables
  process.env.PORT = '3001';
  process.env.EXPO_PUBLIC_BACKEND_PORT = '3001';
  process.env.EXPO_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  
  // Update .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update or add backend configuration
  const lines = envContent.split('\n');
  const updatedLines = [];
  let foundPort = false;
  let foundUrl = false;
  
  for (const line of lines) {
    if (line.startsWith('EXPO_PUBLIC_BACKEND_PORT=')) {
      updatedLines.push('EXPO_PUBLIC_BACKEND_PORT=3001');
      foundPort = true;
    } else if (line.startsWith('EXPO_PUBLIC_BACKEND_URL=')) {
      updatedLines.push('EXPO_PUBLIC_BACKEND_URL=http://localhost:3001');
      foundUrl = true;
    } else if (line.trim()) {
      updatedLines.push(line);
    }
  }
  
  if (!foundPort) {
    updatedLines.push('EXPO_PUBLIC_BACKEND_PORT=3001');
  }
  if (!foundUrl) {
    updatedLines.push('EXPO_PUBLIC_BACKEND_URL=http://localhost:3001');
  }
  
  fs.writeFileSync(envPath, updatedLines.join('\n') + '\n');
  console.log('📝 Updated .env.local with backend configuration');
  
  // Start the backend
  const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
  console.log('📁 Backend path:', backendPath);
  
  if (!fs.existsSync(backendPath)) {
    console.error('❌ Backend file not found:', backendPath);
    process.exit(1);
  }
  
  console.log('🚀 Starting backend with Bun...');
  const backend = spawn('bun', ['run', backendPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3001',
      EXPO_PUBLIC_BACKEND_PORT: '3001',
      EXPO_PUBLIC_BACKEND_URL: 'http://localhost:3001'
    }
  });
  
  backend.on('error', (error) => {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  });
  
  backend.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
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
  
  console.log('✅ Backend started successfully');
  console.log('💡 Press Ctrl+C to stop the server');
  console.log('🔗 Backend URL: http://localhost:3001');
  console.log('🔗 tRPC URL: http://localhost:3001/api/trpc');
  console.log('🧪 Test with: node test-trpc-fix-final.js');
  
}, 2000);