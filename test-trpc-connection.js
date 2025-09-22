#!/usr/bin/env node

// Simple tRPC connection test
const fetch = require('node-fetch');

async function testTRPCConnection() {
  console.log('🔍 Testing tRPC connection...');
  
  const baseUrl = 'http://localhost:3001';
  const trpcUrl = `${baseUrl}/api/trpc/health`;
  
  try {
    console.log('📡 Testing tRPC health endpoint:', trpcUrl);
    
    // Test the tRPC health endpoint with proper query format
    const healthQuery = {
      json: null,
      meta: {
        values: ['undefined']
      }
    };
    
    const queryString = encodeURIComponent(JSON.stringify(healthQuery));
    const fullUrl = `${trpcUrl}?input=${queryString}`;
    
    console.log('🔗 Full URL:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    console.log('📊 Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ tRPC health check successful:', data);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ tRPC health check failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ tRPC connection error:', error.message);
    return false;
  }
}

// Test basic backend health first
async function testBackendHealth() {
  console.log('🔍 Testing basic backend health...');
  
  const baseUrl = 'http://localhost:3001';
  
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('📊 Backend response status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend health check successful:', data);
      return true;
    } else {
      console.error('❌ Backend health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Backend connection error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting tRPC connection tests...');
  
  // Test backend health first
  const backendHealthy = await testBackendHealth();
  if (!backendHealthy) {
    console.error('💥 Backend is not healthy, skipping tRPC test');
    process.exit(1);
  }
  
  // Test tRPC connection
  const trpcHealthy = await testTRPCConnection();
  if (!trpcHealthy) {
    console.error('💥 tRPC connection failed');
    process.exit(1);
  }
  
  console.log('🎉 All tests passed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testTRPCConnection, testBackendHealth };