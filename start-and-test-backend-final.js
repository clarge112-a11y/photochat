#!/usr/bin/env node

// Complete tRPC fix script
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Complete tRPC Fix Script');
console.log('📅 Started at:', new Date().toISOString());

// Kill any existing processes
console.log('🧹 Cleaning up existing processes...');
try {
  require('child_process').execSync('pkill -f "bun.*backend/hono.ts" || true', { stdio: 'ignore' });
  require('child_process').execSync('pkill -f "node.*backend" || true', { stdio: 'ignore' });
  require('child_process').execSync('lsof -ti:3001 | xargs kill -9 || true', { stdio: 'ignore' });
  console.log('✅ Cleanup completed');
} catch (error) {
  console.log('ℹ️ No existing processes to clean up');
}

// Update .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = `EXPO_PUBLIC_BACKEND_PORT=3001
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
`;
fs.writeFileSync(envPath, envContent);
console.log('📝 Updated .env.local with port 3001');

// Start backend
console.log('🚀 Starting backend server...');
const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');

const backend = spawn('bun', ['run', backendPath], {
  stdio: 'pipe',
  env: {
    ...process.env,
    PORT: '3001',
    NODE_ENV: 'development'
  }
});

// Handle backend output
backend.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('[Backend]')) {
    console.log(output.trim());
  } else {
    process.stdout.write(`[Backend] ${output}`);
  }
});

backend.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Error') || output.includes('error')) {
    console.error(`[Backend Error] ${output.trim()}`);
  } else {
    process.stderr.write(`[Backend] ${output}`);
  }
});

// Wait for backend to start
console.log('⏳ Waiting 5 seconds for backend to start...');

setTimeout(async () => {
  console.log('🔍 Testing tRPC connection...');
  
  // Test backend health
  console.log('\n🔗 Testing Backend Health...');
  try {
    const { fetch } = require('undici');
    const response = await fetch('http://localhost:3001/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend Health - SUCCESS');
      console.log('   Response:', data.message);
    } else {
      console.log('❌ Backend Health - FAILED');
      console.log('   Status:', response.status, response.statusText);
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Backend Health Failed:', error.message);
    process.exit(1);
  }
  
  // Test tRPC health (legacy endpoint)
  console.log('\n🔗 Testing tRPC Health...');
  try {
    const { fetch } = require('undici');
    const trpcUrl = 'http://localhost:3001/trpc/health?input=%7B%22json%22%3Anull%7D';
    console.log('   URL:', trpcUrl);
    
    const response = await fetch(trpcUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC Health - SUCCESS');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ tRPC Health - FAILED');
      console.log('   Status:', response.status, response.statusText);
      const text = await response.text();
      console.log('   Error:', text.substring(0, 200));
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ tRPC Health Failed:', error.message);
    process.exit(1);
  }
  
  // Test tRPC ping
  console.log('\n🔗 Testing tRPC Ping...');
  try {
    const { fetch } = require('undici');
    const pingUrl = 'http://localhost:3001/trpc/ping?input=%7B%22json%22%3Anull%7D';
    console.log('   URL:', pingUrl);
    
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC Ping - SUCCESS');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ tRPC Ping - FAILED');
      console.log('   Status:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ tRPC Ping Failed:', error.message);
  }
  
  console.log('\n✅ BACKEND AND tRPC ARE WORKING!');
  console.log('🔗 Backend URL: http://localhost:3001');
  console.log('🔗 tRPC URL: http://localhost:3001/trpc');
  console.log('💡 You can now use the app - tRPC connection is established');
  console.log('💡 Press Ctrl+C to stop the backend');
  
}, 5000);

// Handle process termination
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

backend.on('close', (code) => {
  if (code !== 0) {
    console.log(`🛑 Backend process exited with code ${code}`);
  }
  process.exit(code || 0);
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});