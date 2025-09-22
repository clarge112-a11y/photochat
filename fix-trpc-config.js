#!/usr/bin/env node

// Fix tRPC client configuration
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing tRPC client configuration...');

const trpcFilePath = path.join(process.cwd(), 'lib', 'trpc.ts');

console.log('📁 Reading tRPC file:', trpcFilePath);

try {
  let content = fs.readFileSync(trpcFilePath, 'utf8');
  
  console.log('🔍 Current tRPC URL configuration:');
  
  // Find the current URL configuration
  const urlMatch = content.match(/const trpcUrl = `\${baseUrl}\/([^`]+)`/);
  if (urlMatch) {
    console.log('   Current path:', urlMatch[1]);
  }
  
  // Ensure the URL uses /api/trpc
  if (!content.includes('${baseUrl}/api/trpc')) {
    console.log('❌ tRPC URL is not using /api/trpc path');
    
    // Fix the URL
    content = content.replace(
      /const trpcUrl = `\${baseUrl}\/[^`]+`;/g,
      'const trpcUrl = `${baseUrl}/api/trpc`;'
    );
    
    fs.writeFileSync(trpcFilePath, content);
    console.log('✅ Fixed tRPC URL to use /api/trpc');
  } else {
    console.log('✅ tRPC URL is already correctly configured to use /api/trpc');
  }
  
  // Check for any hardcoded URLs that might be wrong
  const hardcodedUrls = content.match(/http:\/\/localhost:\d+\/[^\s"'`]+/g);
  if (hardcodedUrls) {
    console.log('⚠️  Found hardcoded URLs:', hardcodedUrls);
  }
  
  console.log('✅ tRPC client configuration check complete');
  
} catch (error) {
  console.error('❌ Error reading/writing tRPC file:', error.message);
  process.exit(1);
}

console.log('\n💡 Next steps:');
console.log('   1. Start the backend: node start-backend-and-test.js');
console.log('   2. Test endpoints: node test-all-endpoints.js');
console.log('   3. Start your Expo app');