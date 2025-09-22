import { spawn } from 'child_process';
import { createServer } from 'net';

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
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Function to kill processes on port
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const killProcess = spawn('lsof', ['-ti', `:${port}`]);
    let pid = '';
    
    killProcess.stdout.on('data', (data) => {
      pid += data.toString();
    });
    
    killProcess.on('close', (code) => {
      if (pid.trim()) {
        console.log(`Killing process ${pid.trim()} on port ${port}`);
        spawn('kill', ['-9', pid.trim()]);
        setTimeout(resolve, 1000);
      } else {
        resolve();
      }
    });
    
    killProcess.on('error', () => resolve());
  });
}

async function startBackend() {
  try {
    console.log('🧹 Cleaning up existing processes...');
    
    // Kill processes on common ports
    const ports = [3001, 3002, 3003, 8080];
    for (const port of ports) {
      await killProcessOnPort(port);
    }
    
    console.log('🔍 Finding available port...');
    const availablePort = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${availablePort}`);
    
    // Set environment variables
    process.env.PORT = availablePort.toString();
    process.env.EXPO_PUBLIC_BACKEND_PORT = availablePort.toString();
    
    console.log(`🚀 Starting backend on port ${availablePort}...`);
    console.log(`📝 Setting EXPO_PUBLIC_BACKEND_PORT=${availablePort} for frontend`);
    
    // Start backend with bun
    const backend = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: availablePort.toString(),
        EXPO_PUBLIC_BACKEND_PORT: availablePort.toString()
      }
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });
    
    backend.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      process.exit(code || 0);
    });
    
    // Handle process termination
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
    
  } catch (error) {
    console.error('❌ Error starting backend:', error.message);
    process.exit(1);
  }
}

startBackend();