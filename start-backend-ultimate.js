#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

console.log('🚀 Ultimate Backend Startup');
console.log('📁 Working directory:', process.cwd());

// Function to kill processes on specific ports more aggressively
function killPortProcesses(ports) {
  return new Promise((resolve) => {
    const commands = [];
    
    // Kill by port using multiple methods
    ports.forEach(port => {
      commands.push(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      commands.push(`fuser -k ${port}/tcp 2>/dev/null || true`);
      commands.push(`pkill -f "port.*${port}" 2>/dev/null || true`);
    });
    
    // Kill by process name patterns
    commands.push('pkill -f "bun.*hono" 2>/dev/null || true');
    commands.push('pkill -f "node.*backend" 2>/dev/null || true');
    commands.push('pkill -f "tsx.*hono" 2>/dev/null || true');
    commands.push('pkill -f "start-backend" 2>/dev/null || true');
    
    const killCommand = commands.join(' && ');
    
    exec(killCommand, (error) => {
      if (error) {
        console.log('⚠️  Some cleanup commands failed (this is normal)');
      }
      console.log('✅ Process cleanup completed');
      
      // Wait a bit for processes to actually die
      setTimeout(resolve, 2000);
    });
  });
}

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
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

// Function to update .env.local
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove existing EXPO_PUBLIC_BACKEND_PORT line
  envContent = envContent.replace(/^EXPO_PUBLIC_BACKEND_PORT=.*$/m, '');
  
  // Add new port
  envContent = envContent.trim();
  if (envContent) {
    envContent += '\n';
  }
  envContent += `EXPO_PUBLIC_BACKEND_PORT=${port}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
}

// Function to start backend with Bun
function startBackendWithBun(port) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting backend with Bun on port ${port}...`);
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    console.log('📁 Backend path:', backendPath);
    
    if (!fs.existsSync(backendPath)) {
      reject(new Error(`Backend file not found: ${backendPath}`));
      return;
    }
    
    // Set environment variables
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'development',
      AUTO_START_SERVER: 'false' // Don't auto-start, we'll use Bun serve
    };
    
    // Use Bun to serve the backend directly
    const bunProcess = spawn('bun', ['run', '--hot', backendPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let startupComplete = false;
    let startupTimeout;
    
    // Set startup timeout
    startupTimeout = setTimeout(() => {
      if (!startupComplete) {
        console.log('⏰ Startup timeout - assuming server is ready');
        startupComplete = true;
        resolve(bunProcess);
      }
    }, 10000);
    
    bunProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output.trim());
      
      // Look for success indicators
      if ((output.includes('Server started successfully') || 
           output.includes('Development server running') ||
           output.includes('Backend ready')) && !startupComplete) {
        startupComplete = true;
        clearTimeout(startupTimeout);
        console.log('✅ Backend startup detected');
        resolve(bunProcess);
      }
    });
    
    bunProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Backend stderr:', error.trim());
      
      // Check for port in use error
      if (error.includes('EADDRINUSE') && !startupComplete) {
        startupComplete = true;
        clearTimeout(startupTimeout);
        reject(new Error(`Port ${port} is still in use`));
      }
    });
    
    bunProcess.on('error', (error) => {
      if (!startupComplete) {
        startupComplete = true;
        clearTimeout(startupTimeout);
        reject(error);
      }
    });
    
    bunProcess.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      if (!startupComplete) {
        startupComplete = true;
        clearTimeout(startupTimeout);
        if (code !== 0) {
          reject(new Error(`Backend process exited with code ${code}`));
        }
      }
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
  });
}

// Function to test backend connection
async function testBackendConnection(port, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection test successful:', data.message);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Connection test ${i + 1}/${maxRetries} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('❌ Backend connection test failed after all retries');
  return false;
}

// Main startup function
async function startBackend() {
  try {
    // Step 1: Aggressive cleanup
    console.log('🧹 Performing aggressive cleanup...');
    await killPortProcesses([3001, 3002, 3003, 3004, 3005, 8080]);
    
    // Step 2: Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Step 3: Update environment
    updateEnvFile(port);
    
    // Step 4: Start backend
    const backendProcess = await startBackendWithBun(port);
    
    // Step 5: Test connection
    console.log('🔍 Testing backend connection...');
    const connectionOk = await testBackendConnection(port);
    
    if (connectionOk) {
      console.log('🎉 Backend is running successfully!');
      console.log(`🌐 Backend URL: http://localhost:${port}`);
      console.log(`🔗 tRPC URL: http://localhost:${port}/api/trpc`);
    } else {
      console.log('⚠️  Backend started but connection test failed');
      console.log('💡 This might be normal - the backend may still be initializing');
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!backendProcess.killed) {
            backendProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down...');
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGTERM');
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Make sure Bun is installed: curl -fsSL https://bun.sh/install | bash');
    console.error('2. Check if any processes are still using ports: lsof -i :3001-3005');
    console.error('3. Try manual cleanup: pkill -f bun && pkill -f hono');
    console.error('4. Restart your terminal/shell');
    process.exit(1);
  }
}

// Start the backend
startBackend();