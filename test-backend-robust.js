#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testBackend() {
  console.log('🔍 Testing backend connections...');
  console.log('');
  
  const ports = [3001, 3002, 3003, 3004, 3005];
  let workingPort = null;
  
  for (const port of ports) {
    try {
      console.log(`📡 Testing port ${port}...`);
      
      // Test basic health endpoint
      const response = await fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.text();
        console.log(`✅ Port ${port} is working! Response: ${data}`);
        workingPort = port;
        break;
      } else {
        console.log(`❌ Port ${port} responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Connection failed on port ${port}: ${error.message}`);
    }
  }
  
  if (workingPort) {
    console.log('');
    console.log(`🎉 Backend is running on port ${workingPort}`);
    console.log(`🌐 Health endpoint: http://localhost:${workingPort}/health`);
    console.log(`🔧 tRPC endpoint: http://localhost:${workingPort}/api/trpc`);
    
    // Test tRPC endpoint
    try {
      console.log('');
      console.log('🧪 Testing tRPC endpoint...');
      const trpcResponse = await fetch(`http://localhost:${workingPort}/api/trpc/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (trpcResponse.ok) {
        console.log('✅ tRPC endpoint is working!');
      } else {
        console.log(`⚠️  tRPC endpoint responded with status: ${trpcResponse.status}`);
      }
    } catch (error) {
      console.log(`⚠️  tRPC test failed: ${error.message}`);
    }
    
  } else {
    console.log('');
    console.log('❌ No working backend found on any port');
    console.log('💡 Try running: node start-backend-robust.js');
  }
}

// Add fetch polyfill for older Node versions
if (!global.fetch) {
  console.log('📦 Installing fetch polyfill...');
  try {
    const { default: fetch } = require('node-fetch');
    global.fetch = fetch;
  } catch (error) {
    console.log('⚠️  node-fetch not available, using basic http');
    
    // Fallback to basic http
    const http = require('http');
    global.fetch = (url, options = {}) => {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const req = http.request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname,
          method: options.method || 'GET',
          timeout: options.timeout || 5000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              text: () => Promise.resolve(data)
            });
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
      });
    };
  }
}

testBackend();