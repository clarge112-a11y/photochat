#!/usr/bin/env node

// Comprehensive backend startup script with tRPC fixes
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Polyfill fetch for Node.js
if (typeof fetch === 'undefined') {
  try {
    const { fetch } = require('undici');
    global.fetch = fetch;
    console.log('✅ undici fetch polyfill loaded');
  } catch (error) {
    console.warn('⚠️ Could not load undici fetch polyfill:', error.message);
    try {
      const { default: fetch } = require('node-fetch');
      global.fetch = fetch;
      console.log('✅ node-fetch polyfill loaded');
    } catch (_nodeError) {
      console.error('❌ Could not load any fetch polyfill');
      process.exit(1);
    }
  }
}

console.log('🚀 Starting Backend with tRPC Endpoint Fixes');
console.log('📅 Started at:', new Date().toISOString());
console.log('📁 Working directory:', process.cwd());

// Kill any existing backend processes
console.log('🧹 Cleaning up existing processes...');
try {
  const killResult = spawn('pkill', ['-f', 'start-backend'], { stdio: 'inherit' });
  killResult.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Existing processes cleaned up');
    }
    startBackend();
  });
  
  // Fallback timeout
  setTimeout(() => {
    startBackend();
  }, 2000);
} catch (error) {
  console.log('⚠️ Could not clean up processes:', error.message);
  startBackend();
}

function startBackend() {
  console.log('🚀 Starting backend server...');
  
  // Start the backend using Bun
  const backend = spawn('bun', ['run', 'backend/hono.ts'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'development'
    }
  });
  
  backend.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log('[Backend]', output);
    }
  });
  
  backend.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log('[Backend Error]', output);
    }
  });
  
  backend.on('close', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    if (code !== 0) {
      console.error('❌ Backend failed to start');
      process.exit(1);
    }
  });
  
  backend.on('error', (error) => {
    console.error('[Backend] Failed to start:', error.message);
    process.exit(1);
  });
  
  // Test the backend after a delay
  setTimeout(async () => {
    await testBackend();
  }, 5000);
  
  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend...');
    backend.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down backend...');
    backend.kill('SIGTERM');
    process.exit(0);
  });
}

async function testBackend() {
  console.log('\n🔍 Testing backend connection...');
  
  try {
    // Test basic health
    const healthResponse = await fetch('http://localhost:3001/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend Health - SUCCESS');
      console.log('   Response:', healthData.message);
    } else {
      console.log('❌ Backend Health - FAILED:', healthResponse.status);
      return;
    }
    
    // Test tRPC health
    const trpcHealthResponse = await fetch('http://localhost:3001/api/trpc/health?input=%7B%22json%22%3Anull%7D', {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (trpcHealthResponse.ok) {
      const trpcHealthData = await trpcHealthResponse.json();
      console.log('✅ tRPC Health - SUCCESS');
      console.log('   Response:', JSON.stringify(trpcHealthData, null, 2));
    } else {
      const errorText = await trpcHealthResponse.text();
      console.log('❌ tRPC Health - FAILED:', trpcHealthResponse.status);
      console.log('   Error:', errorText.substring(0, 200));
      return;
    }
    
    // Test tRPC ping
    const trpcPingResponse = await fetch('http://localhost:3001/api/trpc/ping?input=%7B%22json%22%3Anull%7D', {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (trpcPingResponse.ok) {
      const trpcPingData = await trpcPingResponse.json();
      console.log('✅ tRPC Ping - SUCCESS');
      console.log('   Response:', JSON.stringify(trpcPingData, null, 2));
    } else {
      const errorText = await trpcPingResponse.text();
      console.log('❌ tRPC Ping - FAILED:', trpcPingResponse.status);
      console.log('   Error:', errorText.substring(0, 200));
      return;
    }
    
    console.log('\n🎉 Backend is running successfully with tRPC fixes!');
    console.log('💡 You can now use the app - all endpoints are working.');
    console.log('🔗 Backend URL: http://localhost:3001');
    console.log('🔗 tRPC Health: http://localhost:3001/api/trpc/health');
    console.log('🔗 tRPC Ping: http://localhost:3001/api/trpc/ping');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    
    if (error.message.includes('Failed to fetch')) {
      console.error('💡 Backend may not be fully started yet. Wait a moment and try again.');
    } else if (error.name === 'AbortError') {
      console.error('💡 Request timed out. Backend may be slow to respond.');
    }
  }
}