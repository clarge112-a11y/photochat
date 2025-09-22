#!/usr/bin/env node

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
    console.log('✅ Using node-fetch polyfill');
  } catch (error) {
    console.error('❌ Could not import node-fetch. Please install: npm install node-fetch');
    process.exit(1);
  }
}

console.log('🔍 Testing tRPC Connection (Fixed)');
console.log('📝 Backend URL: http://localhost:3001');
console.log('🔗 tRPC URL: http://localhost:3001/trpc');

async function testConnection() {
  const baseUrl = 'http://localhost:3001';
  let allPassed = true;
  
  // Test 1: Basic backend health
  console.log('\n🔗 Test 1: Basic Backend Health');
  try {
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Backend Health - SUCCESS');
      console.log('   Status:', response.status);
      console.log('   Message:', data.message);
    } else {
      console.log('   ❌ Backend Health - FAILED');
      console.log('   Status:', response.status, response.statusText);
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Backend Health - ERROR:', error.message);
    allPassed = false;
  }
  
  // Test 2: Legacy tRPC health endpoint
  console.log('\n🔗 Test 2: Legacy tRPC Health (/trpc/health)');
  try {
    const trpcUrl = `${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`;
    const response = await fetch(trpcUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Legacy tRPC Health - SUCCESS');
      console.log('   Status:', response.status);
      if (data.result && data.result.data && data.result.data.json) {
        console.log('   Message:', data.result.data.json.message);
      } else {
        console.log('   Data:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('   ❌ Legacy tRPC Health - FAILED');
      console.log('   Status:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Error:', errorText.substring(0, 200));
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Legacy tRPC Health - ERROR:', error.message);
    allPassed = false;
  }
  
  // Test 3: Legacy tRPC ping endpoint
  console.log('\n🔗 Test 3: Legacy tRPC Ping (/trpc/ping)');
  try {
    const trpcUrl = `${baseUrl}/trpc/ping?input=%7B%22json%22%3Anull%7D`;
    const response = await fetch(trpcUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Legacy tRPC Ping - SUCCESS');
      console.log('   Status:', response.status);
      if (data.result && data.result.data && data.result.data.json) {
        console.log('   Message:', data.result.data.json.message);
      } else {
        console.log('   Data:', JSON.stringify(data, null, 2));
      }
    } else {
      console.log('   ❌ Legacy tRPC Ping - FAILED');
      console.log('   Status:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Error:', errorText.substring(0, 200));
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Legacy tRPC Ping - ERROR:', error.message);
    allPassed = false;
  }
  
  return allPassed;
}

// Main execution
async function main() {
  // Check if backend is running first
  try {
    const response = await fetch('http://localhost:3001/', { method: 'HEAD' });
    if (!response.ok) {
      console.log('❌ Backend is not responding on port 3001');
      console.log('💡 Start the backend: node start-backend-working.js');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Backend is not running on port 3001');
    console.log('💡 Start the backend: node start-backend-working.js');
    process.exit(1);
  }
  
  console.log('✅ Backend is running on port 3001');
  
  const success = await testConnection();
  
  if (success) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('💡 tRPC is working correctly with legacy endpoints.');
    console.log('💡 Your React Native app should now be able to connect.');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('💡 Check the backend configuration and restart if needed.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});