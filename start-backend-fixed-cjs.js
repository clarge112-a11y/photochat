#!/usr/bin/env node

// CommonJS version to avoid module type issues
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend on port 3003...');

const killPort = (port) => {
  return new Promise((resolve) => {
    const kill = spawn('pkill', ['-f', `port.*${port}`], { stdio: 'ignore' });
    kill.on('close', () => {
      console.log(`✅ Cleared any existing processes on port ${port}`);
      resolve();
    });
    kill.on('error', () => {
      console.log(`✅ No existing processes found on port ${port}`);
      resolve();
    });
  });
};

const startServer = async () => {
  await killPort(3003);

  console.log('🌐 Starting backend server on port 3003...');

  const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');

  const env = { ...process.env, PORT: '3003' };

  const backend = spawn('bun', [backendPath], {
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
    if (code !== 0) {
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
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});