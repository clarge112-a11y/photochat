#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Backend with Fixed tRPC Configuration');
console.log('📁 Working directory:', process.cwd());

// Kill any existing backend processes
console.log('🧹 Killing existing backend processes...');
try {
  require('child_process').execSync('pkill -f "bun.*backend/hono.ts" || true', { stdio: 'inherit' });
  require('child_process').execSync('pkill -f "node.*start-backend" || true', { stdio: 'inherit' });
} catch (_error) {
  // Ignore errors from pkill
}

// Find available port
const findAvailablePort = async (startPort = 3001) => {
  const net = require('net');
  
  for (let port = startPort; port <= startPort + 10; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, () => {
          server.close(resolve);
        });
        server.on('error', reject);
      });
      return port;
    } catch (_error) {
      continue;
    }
  }
  throw new Error('No available ports found');
};

const startBackend = async () => {
  try {
    // Find available port
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(3001);
    console.log(`✅ Found available port: ${port}`);
    
    // Update .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add backend port and URL
    const lines = envContent.split('\n');
    let portUpdated = false;
    let urlUpdated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('EXPO_PUBLIC_BACKEND_PORT=')) {
        lines[i] = `EXPO_PUBLIC_BACKEND_PORT=${port}`;
        portUpdated = true;
      } else if (lines[i].startsWith('EXPO_PUBLIC_BACKEND_URL=')) {
        lines[i] = `EXPO_PUBLIC_BACKEND_URL=http://localhost:${port}`;
        urlUpdated = true;
      }
    }
    
    if (!portUpdated) {
      lines.push(`EXPO_PUBLIC_BACKEND_PORT=${port}`);
    }
    if (!urlUpdated) {
      lines.push(`EXPO_PUBLIC_BACKEND_URL=http://localhost:${port}`);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'));
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
    console.log(`📝 Set EXPO_PUBLIC_BACKEND_URL=http://localhost:${port} in .env.local`);
    
    // Set environment variables for this process
    process.env.PORT = port.toString();
    process.env.EXPO_PUBLIC_BACKEND_PORT = port.toString();
    process.env.EXPO_PUBLIC_BACKEND_URL = `http://localhost:${port}`;
    
    console.log(`🚀 Starting backend on port ${port}...`);
    
    // Check if backend file exists
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    if (!fs.existsSync(backendPath)) {
      throw new Error(`Backend file not found: ${backendPath}`);
    }
    console.log('📁 Backend path:', backendPath);
    
    // Start the backend using bun
    const backend = spawn('bun', ['run', backendPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'development'
      }
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });
    
    backend.on('exit', (code, signal) => {
      if (signal) {
        console.log(`🛑 Backend stopped by signal: ${signal}`);
      } else {
        console.log(`🛑 Backend exited with code: ${code}`);
      }
      process.exit(code || 0);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\\n🛑 Stopping backend...');
      backend.kill('SIGTERM');
    });
    
    process.on('SIGTERM', () => {
      console.log('\\n🛑 Stopping backend...');
      backend.kill('SIGTERM');
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
};

startBackend();