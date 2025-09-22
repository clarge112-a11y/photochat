#!/usr/bin/env node

// Debug tRPC URL configuration
console.log('🔍 Debugging tRPC URL configuration...');

// Simulate the environment
process.env.EXPO_PUBLIC_BACKEND_PORT = '3001';

// Test the URL generation logic
function getBackendBaseUrl() {
  const backendPort = process.env.EXPO_PUBLIC_BACKEND_PORT || '3001';
  const devUrl = `http://localhost:${backendPort}`;
  console.log('🔗 Using backend server:', devUrl);
  console.log('🔗 Backend port from env:', process.env.EXPO_PUBLIC_BACKEND_PORT);
  return devUrl;
}

const baseUrl = getBackendBaseUrl();
const trpcUrl = `${baseUrl}/api/trpc`;

console.log('📋 Configuration:');
console.log('  Base URL:', baseUrl);
console.log('  tRPC URL:', trpcUrl);
console.log('  Health endpoint:', `${trpcUrl}/health`);

// Test the actual URL that would be used
const healthQuery = {
  json: null,
  meta: {
    values: ['undefined']
  }
};

const queryString = encodeURIComponent(JSON.stringify(healthQuery));
const fullHealthUrl = `${trpcUrl}/health?input=${queryString}`;

console.log('  Full health URL:', fullHealthUrl);

// Test if the URL is correctly formatted
if (trpcUrl.includes('/api/trpc')) {
  console.log('✅ tRPC URL format is correct');
} else {
  console.log('❌ tRPC URL format is incorrect');
}

console.log('\n💡 The client should be making requests to:', trpcUrl);
console.log('💡 Health check should go to:', `${trpcUrl}/health`);