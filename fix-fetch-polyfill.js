#!/usr/bin/env node

// Script to add fetch polyfill to all test files
const fs = require('fs');
const path = require('path');


const polyfillCode = `// Add fetch polyfill for Node.js < 18
if (!globalThis.fetch) {
  try {
    const { fetch, Headers, Request, Response } = require('undici');
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
  } catch (_error) {
    console.error('❌ fetch is not available. Please install undici: npm install undici');
    process.exit(1);
  }
}

`;

// Find all JS files that use fetch
const testFiles = [
  'test-backend-ultimate.js',
  'test-backend-quick.js',
  'test-trpc-working.js',
  'test-trpc-connection.js',
  'test-all-endpoints.js',
  'fix-trpc-complete.js',
  'fix-backend-complete.js',
  'test-trpc-connection-simple.js',
  'test-trpc-fix.js'
];

console.log('🔧 Adding fetch polyfill to test files...');

for (const filename of testFiles) {
  const filePath = path.join(process.cwd(), filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if polyfill already exists
      if (content.includes('globalThis.fetch')) {
        console.log(`✅ ${filename} already has fetch polyfill`);
        continue;
      }
      
      // Check if file uses fetch
      if (!content.includes('fetch(')) {
        console.log(`⏭️  ${filename} doesn't use fetch, skipping`);
        continue;
      }
      
      // Find the first require or import after shebang
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Skip shebang
      if (lines[0].startsWith('#!')) {
        insertIndex = 1;
      }
      
      // Skip empty lines
      while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
        insertIndex++;
      }
      
      // Insert polyfill
      lines.splice(insertIndex, 0, '', polyfillCode.trim());
      
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent);
      
      console.log(`✅ Added fetch polyfill to ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error.message);
    }
  } else {
    console.log(`⏭️  ${filename} not found, skipping`);
  }
}

console.log('\n🎉 Fetch polyfill setup complete!');
console.log('💡 Now you can run test scripts without fetch errors');