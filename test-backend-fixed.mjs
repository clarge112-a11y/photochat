#!/usr/bin/env node

import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

console.log('🔍 Testing backend connections...');

// Function to test a specific port
async function testPort(port) {
  try {
    console.log(`📡 Testing port ${port}...`);
    
    // Test basic health endpoint
    const response = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Port ${port} is working:`, data.message);
      
      // Test tRPC endpoint
      try {
        const trpcResponse = await fetch(`http://localhost:${port}/api/trpc/health?input=%7B%22json%22%3Anull%7D`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(5000),
        });
        
        if (trpcResponse.ok) {
          const trpcData = await trpcResponse.json();
          console.log(`✅ tRPC on port ${port} is working:`, trpcData);
          return { port, working: true, trpc: true };
        } else {
          console.log(`⚠️  Port ${port} basic health OK, but tRPC failed:`, trpcResponse.status);
          return { port, working: true, trpc: false };
        }
      } catch (trpcError) {
        console.log(`⚠️  Port ${port} basic health OK, but tRPC error:`, trpcError.message);
        return { port, working: true, trpc: false };
      }
    } else {
      console.log(`❌ Port ${port} returned:`, response.status, response.statusText);
      return { port, working: false, trpc: false };
    }
  } catch (error) {
    console.log(`❌ Connection failed on port ${port}:`, error.message);
    return { port, working: false, trpc: false };
  }
}

// Function to check if port is in use
async function isPortInUse(port) {
  try {
    const { stdout } = await execAsync(`lsof -i:${port}`);
    return stdout.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  const ports = [3001, 3002, 3003, 3004, 3005];
  const results = [];
  
  for (const port of ports) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log(`🔍 Port ${port} is in use, testing...`);
      const result = await testPort(port);
      results.push(result);
    } else {
      console.log(`❌ Port ${port} is not in use`);
      results.push({ port, working: false, trpc: false });
    }
  }
  
  // Summary
  const workingPorts = results.filter(r => r.working);
  const trpcPorts = results.filter(r => r.trpc);
  
  if (workingPorts.length > 0) {
    console.log('\n✅ Working backend ports:', workingPorts.map(r => r.port).join(', '));
    if (trpcPorts.length > 0) {
      console.log('✅ Working tRPC ports:', trpcPorts.map(r => r.port).join(', '));
      console.log('💡 Your app should connect successfully');
    } else {
      console.log('⚠️  Backend is running but tRPC is not working');
      console.log('💡 Check tRPC configuration');
    }
  } else {
    console.log('\n❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-fixed.mjs');
  }
}

main().catch(console.error);