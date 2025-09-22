#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

console.log('🚀 Backend Startup Script');
console.log('📁 Working directory:', process.cwd());

// Function to kill processes on specific ports
async function killProcessesOnPorts(ports) {
  console.log('🧹 Cleaning up existing processes...');
  
  for (const port of ports) {
    try {
      // Kill any process using the port
      await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
      console.log(`✅ Cleaned up port ${port}`);
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }
  
  // Wait a moment for processes to fully terminate
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Function to check if a port is available
async function isPortAvailable(port) {
  try {
    const { stdout } = await execAsync(`lsof -i:${port}`);
    return stdout.trim() === '';
  } catch (error) {
    // If lsof fails, assume port is available
    return true;
  }
}

// Function to find an available port
async function findAvailablePort(startPort = 3001, maxPort = 3010) {
  console.log('🔍 Finding available port...');
  
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Found available port: ${port}`);
      return port;
    }
  }
  
  throw new Error(`No available ports found between ${startPort} and ${maxPort}`);
}

// Function to update environment variable
function updateEnvFile(port) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.log('Creating new .env.local file');
  }
  
  // Update or add the backend port
  const portLine = `EXPO_PUBLIC_BACKEND_PORT=${port}`;
  const lines = envContent.split('\n');
  const portLineIndex = lines.findIndex(line => line.startsWith('EXPO_PUBLIC_BACKEND_PORT='));
  
  if (portLineIndex >= 0) {
    lines[portLineIndex] = portLine;
  } else {
    lines.push(portLine);
  }
  
  // Remove empty lines at the end
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
  console.log(`📝 Set EXPO_PUBLIC_BACKEND_PORT=${port} in .env.local`);
}

// Main function
async function main() {
  try {
    // Clean up existing processes
    await killProcessesOnPorts([3001, 3002, 3003, 3004, 3005, 8080]);
    
    // Find available port
    const port = await findAvailablePort();
    
    // Update environment file
    updateEnvFile(port);
    
    // Set environment variable for this process
    process.env.PORT = port.toString();
    
    console.log(`🚀 Starting backend on port ${port}...`);
    console.log('📁 Backend path:', path.join(process.cwd(), 'backend/hono.ts'));
    
    // Start the backend using bun
    const backendProcess = spawn('bun', ['run', 'backend/hono.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port.toString(),
      }
    });
    
    console.log('✅ Backend startup script running...');
    console.log('💡 Press Ctrl+C to stop the server');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });
    
    // Handle backend process exit
    backendProcess.on('exit', (code) => {
      if (code !== 0) {
        console.log(`🛑 Backend process exited with code ${code}`);
        process.exit(code);
      }
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Backend process error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start backend:', error.message);
    process.exit(1);
  }
}

main();