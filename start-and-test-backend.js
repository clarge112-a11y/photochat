#!/usr/bin/env node

// Simple script to start backend and test tRPC connection
const { spawn } = require('child_process');
const fetch = require('undici').fetch;

console.log('🚀 Starting Backend and Testing tRPC Connection');
console.log('📅 Started at:', new Date().toISOString());

// Kill existing processes on common ports
function killExistingProcesses() {
  console.log('🧹 Cleaning up existing processes...');
  const ports = [3001, 3002, 3003];
  ports.forEach(port => {
    try {
      require('child_process').execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    } catch (e) {
      // Port not in use, ignore
    }
  });
}

// Test tRPC connection
async function testTRPCConnection() {
  console.log('🔍 Testing tRPC connection...');
  
  const baseUrl = 'http://localhost:3001';
  const tests = [
    { name: 'Backend Health', url: `${baseUrl}/` },
    { name: 'tRPC Health', url: `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D` },
    { name: 'tRPC Ping', url: `${baseUrl}/api/trpc/ping?input=%7B%22json%22%3Anull%7D` }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      console.log(`\n🔗 Testing ${test.name}...`);
      const response = await fetch(test.url, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name} - SUCCESS`);
        if (data.result?.data?.json) {
          console.log(`   Response: ${data.result.data.json.message || data.result.data.json.status}`);
        } else if (data.message || data.status) {
          console.log(`   Response: ${data.message || data.status}`);
        }
      } else {
        console.log(`❌ ${test.name} - FAILED (${response.status})`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Main function
async function main() {
  try {
    // Clean up
    killExistingProcesses();
    
    // Wait for ports to be freed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start backend
    console.log('🚀 Starting backend server...');
    const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Handle backend output
    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });
    
    // Handle backend process errors
    backendProcess.on('error', (error) => {
      console.error('❌ Backend process error:', error);
      process.exit(1);
    });
    
    // Wait for backend to start
    console.log('⏳ Waiting 5 seconds for backend to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test connection
    const success = await testTRPCConnection();
    
    if (success) {
      console.log('\n🎉 SUCCESS! Backend is running and tRPC is working correctly.');
      console.log('💡 You can now use your app to connect to the backend.');
      console.log('🔗 Backend URL: http://localhost:3001');
      console.log('🔗 tRPC URL: http://localhost:3001/api/trpc');
      console.log('\n💡 Press Ctrl+C to stop the backend server.');
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down backend...');
        backendProcess.kill('SIGINT');
        process.exit(0);
      });
      
      // Keep alive
      setInterval(() => {
        // Just keep the process alive
      }, 1000);
      
    } else {
      console.log('\n❌ FAILED! Backend or tRPC is not working correctly.');
      console.log('🔧 Check the error messages above for troubleshooting.');
      backendProcess.kill('SIGINT');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

main();