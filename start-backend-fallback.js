#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend with Node.js fallback...');

const startServer = async () => {
  try {
    console.log('🌐 Starting backend server on port 3003...');
    
    const backendPath = path.join(process.cwd(), 'backend', 'hono.ts');
    
    // Set environment variable for port
    const env = { ...process.env, PORT: '3003' };
    
    // Try bun first, then node with tsx
    let backend;
    
    try {
      console.log('🔧 Trying to start with bun...');
      backend = spawn('bun', [backendPath], {
        stdio: 'inherit',
        env: env,
        cwd: process.cwd()
      });
    } catch (bunError) {
      console.log('⚠️  Bun not available, trying with node + tsx...');
      try {
        backend = spawn('npx', ['tsx', backendPath], {
          stdio: 'inherit',
          env: env,
          cwd: process.cwd()
        });
      } catch (tsxError) {
        console.log('⚠️  tsx not available, trying with ts-node...');
        backend = spawn('npx', ['ts-node', backendPath], {
          stdio: 'inherit',
          env: env,
          cwd: process.cwd()
        });
      }
    }

    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      console.log('💡 Make sure you have bun, tsx, or ts-node installed');
      console.log('💡 Try: npm install -g tsx');
      process.exit(1);
    });

    backend.on('close', (code) => {
      const exitCode = code || 0;
      console.log(`🛑 Backend process exited with code ${exitCode}`);
      if (exitCode !== 0) {
        console.log('💡 Check the error messages above for troubleshooting');
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
    console.log('💡 Make sure you have the required dependencies installed');
    process.exit(1);
  }
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error.message || 'Unknown error');
  process.exit(1);
});