#!/usr/bin/env node

// Test script to check backend startup
const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Testing backend startup...');

const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
console.log(`📁 Backend path: ${backendPath}`);

// Test with bun
console.log('🤖 Testing with bun...');
const backend = spawn('bun', [backendPath], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3003' }
});

let output = '';
let errorOutput = '';

backend.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('📝 STDOUT:', text.trim());
});

backend.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.log('⚠️ STDERR:', text.trim());
});

backend.on('error', (error) => {
  console.error('❌ Backend spawn error:', error.message);
});

backend.on('close', (code) => {
  console.log(`🛑 Backend process exited with code ${code}`);
  console.log('📊 Output summary:');
  console.log('STDOUT length:', output.length);
  console.log('STDERR length:', errorOutput.length);
  
  if (output.includes('Development server running')) {
    console.log('✅ Backend started successfully!');
  } else {
    console.log('❌ Backend failed to start properly');
  }
  
  process.exit(code || 0);
});

// Kill after 10 seconds for testing
setTimeout(() => {
  console.log('⏰ Timeout reached, killing backend...');
  backend.kill('SIGTERM');
}, 10000);