#!/usr/bin/env node

console.log('🚀 Starting Backend and Running Comprehensive Tests');
console.log('This script will:');
console.log('1. Clean up existing processes');
console.log('2. Start the backend');
console.log('3. Run comprehensive tRPC tests');
console.log('4. Provide detailed diagnosis');

const { spawn } = require('child_process');
const { main: startBackend } = require('./start-backend-clean.js');

async function runTests() {
  console.log('\n⏳ Waiting 3 seconds for backend to fully start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n🔍 Running comprehensive diagnosis...');
  
  // Run the diagnosis script
  const diagnoseProcess = spawn('node', ['diagnose-trpc.js'], {
    stdio: 'inherit'
  });
  
  diagnoseProcess.on('close', (code) => {
    console.log(`\n📊 Diagnosis completed with code ${code}`);
    
    // Run the direct tRPC client test
    console.log('\n🔍 Testing tRPC client directly...');
    const clientTestProcess = spawn('node', ['test-trpc-client-direct.js'], {
      stdio: 'inherit'
    });
    
    clientTestProcess.on('close', (clientCode) => {
      console.log(`\n📊 Client test completed with code ${clientCode}`);
      
      if (code === 0 && clientCode === 0) {
        console.log('\n🎉 All tests passed! tRPC is working correctly.');
        console.log('💡 You can now use the app - the backend should be working.');
      } else {
        console.log('\n⚠️ Some tests failed. Check the output above for details.');
        console.log('💡 Common fixes:');
        console.log('   1. Make sure the backend is running');
        console.log('   2. Check the .env.local file has the correct port');
        console.log('   3. Verify the tRPC router configuration');
      }
      
      console.log('\n💡 The backend is still running. Press Ctrl+C to stop it.');
    });
    
    clientTestProcess.on('error', (error) => {
      console.error('❌ Failed to run client test:', error.message);
    });
  });
  
  diagnoseProcess.on('error', (error) => {
    console.error('❌ Failed to run diagnosis:', error.message);
  });
}

// Start the backend and then run tests
startBackend().then(() => {
  runTests();
}).catch((error) => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});