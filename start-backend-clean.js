#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

console.log('🚀 Clean Backend Startup');
console.log('📁 Working directory:', process.cwd());

// Kill processes on common ports
function killProcessesOnPorts() {
  return new Promise((resolve) => {
    console.log('🧹 Killing all existing backend processes...');
    
    const ports = [3001, 3002, 3003, 3004, 3005, 8080];
    let completed = 0;
    
    if (ports.length === 0) {
      resolve();
      return;
    }
    
    ports.forEach(port => {
      exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
        // Ignore errors - process might not exist
        completed++;
        if (completed === ports.length) {
          setTimeout(resolve, 1000); // Wait 1 second for cleanup
        }
      });
    });
  });
}

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Find available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Set environment variable for frontend
function setBackendPort(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  // Read existing .env.local if it exists
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('📝 Creating new .env.local file');
  }
  
  // Update or add the backend port and URL
  const portLine = `EXPO_PUBLIC_BACKEND_PORT=${port}`;
  const urlLine = `EXPO_PUBLIC_BACKEND_URL=http://localhost:${port}`;
  
  if (envContent.includes('EXPO_PUBLIC_BACKEND_PORT=')) {
    envContent = envContent.replace(/EXPO_PUBLIC_BACKEND_PORT=\d+/, portLine);
  } else {
    envContent += `\n${portLine}`;
  }
  
  if (envContent.includes('EXPO_PUBLIC_BACKEND_URL=')) {
    envContent = envContent.replace(/EXPO_PUBLIC_BACKEND_URL=.*/, urlLine);
  } else {
    envContent += `\n${urlLine}`;
  }
  
  try {
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_URL=http://localhost:${port} in .env.local`);
  } catch (error) {
    console.log(`⚠️  Could not write .env.local: ${error.message}`);
  }
  
  // Also set in current process
  process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
  process.env.EXPO_PUBLIC_BACKEND_URL = `http://localhost:${port}`;
  process.env.PORT = port.toString();
}

// Start backend server
function startBackend(port) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting backend on port ${port}...`);
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log('📁 Backend path:', backendPath);
    
    if (!fs.existsSync(backendPath)) {
      reject(new Error(`Backend file not found: ${backendPath}`));
      return;
    }
    
    // Use bun to run the TypeScript file directly
    const child = spawn('bun', ['run', backendPath], {
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      },
      stdio: 'inherit'
    });
    
    child.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      reject(error);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Backend exited successfully');
      } else {
        console.error(`🛑 Backend process exited with code ${code}`);
      }
    });
    
    // Give it a moment to start
    setTimeout(() => {
      console.log('✅ Backend startup script running...');
      console.log('💡 Press Ctrl+C to stop the server');
      resolve(child);
    }, 2000);
  });
}

// Main function
async function main() {
  try {
    // Kill existing processes
    await killProcessesOnPorts();
    
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort();
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variables
    setBackendPort(port);
    
    // Start backend
    const child = await startBackend(port);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      child.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      child.kill('SIGTERM');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, findAvailablePort, killProcessesOnPorts };