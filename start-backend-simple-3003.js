#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting backend on port 3003...');

// Set environment variable for port
process.env.PORT = '3003';

const backend = spawn('bun', ['backend/hono.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd()
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('close', (code) => {
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