const { spawn } = require('child_process');

console.log('🚀 Starting backend on port 3002...');

// Set environment variable
process.env.PORT = '3002';

// Start the backend using bun directly
const backend = spawn('bun', ['run', 'backend/hono.ts'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3002' }
});

backend.on('error', (error) => {
  console.error('🛑 Failed to start backend:', error.message);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`🛑 Backend process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
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