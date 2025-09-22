#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Backend and Running tRPC Test');

// Start backend
console.log('📡 Starting backend...');
const backend = spawn('node', ['start-backend-final-fixed.js'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Wait for backend to start, then run test
setTimeout(() => {
  console.log('\n🧪 Running comprehensive tRPC test...');
  const test = spawn('node', ['test-trpc-comprehensive.js'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  test.on('exit', (code) => {
    console.log(`\n📊 Test completed with exit code: ${code}`);
    
    // Kill backend
    console.log('🛑 Stopping backend...');
    backend.kill('SIGTERM');
    
    process.exit(code);
  });
}, 5000); // Wait 5 seconds for backend to start

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all processes...');
  backend.kill('SIGTERM');
  process.exit(0);
});

backend.on('error', (error) => {
  console.error('❌ Backend startup error:', error.message);
  process.exit(1);
});