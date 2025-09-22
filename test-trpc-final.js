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

console.log('🔍 Testing tRPC Connection After Fix');

const testTRPCEndpoints = async () => {
  const baseUrl = 'http://localhost:3001';
  
  console.log('\n🔗 Testing Basic Health:');
  try {
    const response = await fetch(`${baseUrl}/`);
    const data = await response.json();
    console.log('✅ Basic Health:', response.status, data);
  } catch (error) {
    console.log('❌ Basic Health Failed:', error.message);
    return false;
  }
  
  console.log('\n🔗 Testing tRPC Health (Legacy):');
  try {
    const response = await fetch(`${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`);
    const data = await response.json();
    console.log('✅ Legacy tRPC Health:', response.status, data);
  } catch (error) {
    console.log('❌ Legacy tRPC Health Failed:', error.message);
  }
  
  console.log('\n🔗 Testing tRPC Health (New API):');
  try {
    const response = await fetch(`${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D`);
    const data = await response.json();
    if (response.ok) {
      console.log('✅ New API tRPC Health:', response.status, data);
      return true;
    } else {
      console.log('❌ New API tRPC Health Failed:', response.status, data);
      return false;
    }
  } catch (error) {
    console.log('❌ New API tRPC Health Failed:', error.message);
    return false;
  }
};

const main = async () => {
  // Wait a moment for backend to be ready
  console.log('⏳ Waiting 2 seconds for backend to be ready...');
  await new Promise(resolve => {
    if (typeof resolve === 'function') {
      setTimeout(resolve, 2000);
    }
  });
  
  const success = await testTRPCEndpoints();
  
  if (success) {
    console.log('\n🎉 tRPC connection test PASSED! Backend is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ tRPC connection test FAILED. Check backend configuration.');
    process.exit(1);
  }
};

main();