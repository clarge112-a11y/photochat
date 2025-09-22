#!/usr/bin/env node

// Comprehensive backend startup script with proper error handling
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Comprehensive Backend Setup');
console.log('📁 Working directory:', process.cwd());

// Kill any existing backend processes
function killExistingProcesses() {
  console.log('🧹 Killing existing backend processes...');
  try {
    // Kill processes on common ports
    const ports = [3001, 3002, 3003, 3004, 3005];
    ports.forEach(port => {
      try {
        require('child_process').execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      } catch (e) {
        // Port not in use, ignore
      }
    });
    console.log('✅ Existing processes killed');
  } catch (error) {
    console.log('ℹ️ No existing processes to kill');
  }
}

// Check if required files exist
function checkRequiredFiles() {
  console.log('🔍 Checking required files...');
  const requiredFiles = [
    'backend/hono.ts',
    'backend/trpc/app-router.ts',
    'backend/trpc/create-context.ts',
    'package.json'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }
  console.log('✅ All required files found');
}

// Install dependencies if needed
function checkDependencies() {
  console.log('📦 Checking dependencies...');
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    require('child_process').execSync('bun install', { stdio: 'inherit' });
  }
  console.log('✅ Dependencies ready');
}

// Start the backend server
function startBackend() {
  console.log('🚀 Starting backend server...');
  
  // Set environment variables
  process.env.NODE_ENV = 'development';
  process.env.PORT = '3001';
  
  const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'development'
    }
  });
  
  backendProcess.on('error', (error) => {
    console.error('❌ Backend process error:', error);
    process.exit(1);
  });
  
  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0) {
      console.error('❌ Backend process failed');
      process.exit(1);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down backend...');
    backendProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down backend...');
    backendProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  console.log('✅ Backend server started on port 3001');
  console.log('🔗 Health check: http://localhost:3001/');
  console.log('🔗 tRPC endpoint: http://localhost:3001/api/trpc');
  console.log('💡 Press Ctrl+C to stop the server');
}

// Main execution
async function main() {
  try {
    killExistingProcesses();
    checkRequiredFiles();
    checkDependencies();
    
    // Wait a moment for ports to be freed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    startBackend();
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

main();