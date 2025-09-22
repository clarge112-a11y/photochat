#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

console.log('🚀 Starting backend with port cleanup...');

// Function to kill processes on specific ports
const killProcessesOnPorts = async (ports) => {
  for (const port of ports) {
    try {
      console.log(`🔍 Checking for processes on port ${port}...`);
      
      // Try different methods to find and kill processes
      const commands = [
        `lsof -ti:${port}`,
        `netstat -tlnp | grep :${port} | awk '{print $7}' | cut -d'/' -f1`,
        `ss -tlnp | grep :${port} | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2`
      ];
      
      let killed = false;
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd);
          const pids = stdout.trim().split('\n').filter(pid => pid && pid !== '');
          
          if (pids.length > 0) {
            console.log(`📋 Found PIDs on port ${port}:`, pids);
            for (const pid of pids) {
              if (pid && !isNaN(parseInt(pid))) {
                try {
                  await execAsync(`kill -9 ${pid}`);
                  console.log(`✅ Killed process ${pid} on port ${port}`);
                  killed = true;
                } catch (killError) {
                  console.log(`⚠️  Could not kill process ${pid}:`, killError.message);
                }
              }
            }
          }
          break; // If this command worked, don't try others
        } catch (cmdError) {
          // Try next command
          continue;
        }
      }
      
      if (!killed) {
        console.log(`✅ No processes found on port ${port}`);
      }
      
    } catch (error) {
      console.log(`⚠️  Could not check port ${port}:`, error.message);
    }
  }
};

const startServer = async () => {
  try {
    // Kill any processes on common backend ports
    await killProcessesOnPorts([3000, 3001, 3002, 3003]);
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🌐 Starting backend server on port 3003...');
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    
    // Set environment variable for port
    const env = { ...process.env, PORT: '3003' };
    
    const backend = spawn('bun', [backendPath], {
      stdio: 'inherit',
      env: env,
      cwd: process.cwd()
    });

    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      process.exit(1);
    });

    backend.on('close', (code) => {
      const exitCode = code || 0;
      console.log(`🛑 Backend process exited with code ${exitCode}`);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down backend...');
      backend.kill('SIGTERM');
      process.exit(0);
    });
    
    console.log('💡 Backend will be available at http://localhost:3003');
    console.log('💡 Press Ctrl+C to stop the server');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error.message || 'Unknown error');
  process.exit(1);
});