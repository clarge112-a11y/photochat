#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Use tsx to run the TypeScript backend directly
const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
const port = process.env.PORT || 3000;

console.log(`🚀 Starting TypeScript backend server on port ${port}...`);
console.log(`📁 Backend path: ${backendPath}`);

// Check if backend file exists
if (!fs.existsSync(backendPath)) {
  console.error(`❌ Backend file not found: ${backendPath}`);
  process.exit(1);
}

// Check if tsx is available, fallback to node with ts-node
let command, args;
try {
  // Try tsx first (faster)
  command = 'npx';
  args = ['tsx', backendPath];
} catch (error) {
  console.log('tsx not available, trying ts-node...');
  command = 'node';
  args = ['--loader', 'ts-node/esm', backendPath];
}

console.log(`🔧 Starting backend with: ${command} ${args.join(' ')}`);

// Start the backend
const backend = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
  shell: process.platform === 'win32'
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error);
  console.error('💡 Make sure tsx is installed: npm install -g tsx');
  process.exit(1);
});

backend.on('exit', (code) => {
  if (code !== 0) {
    console.log(`🛑 Backend process exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGTERM');
});