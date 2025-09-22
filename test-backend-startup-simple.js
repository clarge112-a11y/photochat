#!/usr/bin/env node

// Test script to check backend startup
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing backend startup...');

const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
console.log(`📁 Backend path: ${backendPath}`);

// Test if bun is available
console.log('🔍 Checking if bun is available...');
const bunCheck = spawn('bun', ['--version'], { stdio: 'pipe' });

bunCheck.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Bun is available');
    startWithBun();
  } else {
    console.log('❌ Bun not available, trying tsx...');
    startWithTsx();
  }
});

bunCheck.on('error', () => {
  console.log('❌ Bun not available, trying tsx...');
  startWithTsx();
});

function startWithBun() {
  console.log('🚀 Starting backend with bun...');
  const backend = spawn('bun', ['run', backendPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3003' }
  });

  backend.on('error', (error) => {
    console.error('❌ Bun failed:', error.message);
    startWithTsx();
  });

  setupProcessHandlers(backend);
}

function startWithTsx() {
  console.log('🚀 Starting backend with tsx...');
  const backend = spawn('npx', ['tsx', backendPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3003' }
  });

  backend.on('error', (error) => {
    console.error('❌ tsx failed:', error.message);
    console.error('💡 Please install tsx: npm install -g tsx');
    process.exit(1);
  });

  setupProcessHandlers(backend);
}

function setupProcessHandlers(backend) {
  backend.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`🛑 Backend process exited with code ${code}`);
    }
  });

  // Handle cleanup
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

  console.log('✅ Backend startup test running...');
  console.log('💡 Press Ctrl+C to stop');
  console.log('🌐 Server should be available at http://localhost:3003');
  console.log('🔍 Test endpoints:');
  console.log('  - Health: http://localhost:3003/');
  console.log('  - tRPC: http://localhost:3003/api/trpc');
  console.log('  - Debug: http://localhost:3003/debug/routes');
}