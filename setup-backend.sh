#!/bin/bash

echo "🔧 Making backend startup scripts executable..."

# Make scripts executable
chmod +x start-backend-ultimate.js
chmod +x test-backend-ultimate.js

echo "✅ Scripts are now executable"
echo ""
echo "🚀 To start the backend, run:"
echo "   node start-backend-ultimate.js"
echo ""
echo "🔍 To test the backend, run:"
echo "   node test-backend-ultimate.js"
echo ""
echo "💡 The ultimate startup script will:"
echo "   1. Aggressively kill any existing backend processes"
echo "   2. Find an available port (3001-3011)"
echo "   3. Update .env.local with the correct port"
echo "   4. Start the backend with Bun"
echo "   5. Test the connection"
echo "   6. Handle graceful shutdown on Ctrl+C"