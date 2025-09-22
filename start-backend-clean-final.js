#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function killAllBackendProcesses() {
  console.log('🧹 Killing all existing backend processes...');
  
  try {
    // Kill processes by name patterns
    const patterns = [
      'hono.ts',
      'backend/hono.ts',
      'start-backend',
      'bun.*hono',
      'node.*hono',
      'tsx.*hono'
    ];
    
    for (const pattern of patterns) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /F /IM "${pattern}" 2>nul || echo "No ${pattern} processes found"`);
        } else {
          await execAsync(`pkill -f "${pattern}" || echo "No ${pattern} processes found"`);
        }
      } catch (error) {
        // Ignore errors - process might not exist
      }
    }
    
    // Kill processes on specific ports
    const ports = [3001, 3002, 3003, 3004, 3005, 8080];
    for (const port of ports) {
      try {
        if (process.platform === 'win32') {
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
        } else {
          const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || echo ""`);
          const pids = stdout.trim().split('\n').filter(pid => pid && !isNaN(pid));
          
          for (const pid of pids) {
            console.log(`💀 Killing process ${pid} on port ${port}`);
            await execAsync(`kill -9 ${pid}`);
          }
        }
      } catch (error) {
        // Ignore errors - port might not be in use
      }
    }
    
    console.log('⏳ Waiting for processes to terminate...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.log('⚠️  Some cleanup operations failed, but continuing...');
  }
}

async function findAvailablePort(startPort = 3001) {
  const { createServer } = require('net');
  
  for (let port = startPort; port <= startPort + 10; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(port, () => {
          server.close(() => resolve(true));
        });
        server.on('error', () => reject(false));
      });
      return port;
    } catch (error) {
      continue;
    }
  }
  throw new Error('No available ports found');
}

async function startBackend() {
  try {
    console.log('🚀 Clean Backend Startup');
    console.log('📁 Working directory:', process.cwd());
    console.log('');
    
    // Step 1: Kill all existing processes
    await killAllBackendProcesses();
    
    // Step 2: Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Step 3: Start backend
    console.log(`🚀 Starting backend on port ${port}...`);
    
    const backend = spawn('bun', ['backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        EXPO_PUBLIC_BACKEND_PORT: port.toString(),
        NODE_ENV: 'development'
      },
      cwd: process.cwd()
    });
    
    // Handle process events
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend with bun:', error.message);
      console.log('🔄 Trying with Node.js...');
      
      // Fallback to Node.js
      const nodeBackend = spawn('npx', ['tsx', 'backend/hono.ts'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          PORT: port.toString(),
          EXPO_PUBLIC_BACKEND_PORT: port.toString(),
          NODE_ENV: 'development'
        },
        cwd: process.cwd()
      });
      
      nodeBackend.on('error', (nodeError) => {
        console.error('❌ Node.js fallback failed:', nodeError.message);
        process.exit(1);
      });
      
      nodeBackend.on('exit', (code) => {
        console.log(`🛑 Backend exited with code ${code}`);
        process.exit(code || 0);
      });
    });
    
    backend.on('exit', (code) => {
      console.log(`🛑 Backend exited with code ${code}`);
      process.exit(code || 0);
    });
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\\n🛑 Shutting down...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 3000);
    });
    
    process.on('SIGTERM', () => {
      console.log('\\n🛑 Shutting down...');
      backend.kill('SIGTERM');
      setTimeout(() => {
        backend.kill('SIGKILL');
        process.exit(0);
      }, 3000);
    });
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

startBackend();