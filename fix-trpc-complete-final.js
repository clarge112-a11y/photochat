#!/usr/bin/env node

// Comprehensive tRPC fix script
console.log('🔧 tRPC Connection Fix Script');
console.log('============================');

const fs = require('fs');
const path = require('path');

// 1. Fix fetch polyfill in lib/trpc.ts
console.log('\n1. 📝 Fixing fetch polyfill...');

const trpcPath = path.join(process.cwd(), 'lib', 'trpc.ts');
if (fs.existsSync(trpcPath)) {
  let trpcContent = fs.readFileSync(trpcPath, 'utf8');
  
  // Fix the fetch polyfill to use undici instead of node-fetch
  const oldPolyfill = `// Polyfill fetch for Node.js environments
if (typeof fetch === 'undefined') {
  try {
    // Try to import node-fetch dynamically for Node.js environments
    const { default: fetch } = require('node-fetch');
    // @ts-ignore
    global.fetch = fetch;
    console.log('✅ node-fetch polyfill loaded');
  } catch (error) {
    console.warn('⚠️ Could not load node-fetch polyfill:', error);
    // Fallback to undici fetch if available
    try {
      const { fetch } = require('undici');
      // @ts-ignore
      global.fetch = fetch;
      console.log('✅ undici fetch polyfill loaded');
    } catch (undiciError) {
      console.warn('⚠️ Could not load undici fetch polyfill:', undiciError);
    }
  }
}`;

  const newPolyfill = `// Polyfill fetch for Node.js environments
if (typeof fetch === 'undefined') {
  try {
    // Use undici fetch for Node.js environments (more reliable than node-fetch v3)
    const { fetch } = require('undici');
    // @ts-ignore
    global.fetch = fetch;
    console.log('✅ undici fetch polyfill loaded');
  } catch (error) {
    console.warn('⚠️ Could not load undici fetch polyfill:', error);
    // Fallback to node-fetch if available
    try {
      const { default: fetch } = require('node-fetch');
      // @ts-ignore
      global.fetch = fetch;
      console.log('✅ node-fetch polyfill loaded');
    } catch (nodeError) {
      console.warn('⚠️ Could not load node-fetch polyfill:', nodeError);
    }
  }
}`;

  if (trpcContent.includes('node-fetch polyfill loaded')) {
    trpcContent = trpcContent.replace(oldPolyfill, newPolyfill);
    fs.writeFileSync(trpcPath, trpcContent);
    console.log('   ✅ Updated fetch polyfill to use undici first');
  } else {
    console.log('   ℹ️ Fetch polyfill already updated or not found');
  }
} else {
  console.log('   ❌ lib/trpc.ts not found');
}

// 2. Ensure .env.local has correct configuration
console.log('\n2. 📝 Updating .env.local...');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = `EXPO_PUBLIC_BACKEND_PORT=3001
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
`;

try {
  fs.writeFileSync(envPath, envContent);
  console.log('   ✅ Updated .env.local with correct backend configuration');
} catch (error) {
  console.log('   ❌ Could not update .env.local:', error.message);
}

// 3. Create a simple backend test
console.log('\n3. 🧪 Creating backend test script...');

const testScript = `#!/usr/bin/env node

// Quick backend connectivity test
const { spawn } = require('child_process');

// Polyfill fetch
if (typeof fetch === 'undefined') {
  try {
    const { fetch } = require('undici');
    global.fetch = fetch;
  } catch (error) {
    console.error('❌ Could not load fetch polyfill');
    process.exit(1);
  }
}

async function quickTest() {
  console.log('🔍 Quick Backend Test');
  
  // Test if backend is running
  try {
    const response = await fetch('http://localhost:3001/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running:', data.message);
      
      // Test tRPC legacy endpoint
      const trpcResponse = await fetch('http://localhost:3001/trpc/health?input=%7B%22json%22%3Anull%7D', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      
      if (trpcResponse.ok) {
        const trpcData = await trpcResponse.json();
        console.log('✅ tRPC is working:', trpcData.result?.data?.json?.message);
        console.log('🎉 All tests passed! Backend is ready.');
        return true;
      } else {
        console.log('❌ tRPC test failed:', trpcResponse.status);
        return false;
      }
    } else {
      console.log('❌ Backend health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not running or not accessible');
    console.log('💡 Start the backend with: node start-backend-simple-final.js');
    return false;
  }
}

quickTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
`;

try {
  fs.writeFileSync(path.join(process.cwd(), 'test-backend-quick.js'), testScript);
  console.log('   ✅ Created test-backend-quick.js');
} catch (error) {
  console.log('   ❌ Could not create test script:', error.message);
}

// 4. Summary and instructions
console.log('\n🎯 Fix Summary');
console.log('==============');
console.log('✅ Updated fetch polyfill to use undici (more reliable)');
console.log('✅ Updated .env.local with correct backend URL');
console.log('✅ Created quick test script');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Start backend: node start-backend-simple-final.js');
console.log('2. Test connection: node test-backend-quick.js');
console.log('3. If tests pass, your app should work!');
console.log('');
console.log('🔧 If issues persist:');
console.log('- Check that port 3001 is available');
console.log('- Ensure undici package is installed: npm install undici');
console.log('- Try restarting your development server');

console.log('\n✅ tRPC fix completed!');

