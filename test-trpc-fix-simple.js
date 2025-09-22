#!/usr/bin/env node

console.log('🔍 Testing tRPC Fix');
console.log('==================');

const testEndpoints = async () => {
  const baseUrl = 'http://localhost:3001';
  
  const endpoints = [
    { name: 'Legacy tRPC Health', url: `${baseUrl}/trpc/health?input=%7B%22json%22%3Anull%7D` },
    { name: 'Primary tRPC Health', url: `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D` },
    { name: 'Primary tRPC Ping', url: `${baseUrl}/api/trpc/ping?input=%7B%22json%22%3Anull%7D` },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testing ${endpoint.name}:`);
      console.log(`   URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status} OK`);
        try {
          const data = JSON.parse(responseText);
          console.log(`   📄 Response:`, JSON.stringify(data, null, 2).substring(0, 200));
        } catch {
          console.log(`   📄 Response: ${responseText.substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
        console.log(`   📄 Error: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
};

const main = async () => {
  try {
    // First check if backend is running
    const healthResponse = await fetch('http://localhost:3001/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!healthResponse.ok) {
      console.log('❌ Backend is not running on port 3001');
      console.log('🔧 Start the backend first: node start-backend-working.js');
      process.exit(1);
    }
    
    console.log('✅ Backend is running on port 3001');
    await testEndpoints();
    
    console.log('\n📊 Test completed!');
    console.log('💡 If all endpoints show ✅, the tRPC fix is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

main();