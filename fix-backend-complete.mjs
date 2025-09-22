#!/usr/bin/env node

/**
 * Complete Backend Fix Script
 * This script will:
 * 1. Kill any existing backend processes
 * 2. Find an available port
 * 3. Start the backend server using Node.js
 * 4. Set the environment variable for the frontend
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

console.log('🔧 Complete Backend Fix Script');
console.log('===============================');

// Kill processes on specific ports
async function killPortProcesses(ports) {
  console.log('🧹 Cleaning up existing processes...');
  
  for (const port of ports) {
    try {
      // Try multiple methods to kill processes
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`);
      console.log(`✅ Cleaned up port ${port}`);
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Check if port is available
async function isPortAvailable(port) {
  try {
    const { stdout } = await execAsync(`lsof -i:${port} 2>/dev/null || echo ""`);
    return stdout.trim() === '';
  } catch (error) {
    return true; // Assume available if command fails
  }
}

// Find available port
async function findAvailablePort(startPort = 3001) {
  console.log(`🔍 Finding available port starting from ${startPort}...`);
  
  for (let port = startPort; port <= startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Set environment variable
function setEnvironmentVariable(port) {
  try {
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port}`);
    
    // Also try to write to .env file if it exists
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('EXPO_PUBLIC_BACKEND_PORT=')) {
        envContent = envContent.replace(/EXPO_PUBLIC_BACKEND_PORT=\d+/, `EXPO_PUBLIC_BACKEND_PORT=${port}`);
      } else {
        envContent += `\nEXPO_PUBLIC_BACKEND_PORT=${port}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log(`📝 Updated .env file with port ${port}`);
    }
  } catch (error) {
    console.warn('⚠️ Could not set environment variable:', error.message);
  }
}

// Start backend server
async function startBackend(port) {
  console.log(`🚀 Starting backend server on port ${port}...`);
  
  const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
  
  if (!fs.existsSync(backendPath)) {
    throw new Error(`Backend file not found: ${backendPath}`);
  }
  
  console.log(`📁 Backend path: ${backendPath}`);
  
  // Use tsx to run TypeScript directly
  const args = ['tsx', backendPath];
  
  console.log(`🎯 Running: npx ${args.join(' ')}`);
  
  const backendProcess = spawn('npx', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'development',
      EXPO_PUBLIC_BACKEND_PORT: port.toString()
    }
  });
  
  // Handle process events
  backendProcess.on('error', (error) => {
    console.error('🛑 Backend process error:', error);
    process.exit(1);
  });
  
  backendProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`🛑 Backend process exited with code ${code}`);
    }
    process.exit(code || 0);
  });
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down backend server...');
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
      backendProcess.kill('SIGKILL');
      process.exit(0);
    }, 5000);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  console.log('✅ Backend server started successfully');
  console.log('💡 Press Ctrl+C to stop the server');
  console.log(`🌐 Server available at: http://localhost:${port}`);
  console.log(`🔗 tRPC endpoint: http://localhost:${port}/api/trpc`);
  
  return backendProcess;
}

// Test backend connection
async function testBackendConnection(port, maxRetries = 10) {
  console.log(`🧪 Testing backend connection on port ${port}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection test successful:', data.message);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Connection attempt ${i + 1}/${maxRetries} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.error('❌ Backend connection test failed after all retries');
  return false;
}

// Main function
async function main() {
  try {
    console.log('📁 Working directory:', process.cwd());
    
    // Step 1: Clean up existing processes
    await killPortProcesses([3001, 3002, 3003, 3004, 3005, 8080, 8081]);
    
    // Step 2: Find available port
    const port = await findAvailablePort(3001);
    
    // Step 3: Set environment variable
    setEnvironmentVariable(port);
    
    // Step 4: Start backend server
    const backendProcess = await startBackend(port);
    
    // Step 5: Test connection (in background)
    setTimeout(async () => {
      const isConnected = await testBackendConnection(port);
      if (isConnected) {
        console.log('🎉 Backend is ready and responding to requests!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Your backend is running on port', port);
        console.log('   2. Your frontend should automatically use this port');
        console.log('   3. If you see tRPC errors, restart your frontend app');
        console.log('');
      } else {
        console.error('⚠️ Backend started but is not responding to health checks');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Make sure you have tsx installed: npm install -g tsx');
    console.error('   2. Check if backend/hono.ts exists');
    console.error('   3. Verify your dependencies are installed: npm install');
    console.error('   4. Try running manually: npx tsx backend/hono.ts');
    process.exit(1);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run main function
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});