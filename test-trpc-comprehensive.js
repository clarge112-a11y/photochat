#!/usr/bin/env node

// Comprehensive tRPC connection test script
const fetch = require('undici').fetch;

console.log('🔍 Comprehensive tRPC Connection Test');
console.log('📅 Test started at:', new Date().toISOString());

const testEndpoints = async () => {
  const baseUrl = 'http://localhost:3001';
  const results = {
    basicHealth: false,
    legacyTrpc: false,
    newApiTrpc: false,
    trpcPing: false,
    errors: []
  };
  
  // Test 1: Basic Health
  console.log('\n🔗 Testing Basic Health:');
  try {
    const response = await fetch(`${baseUrl}/`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Basic Health - SUCCESS:', data.message);
      results.basicHealth = true;
    } else {
      console.log('❌ Basic Health - FAILED:', response.status);
      results.errors.push(`Basic health failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Basic Health - ERROR:', error.message);
    results.errors.push(`Basic health error: ${error.message}`);
  }
  
  // Test 2: Legacy tRPC Health
  console.log('\n🔗 Testing Legacy tRPC Health:');
  try {
    const response = await fetch(`${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Legacy tRPC Health - SUCCESS:', data.result?.data?.json?.message);
      results.legacyTrpc = true;
    } else {
      console.log('❌ Legacy tRPC Health - FAILED:', response.status);
      results.errors.push(`Legacy tRPC failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Legacy tRPC Health - ERROR:', error.message);
    results.errors.push(`Legacy tRPC error: ${error.message}`);
  }
  
  // Test 3: New API tRPC Health
  console.log('\n🔗 Testing New API tRPC Health:');
  try {
    const response = await fetch(`${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ New API tRPC Health - SUCCESS:', data.result?.data?.json?.message);
      results.newApiTrpc = true;
    } else {
      console.log('❌ New API tRPC Health - FAILED:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText.substring(0, 200));
      results.errors.push(`New API tRPC failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ New API tRPC Health - ERROR:', error.message);
    results.errors.push(`New API tRPC error: ${error.message}`);
  }
  
  // Test 4: tRPC Ping
  console.log('\n🔗 Testing tRPC Ping:');
  try {
    const response = await fetch(`${baseUrl}/api/trpc/ping?input=%7B%22json%22%3Anull%7D`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC Ping - SUCCESS:', data.result?.data?.json?.message);
      results.trpcPing = true;
    } else {
      console.log('❌ tRPC Ping - FAILED:', response.status);
      results.errors.push(`tRPC ping failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ tRPC Ping - ERROR:', error.message);
    results.errors.push(`tRPC ping error: ${error.message}`);
  }
  
  return results;
};

const main = async () => {
  console.log('⏳ Waiting 3 seconds for backend to be ready...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const results = await testEndpoints();
  
  console.log('\n📊 TEST RESULTS:');
  console.log('================');
  console.log(`Basic Health: ${results.basicHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Legacy tRPC: ${results.legacyTrpc ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`New API tRPC: ${results.newApiTrpc ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`tRPC Ping: ${results.trpcPing ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = [results.basicHealth, results.legacyTrpc, results.newApiTrpc, results.trpcPing].filter(Boolean).length;
  console.log(`\nOverall: ${passCount}/4 tests passed`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (results.newApiTrpc && results.trpcPing) {
    console.log('\n🎉 SUCCESS! The new API tRPC endpoints are working correctly.');
    console.log('💡 Your app should now be able to connect to the backend.');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED! The new API tRPC endpoints are not working.');
    console.log('🔧 Check the backend configuration and restart it.');
    process.exit(1);
  }
};

main().catch(error => {
  console.error('❌ Test script error:', error.message);
  process.exit(1);
});