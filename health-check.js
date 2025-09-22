#!/usr/bin/env node

// Simple health check script for the backend
const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

console.log('🏥 Testing backend health...');

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    console.log(`🔍 Testing ${description}: http://${HOST}:${PORT}${path}`);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ ${description}: ${res.statusCode} - ${parsed.message || parsed.status || 'OK'}`);
          resolve({ success: true, status: res.statusCode, data: parsed });
        } catch (error) {
          console.log(`⚠️  ${description}: ${res.statusCode} - Non-JSON response`);
          console.log('Response preview:', data.substring(0, 200));
          resolve({ success: false, status: res.statusCode, error: 'Non-JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}: Connection failed - ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ ${description}: Request timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function runHealthChecks() {
  console.log(`🚀 Checking backend at http://${HOST}:${PORT}`);
  console.log('');

  const tests = [
    { path: '/', description: 'Root endpoint' },
    { path: '/health', description: 'Health endpoint' },
    { path: '/api', description: 'API root' },
    { path: '/api/health', description: 'API health' },
    { path: '/api/trpc/health', description: 'tRPC health' },
    { path: '/debug/routes', description: 'Debug routes' }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.description);
    results.push({ ...test, ...result });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Health Check Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    failed.forEach(f => {
      console.log(`   ${f.path} - ${f.error || 'Unknown error'}`);
    });
  }
  
  if (successful.length === 0) {
    console.log('\n🚨 Backend appears to be down or not responding');
    console.log('💡 Try starting it with: node server.js');
    process.exit(1);
  } else if (successful.some(s => s.path.includes('trpc'))) {
    console.log('\n🎉 Backend is running and tRPC is accessible!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Backend is running but tRPC may not be working');
    process.exit(1);
  }
}

runHealthChecks().catch(error => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});