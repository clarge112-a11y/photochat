#!/usr/bin/env node

// Simple backend starter using CommonJS
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server directly...');

const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
const env = { ...process.env, PORT: '3003' };

console.log('Backend path:', backendPath);
console.log('Environment PORT:', env.PORT);

// Start the backend directly with bun
const backend = spawn('bun', ['run', backendPath], {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('close', (code) => {
  console.log(`🛑 Backend process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGTERM');
});