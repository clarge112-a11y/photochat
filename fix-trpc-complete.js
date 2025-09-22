#!/usr/bin/env node

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

console.log('🚀 tRPC Connection Fix Script');
console.log('📅 Started at:', new Date().toISOString());

// Function to test tRPC endpoints
async function testTRPCEndpoints(baseUrl) {
  console.log('\n🔍 Testing tRPC endpoints...');
  
  const tests = [
    {
      name: 'Backend Health',
      url: `${baseUrl}/`,
      expected: 'Backend is running'
    },
    {
      name: 'tRPC Health',
      url: `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D`,
      expected: 'tRPC backend is working!'
    },
    {
      name: 'tRPC Ping',
      url: `${baseUrl}/api/trpc/ping?input=%7B%22json%22%3Anull%7D`,
      expected: 'pong'
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      console.log(`\n🔗 Testing ${test.name}...`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name} - SUCCESS`);
        
        // Check if response contains expected content
        const responseStr = JSON.stringify(data);
        if (responseStr.includes(test.expected)) {
          console.log(`   ✅ Response contains expected content: "${test.expected}"`);
        } else {
          console.log(`   ⚠️ Response doesn't contain expected content: "${test.expected}"`);
          console.log(`   📄 Actual response:`, JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ ${test.name} - FAILED (${response.status})`);
        console.log(`   Error: ${errorText.substring(0, 200)}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Function to wait for backend to be ready
async function waitForBackend(baseUrl, maxAttempts = 30) {
  console.log(`\n⏳ Waiting for backend to be ready at ${baseUrl}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        console.log(`✅ Backend is ready! (attempt ${attempt})`);
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    if (attempt < maxAttempts) {
      console.log(`   ⏳ Attempt ${attempt}/${maxAttempts} - waiting 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`❌ Backend not ready after ${maxAttempts} attempts`);
  return false;
}

// Function to update .env.local
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = `EXPO_PUBLIC_BACKEND_PORT=${port}
EXPO_PUBLIC_BACKEND_URL=http://localhost:${port}
`;
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Updated .env.local with port ${port}`);
}

async function main() {
  try {
    const port = 3001;
    const baseUrl = `http://localhost:${port}`;
    
    // Update environment file
    updateEnvFile(port);
    
    console.log(`\n🚀 Starting backend on port ${port}...`);
    
    // Start the backend
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    const backend = spawn('bun', ['run', '--hot', backendPath], {
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });
    
    // Log backend output
    backend.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Backend] ${output}`);
      }
    });
    
    backend.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Backend Error] ${output}`);
      }
    });
    
    // Wait for backend to be ready
    const isReady = await waitForBackend(baseUrl);
    
    if (!isReady) {
      console.log('❌ Backend failed to start properly');
      backend.kill();
      process.exit(1);
    }
    
    // Test tRPC endpoints
    const testsPassed = await testTRPCEndpoints(baseUrl);
    
    if (testsPassed) {
      console.log('\n🎉 SUCCESS! All tRPC tests passed.');
      console.log('💡 The backend is now working correctly.');
      console.log('🔧 You can now use the app - tRPC connection should work.');
      console.log('\n📋 Next steps:');
      console.log('   1. Keep this backend running');
      console.log('   2. Start your Expo app: bun expo start');
      console.log('   3. The app should now connect to tRPC successfully');
      
      // Keep the backend running
      console.log('\n🔄 Backend is running. Press Ctrl+C to stop...');
      
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down backend...');
        backend.kill('SIGTERM');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Shutting down backend...');
        backend.kill('SIGTERM');
        process.exit(0);
      });
      
    } else {
      console.log('\n❌ Some tests failed. Check the backend configuration.');
      backend.kill();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
}

main();