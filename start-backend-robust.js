#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { createServer } = require('net');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Function to find available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Function to kill processes on port (more robust)
async function killProcessOnPort(port) {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.split('\n').filter(line => line.includes(`:${port} `));
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(pid)) {
            console.log(`💀 Killing process ${pid} on port ${port}`);
            await execAsync(`taskkill /F /PID ${pid}`);
          }
        }
      } catch (error) {
        // Ignore errors - port might not be in use
      }
    } else {
      // Unix/Linux/macOS
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
        
        for (const pid of pids) {
          console.log(`💀 Killing process ${pid} on port ${port}`);
          await execAsync(`kill -9 ${pid}`);
        }
      } catch (error) {
        // Ignore errors - port might not be in use
      }
    }
    
    // Wait for process to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.log(`⚠️  Could not kill processes on port ${port}: ${error.message}`);
  }
}

async function startBackend() {
  try {
    console.log('🚀 Backend Startup Script (Robust Version)');
    console.log('📁 Working directory:', process.cwd());
    console.log('');
    
    console.log('🧹 Cleaning up existing processes...');
    
    // Kill processes on common ports
    const ports = [3001, 3002, 3003, 3004, 3005, 8080];
    for (const port of ports) {
      await killProcessOnPort(port);
    }
    
    // Extra wait for processes to fully terminate
    console.log('⏳ Waiting for processes to terminate...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Finding available port...');
    const availablePort = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${availablePort}`);
    
    console.log(`🚀 Starting backend on port ${availablePort}...`);
    console.log(`📝 Setting EXPO_PUBLIC_BACKEND_PORT=${availablePort} for frontend`);
    
    // Try bun first
    console.log('🔄 Attempting to start with bun...');
    
    const backend = spawn('bun', ['backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: availablePort.toString(),
        EXPO_PUBLIC_BACKEND_PORT: availablePort.toString(),
        NODE_ENV: 'development'
      },
      cwd: process.cwd()
    });
    
    let backendStarted = false;
    
    // Give bun a chance to start
    setTimeout(() => {
      if (!backendStarted) {
        console.log('✅ Backend appears to be starting successfully');
        backendStarted = true;
      }
    }, 3000);
    
    backend.on('error', (error) => {
      if (!backendStarted) {
        console.error('❌ Bun failed to start:', error.message);
        
        // Fallback to node
        console.log('🔄 Trying with Node.js + tsx...');
        const nodeBackend = spawn('npx', ['tsx', 'backend/hono.ts'], {
          stdio: 'inherit',
          env: {
            ...process.env,
            PORT: availablePort.toString(),
            EXPO_PUBLIC_BACKEND_PORT: availablePort.toString(),
            NODE_ENV: 'development'
          },
          cwd: process.cwd()
        });
        
        nodeBackend.on('error', (nodeError) => {
          console.error('❌ Node.js fallback also failed:', nodeError.message);
          process.exit(1);
        });
        
        nodeBackend.on('exit', (code) => {
          console.log(`🛑 Node.js backend process exited with code ${code}`);
          process.exit(code || 0);
        });
      }
    });
    
    backend.on('exit', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
        if (!backendStarted) {
          console.log('🔄 Trying alternative startup method...');
          
          // Try with node directly
          const nodeBackend = spawn('node', ['--loader', 'tsx', 'backend/hono.ts'], {
            stdio: 'inherit',
            env: {
              ...process.env,
              PORT: availablePort.toString(),
              EXPO_PUBLIC_BACKEND_PORT: availablePort.toString(),
              NODE_ENV: 'development'
            },
            cwd: process.cwd()
          });
          
          nodeBackend.on('exit', (nodeCode) => {
            console.log(`🛑 Node backend exited with code ${nodeCode}`);
            process.exit(nodeCode || 0);
          });
          
          return;
        }
      }
      process.exit(code || 0);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Error starting backend:', error.message);
    process.exit(1);
  }
}

startBackend();