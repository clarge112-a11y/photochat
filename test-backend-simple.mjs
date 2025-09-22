#!/usr/bin/env node

import { createServer } from 'http';

console.log('🔍 Testing backend connections...');

// Function to test a specific port
async function testPort(port) {
  try {
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(3000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Port ${port} is working:`, data.message || data.status);
      return true;
    } else {
      console.log(`❌ Port ${port} returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Connection failed on port ${port}:`, error.message);
    return false;
  }
}

// Test common backend ports
const ports = [3001, 3002, 3003, 3004, 3005];

async function testAllPorts() {
  let foundWorking = false;
  
  for (const port of ports) {
    console.log(`\n📡 Testing port ${port}...`);
    const isWorking = await testPort(port);
    if (isWorking && !foundWorking) {
      foundWorking = true;
      console.log(`\n🎉 Found working backend on port ${port}!`);
      console.log(`💡 Set EXPO_PUBLIC_BACKEND_PORT=${port} in your environment`);
    }
  }
  
  if (!foundWorking) {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-simple.mjs');
  }
}

testAllPorts();