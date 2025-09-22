#!/usr/bin/env node

const { spawn } = require('child_process');
const fetch = require('node-fetch');

console.log('🚀 Testing tRPC Fix');
console.log('📅 Started at:', new Date().toISOString());

// Start backend
console.log('🚀 Starting backend...');
const backend = spawn('bun', ['run', 'backend/hono.ts'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3001' }
});

let backendReady = false;

backend.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[Backend]', output.trim());
  if (output.includes('Started development server')) {
    backendReady = true;
  }
});

backend.stderr.on('data', (data) => {
  console.error('[Backend Error]', data.toString().trim());
});

// Wait for backend to be ready
const waitForBackend = async () => {
  for (let i = 0; i < 30; i++) {
    if (backendReady) {
      console.log('✅ Backend is ready');
      return true;
    }
    console.log(`⏳ Waiting for backend... (${i + 1}/30)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('❌ Backend failed to start');
  return false;
};

const testTRPC = async () => {
  try {
    console.log('🔍 Testing tRPC health endpoint...');
    
    // Test the health endpoint
    const healthUrl = 'http://localhost:3001/api/trpc/health?input=%7B%22json%22%3Anull%7D';
    console.log('🔗 Testing URL:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC Health Test - SUCCESS');
      console.log('📋 Response data:', JSON.stringify(data, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ tRPC Health Test - FAILED');
      console.log('📋 Error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ tRPC test error:', error.message);
    return false;
  }
};

const main = async () => {
  const isReady = await waitForBackend();
  if (!isReady) {
    process.exit(1);
  }
  
  // Wait a bit more for full initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const success = await testTRPC();
  
  // Clean up
  backend.kill();
  
  if (success) {
    console.log('🎉 tRPC fix successful!');
    process.exit(0);
  } else {
    console.log('❌ tRPC fix failed');
    process.exit(1);
  }
};

main().catch(error => {
  console.error('Script error:', error);
  backend.kill();
  process.exit(1);
});
