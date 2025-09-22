#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing tRPC connection...');

// Read port from .env.local
function getBackendPort() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_BACKEND_PORT=(\d+)/);
    return match ? parseInt(match[1]) : 3001;
  } catch (error) {
    console.log('📝 No .env.local found, using default port 3001');
    return 3001;
  }
}

async function testTRPCHealth() {
  const port = getBackendPort();
  console.log(`📝 Using port: ${port}`);
  
  try {
    // Test the exact URL format that tRPC client uses
    const url = `http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D`;
    console.log('🔗 Testing URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-trpc-source': 'react-native'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ tRPC health check successful:', data);
        return true;
      } catch (parseError) {
        console.log('⚠️ Response is not valid JSON:', parseError.message);
        return false;
      }
    } else {
      console.log('❌ tRPC health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ tRPC health check error:', error.message);
    return false;
  }
}

async function testBasicHealth() {
  const port = getBackendPort();
  
  try {
    const url = `http://localhost:${port}/`;
    console.log('🔗 Testing basic health at:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Basic health check successful:', data.message);
      return true;
    } else {
      console.log('❌ Basic health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Basic health check error:', error.message);
    return false;
  }
}

async function testTRPCRouter() {
  const port = getBackendPort();
  
  try {
    const url = `http://localhost:${port}/test-trpc`;
    console.log('🔗 Testing tRPC router at:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC router test successful:');
      console.log('📋 Available procedures:', data.routerKeys);
      return true;
    } else {
      console.log('❌ tRPC router test failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ tRPC router test error:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n1️⃣ Testing basic backend health...');
  const basicHealth = await testBasicHealth();
  
  console.log('\n2️⃣ Testing tRPC router availability...');
  const routerHealth = await testTRPCRouter();
  
  console.log('\n3️⃣ Testing tRPC health procedure...');
  const trpcHealth = await testTRPCHealth();
  
  console.log('\n📊 Summary:');
  console.log(`   Basic Health: ${basicHealth ? '✅' : '❌'}`);
  console.log(`   tRPC Router: ${routerHealth ? '✅' : '❌'}`);
  console.log(`   tRPC Health: ${trpcHealth ? '✅' : '❌'}`);
  
  if (basicHealth && routerHealth && trpcHealth) {
    console.log('\n🎉 All tests passed! tRPC is working correctly.');
  } else if (basicHealth && routerHealth) {
    console.log('\n⚠️ Backend is running but tRPC health procedure is not working.');
    console.log('💡 This might be a path resolution issue in the tRPC client.');
  } else if (basicHealth) {
    console.log('\n⚠️ Backend is running but tRPC router is not accessible.');
    console.log('💡 Check the tRPC server configuration.');
  } else {
    console.log('\n❌ Backend is not running or not accessible.');
    console.log('💡 Start the backend with: node start-backend-working.js');
  }
}

main().catch(console.error);