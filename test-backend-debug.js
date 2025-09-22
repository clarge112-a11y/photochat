#!/usr/bin/env node

console.log('🧪 Testing backend startup...');

const { spawn } = require('child_process');

// Test with bun directly
console.log('🔧 Testing with bun...');
const backend = spawn('bun', ['backend/hono.ts'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: 3000 }
});

let output = '';
let errorOutput = '';

backend.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('📤 STDOUT:', text.trim());
});

backend.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.log('📥 STDERR:', text.trim());
});

backend.on('error', (error) => {
  console.error('❌ Process error:', error.message);
});

backend.on('exit', (code, signal) => {
  console.log(`🛑 Process exited with code ${code}, signal ${signal}`);
  console.log('📋 Full output:', output);
  console.log('📋 Full error output:', errorOutput);
  
  if (code !== 0) {
    console.log('❌ Backend failed to start');
    process.exit(1);
  } else {
    console.log('✅ Backend started successfully');
  }
});

// Kill after 10 seconds for testing
setTimeout(() => {
  console.log('⏰ Timeout reached, killing process...');
  backend.kill('SIGTERM');
}, 10000);