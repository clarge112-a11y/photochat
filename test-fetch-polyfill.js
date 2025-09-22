#!/usr/bin/env node

// Add fetch polyfill for Node.js < 18
if (!globalThis.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
    console.log('✅ Fetch polyfill loaded successfully');
  } catch (_error) {
    console.error('❌ fetch is not available. Please install undici: npm install undici');
    process.exit(1);
  }
} else {
  console.log('✅ Native fetch is available');
}

console.log('🔍 Testing fetch functionality...');

async function testFetch() {
  try {
    console.log('📡 Making test request to httpbin.org...');
    const response = await fetch('https://httpbin.org/json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'test-fetch-polyfill'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Fetch test successful!');
      console.log('📋 Response data:', data);
      return true;
    } else {
      console.log('❌ Fetch test failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Fetch test error:', error.message);
    return false;
  }
}

testFetch().then(success => {
  if (success) {
    console.log('\n🎉 Fetch polyfill is working correctly!');
    console.log('💡 You can now run other test scripts without fetch errors');
  } else {
    console.log('\n❌ Fetch polyfill test failed');
    console.log('💡 Check your internet connection and try again');
  }
}).catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
});