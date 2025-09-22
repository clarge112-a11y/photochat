#!/usr/bin/env node

// Import fetch for Node.js
let fetch;
try {
  // Try to use built-in fetch (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    throw new Error('No built-in fetch');
  }
} catch (_error) {
  // Fallback to node-fetch
  try {
    fetch = require('node-fetch');
  } catch (_importError) {
    console.error('❌ Could not import fetch. Please install node-fetch: npm install node-fetch');
    process.exit(1);
  }
}

console.log('🔍 Testing tRPC Connection (Fixed)');

const testBackendConnection = async () => {
  const baseUrl = 'http://localhost:3001';
  let allPassed = true;
  
  console.log('\n🔗 Testing Basic Health:');
  try {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();
    console.log('✅ Basic Health:', response.status, data.message || data.status);
  } catch (error) {
    console.log('❌ Basic Health Failed:', error.message);
    allPassed = false;
  }
  
  console.log('\n🔗 Testing tRPC Health (Legacy - Working):');
  try {
    const response = await fetch(`${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`);
    const data = await response.json();
    if (response.ok && data.result) {
      console.log('✅ Legacy tRPC Health:', response.status, data.result.data.json.message);
    } else {
      console.log('❌ Legacy tRPC Health Failed:', response.status, data);
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ Legacy tRPC Health Failed:', error.message);
    allPassed = false;
  }
  
  console.log('\n🔗 Testing tRPC Ping (Legacy):');
  try {
    const response = await fetch(`${baseUrl}/trpc/ping?input=%7B%22json%22%3Anull%7D`);
    const data = await response.json();
    if (response.ok && data.result) {
      console.log('✅ tRPC Ping (Legacy):', response.status, data.result.data.json.message);
    } else {
      console.log('❌ tRPC Ping (Legacy) Failed:', response.status, data);
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ tRPC Ping (Legacy) Failed:', error.message);
    allPassed = false;
  }
  
  return allPassed;
};

const main = async () => {
  // Check if backend is running first
  try {
    const response = await fetch('http://localhost:3001/');
    if (!response.ok) {
      console.log('❌ Backend is not responding properly on port 3001');
      console.log('💡 Start the backend first: node start-backend-working.js');
      process.exit(1);
    }
  } catch (_error) {
    console.log('❌ Backend is not running on port 3001');
    console.log('💡 Start the backend first: node start-backend-working.js');
    process.exit(1);
  }
  
  const allPassed = await testBackendConnection();
  
  if (allPassed) {
    console.log('\n🎉 All tRPC tests PASSED! Backend is working correctly.');
    console.log('💡 The legacy tRPC endpoints (/trpc/*) are working fine.');
    console.log('💡 Your app should use the legacy endpoints for now.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests FAILED.');
    console.log('💡 Check backend configuration and restart if needed.');
    process.exit(1);
  }
};

main().catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
});