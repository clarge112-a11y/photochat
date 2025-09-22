#!/usr/bin/env node

// Simple tRPC connection test with proper fetch polyfill
const fetch = require('node-fetch');
global.fetch = fetch;

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing tRPC Connection (Fixed)');

// Read environment variables
const envPath = path.join(process.cwd(), '.env.local');
let backendPort = '3001';
let backendUrl = 'http://localhost:3001';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const portMatch = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
  const urlMatch = envContent.match(/EXPO_PUBLIC_BACKEND_URL=(.+)/);
  
  if (portMatch) {
    backendPort = portMatch[1];
  }
  if (urlMatch) {
    backendUrl = urlMatch[1].trim();
  }
  
  console.log(`📝 Found backend port in .env.local: ${backendPort}`);
  console.log(`📝 Found backend URL in .env.local: ${backendUrl}`);
} else {
  console.log('⚠️ No .env.local file found, using defaults');
}

async function testConnection() {
  try {
    console.log('\n🔗 Testing Basic Health:');
    console.log(`   URL: ${backendUrl}/`);
    
    const healthResponse = await fetch(`${backendUrl}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Basic Health - SUCCESS');
      console.log('   Response:', healthData);
    } else {
      console.log(`   ❌ Basic Health - FAILED (${healthResponse.status})`);
      return false;
    }
    
    console.log('\n🔗 Testing tRPC Health (Legacy):');
    const trpcUrl = `${backendUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`;
    console.log(`   URL: ${trpcUrl}`);
    
    const trpcResponse = await fetch(trpcUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    if (trpcResponse.ok) {
      const trpcData = await trpcResponse.json();
      console.log('   ✅ tRPC Health (Legacy) - SUCCESS');
      console.log('   Response:', trpcData);
      return true;
    } else {
      console.log(`   ❌ tRPC Health (Legacy) - FAILED (${trpcResponse.status})`);
      const errorText = await trpcResponse.text();
      console.log('   Error:', errorText.substring(0, 200));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Backend server is not running');
      console.error('🔧 Start backend: node start-backend-working.js');
    } else if (error.message.includes('fetch is not a function')) {
      console.error('💡 Fetch polyfill issue - this should be fixed now');
    }
    
    return false;
  }
}

async function main() {
  const success = await testConnection();
  
  if (success) {
    console.log('\n🎉 All tests passed! tRPC connection is working.');
    console.log('💡 You can now use the app - the backend should be working.');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed. Check backend configuration.');
    console.log('🔧 Try:');
    console.log('   1. Start backend: node start-backend-working.js');
    console.log('   2. Wait a few seconds for startup');
    console.log('   3. Run this test again: node test-trpc-simple-fixed.js');
    process.exit(1);
  }
}

main();