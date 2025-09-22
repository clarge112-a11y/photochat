#!/usr/bin/env node

// Direct backend runner using bun
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend directly with bun...');

const currentDir = process.cwd();
const backendPath = path.join(currentDir, 'backend', 'hono.ts');
console.log('Backend path:', backendPath);

const env = { 
  ...process.env, 
  PORT: '3003',
  NODE_ENV: 'development'
};

console.log('🌐 Starting backend server on port 3003...');

const backend = spawn('bun', ['run', backendPath], {
  stdio: 'inherit',
  env,
  cwd: currentDir,
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  console.error('Make sure bun is installed: curl -fsSL https://bun.sh/install | bash');
  process.exit(1);
});

backend.on('close', (code) => {
  console.log(`🛑 Backend process exited with code ${code}`);
  if (code !== 0) {
    console.error('❌ Backend exited with error code:', code);
    process.exit(code);
  }
});

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
console.log('📍 Backend should be available at: http://localhost:3003');
console.log('🔍 Health check: http://localhost:3003/health');
console.log('🔧 tRPC endpoint: http://localhost:3003/api/trpc');