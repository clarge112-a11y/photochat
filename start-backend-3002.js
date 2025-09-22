const { spawn } = require('child_process');
const { execSync } = require('child_process');

console.log('🚀 Starting backend on port 3002...');

// Function to check if port is in use
function checkPort(port) {
  try {
    const result = execSync(`netstat -an | grep :${port}`, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    // netstat command failed or port not found
    return false;
  }
}

// Function to kill process on port
function killPort(port) {
  try {
    // Try different methods to kill processes on the port
    try {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`🛑 Killed existing process on port ${port}`);
    } catch (e) {
      // lsof might not be available, try netstat approach
      try {
        const result = execSync(`netstat -tulpn | grep :${port}`, { encoding: 'utf8' });
        const lines = result.split('\n');
        for (const line of lines) {
          const match = line.match(/(\d+)\/\w+$/);
          if (match) {
            const pid = match[1];
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`🛑 Killed process ${pid} on port ${port}`);
          }
        }
      } catch (e2) {
        console.log(`⚠️  Could not kill processes on port ${port}, continuing anyway...`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Could not kill processes on port ${port}:`, error.message);
  }
}

// Check and kill existing processes on port 3002
if (checkPort(3002)) {
  console.log('🔍 Port 3002 is in use, attempting to free it...');
  killPort(3002);
  // Wait a moment for the port to be freed
  setTimeout(() => {
    startBackend();
  }, 2000);
} else {
  console.log('✅ Port 3002 is available');
  startBackend();
}

function startBackend() {
  console.log('🌐 Starting backend server on port 3002...');
  
  // Set environment variable
  process.env.PORT = '3002';
  
  // Start the backend using bun
  const backend = spawn('bun', ['backend/hono.ts'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3002' }
  });
  
  backend.on('error', (error) => {
    console.error('🛑 Failed to start backend:', error.message);
    
    // Fallback to node if bun fails
    console.log('🔄 Trying with node + tsx...');
    const nodeBackend = spawn('npx', ['tsx', 'backend/hono.ts'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3002' }
    });
    
    nodeBackend.on('error', (nodeError) => {
      console.error('🛑 Node fallback also failed:', nodeError.message);
      process.exit(1);
    });
    
    nodeBackend.on('exit', (code) => {
      console.log(`🛑 Backend process exited with code ${code}`);
      process.exit(code);
    });
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
}