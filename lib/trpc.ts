import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

// Use a generic type to avoid bundling backend code in frontend
// This prevents bundling issues while still providing basic type safety
type AppRouter = any;

// Polyfill fetch for Node.js environments (simplified)
const ensureFetch = () => {
  if (typeof fetch === 'undefined') {
    console.warn('⚠️ fetch is not available in this environment');
    // For React Native, fetch should always be available
    // This is mainly for Node.js testing environments
  }
};

export const trpc = createTRPCReact<AppRouter>();

export const getBackendBaseUrl = (): string => {
  // Simplified backend URL detection to avoid bundling issues
  const explicitUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (explicitUrl) {
    console.log('🔗 Using EXPO_PUBLIC_BACKEND_URL:', explicitUrl);
    return explicitUrl;
  }

  const backendPort = process.env.EXPO_PUBLIC_BACKEND_PORT || '3001';
  const fallback = `http://localhost:${backendPort}`;
  console.log('🔗 Using backend URL:', fallback);
  return fallback;
};

// Function to detect available backend port
export const detectBackendPort = async (): Promise<number | null> => {
  const ports = [3001, 3002, 3003, 3004, 3005];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        console.log(`✅ Found working backend on port ${port}`);
        return port;
      }
    } catch (error) {
      // Continue to next port
    }
  }
  
  console.log('❌ No working backend found on any port');
  return null;
};

// Test if backend is reachable
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const baseUrl = getBackendBaseUrl();
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend connection test successful:', data);
      return true;
    } else {
      console.error('❌ Backend connection test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Backend connection test error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Backwards-compat helper
const getBaseUrl = getBackendBaseUrl;

// Enhanced error handling for fetch
const handleFetchError = (error: Error, attempt: number, url: string) => {
  // Only log detailed errors on first attempt to avoid spam
  if (attempt === 1) {
    console.error(`❌ tRPC fetch attempt ${attempt} failed:`, error.message);
    console.error(`🔗 URL was:`, url);
    
    if (error.message.includes('Failed to fetch')) {
      console.error('💡 This usually means:');
      console.error(`   1. Backend server is not running on port ${process.env.EXPO_PUBLIC_BACKEND_PORT || '3001'}`);
      console.error('   2. CORS issues (check backend CORS configuration)');
      console.error('   3. Network connectivity issues');
      console.error('   4. Firewall blocking the connection');
      console.error('\n🔧 To fix:');
      console.error('   1. Start backend: node start-backend-working.js');
      console.error('   2. Test connection: node test-trpc-connection-simple.js');
    }
    
    if (error.name === 'AbortError') {
      console.error('💡 Request timed out - backend may be slow or unresponsive');
    }
  } else {
    // Just log basic info for retry attempts
    console.log(`🔄 tRPC retry ${attempt} failed: ${error.message}`);
  }
};

// Robust fetch with retry logic
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Ensure fetch is available
  ensureFetch();
  
  // In React Native, fetch should always be available
  const fetchFn = fetch;
  
  const maxRetries = 2;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 tRPC request attempt ${attempt} to:`, String(input));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced timeout
      
      const response = await fetchFn(input, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...init?.headers,
        },
        mode: 'cors' as RequestMode,
      });
      
      clearTimeout(timeoutId);
      console.log(`✅ tRPC Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`❌ tRPC Error Response Body:`, responseText.substring(0, 500));
        
        // Check if this is a tRPC procedure not found error
        if (responseText.includes('No procedure found on path')) {
          console.error('🔍 tRPC Procedure Error: The requested procedure was not found');
          console.error('💡 Available procedures should include: health, ping, testDatabase, etc.');
          console.error('🔧 Check that the backend tRPC router is properly configured');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown fetch error');
      handleFetchError(lastError, attempt, String(input));
      
      if (attempt === maxRetries) {
        // Only log final failure message once to avoid spam
        if (Math.random() < 0.1) { // Log only 10% of final failures
          console.error('💡 All tRPC fetch attempts failed. Backend may not be running.');
          console.error('🔧 To fix:');
          console.error('   1. Start backend: node start-backend-working.js');
          console.error('   2. Test connection: node test-trpc-connection-simple.js');
        }
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  
  throw lastError || new Error('All fetch attempts failed');
};

const createTRPCClient = () => {
  const baseUrl = getBaseUrl();
  // Use primary tRPC endpoints at /api/trpc
  const trpcUrl = `${baseUrl.replace(/\/$/, '')}/api/trpc`;
  console.log('🔗 tRPC Base URL:', baseUrl);
  console.log('🔗 tRPC Full URL (Primary):', trpcUrl);
  
  // Ensure we're using the correct URL format
  if (!trpcUrl.includes('/api/trpc')) {
    console.error('❌ Invalid tRPC URL format:', trpcUrl);
    throw new Error(`Invalid tRPC URL: ${trpcUrl}. Expected format: http://localhost:PORT/api/trpc`);
  }
  
  // Debug: Log the exact URL that will be used
  console.log('🔍 tRPC client will use URL:', trpcUrl);
  console.log('🔍 Expected health endpoint:', `${trpcUrl}/health`);
  console.log('💡 Using primary tRPC endpoints (/api/trpc) for better compatibility');
  
  return (trpc as any).createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,
        transformer: superjson,
        fetch: customFetch,
        async headers() {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'x-trpc-source': 'react-native',
          };
          
          try {
            // Lazy import supabase to avoid circular dependencies
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.access_token) {
              headers.authorization = `Bearer ${session.access_token}`;
              console.log('✅ Added auth header to tRPC request');
            } else {
              console.log('ℹ️ No auth token available for tRPC request');
            }
          } catch (error) {
            console.error('❌ Error getting auth headers:', error);
          }
          
          return headers;
        },
      }),
    ],
  });
};

// Create a safe tRPC client that handles initialization errors
let _trpcClient: ReturnType<typeof createTRPCClient> | null = null;

const getTRPCClient = () => {
  if (!_trpcClient) {
    try {
      _trpcClient = createTRPCClient();
      console.log('✅ tRPC client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize tRPC client:', error);
      throw error;
    }
  }
  return _trpcClient;
};

// Force recreation of tRPC client to ensure fresh configuration
const createFreshTRPCClient = () => {
  console.log('🔄 Creating fresh tRPC client...');
  _trpcClient = null; // Clear cache
  
  try {
    const client = createTRPCClient();
    console.log('✅ Fresh tRPC client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create fresh tRPC client:', error);
    throw error;
  }
};

// Lazy initialization of tRPC client to avoid bundling issues
let _globalTrpcClient: ReturnType<typeof createTRPCClient> | null = null;

export const trpcClient = new Proxy({} as ReturnType<typeof createTRPCClient>, {
  get(target, prop) {
    if (!_globalTrpcClient) {
      try {
        _globalTrpcClient = createFreshTRPCClient();
        console.log('✅ Global tRPC client initialized lazily');
      } catch (error) {
        console.error('❌ Failed to initialize global tRPC client:', error);
        throw error;
      }
    }
    return _globalTrpcClient[prop as keyof typeof _globalTrpcClient];
  }
});

// Simple health check function with better error handling
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const baseUrl = getBaseUrl();
    // Use root path for health check
    const healthUrl = `${baseUrl}/`;
    console.log('Checking backend health at:', healthUrl);
    
    const response = await customFetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
    const data = await response.json();
    console.log('Backend health check successful:', data);
    return true;
  } catch (error) {
    console.error('Backend health check error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
};

// Test tRPC connection with better error handling
export const testTRPCConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing tRPC connection...');
    const baseUrl = getBaseUrl();
    const trpcUrl = `${baseUrl}/api/trpc`;
    console.log('🔗 tRPC client URL (Primary):', trpcUrl);
    
    // Create a fresh client to avoid any caching issues
    const freshClient = createFreshTRPCClient();
    console.log('🔄 Calling health procedure...');
    const result = await freshClient.health.query();
    console.log('✅ tRPC test successful:', result);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ tRPC connection test failed:', errorMessage);
    console.error('🔍 Full error object:', error);
    
    // Provide more specific error information
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network request failed')) {
      console.error('🌐 Network issue detected - check if backend is running');
    } else if (errorMessage.includes('timeout')) {
      console.error('⏱️ Request timeout - backend may be slow');
    } else if (errorMessage.includes('HTML instead of JSON')) {
      console.error('🔀 Backend routing issue - tRPC endpoint not found');
    } else if (errorMessage.includes('No procedure found')) {
      console.error('🔍 tRPC procedure not found - check backend router configuration');
      console.error('📋 Available procedures should include: health, ping, testDatabase, etc.');
      console.error('🔧 Make sure the backend is using /api/trpc as the base path');
      console.error('💡 Try running: node test-trpc-connection-simple.js');
      console.error('🔍 Backend should have procedures at: health, ping, testDatabase, etc.');
    }
    
    return false;
  }
};

// Comprehensive backend health check
export const runBackendHealthChecks = async () => {
  const results = {
    backend: false,
    trpc: false,
    database: false,
    groupTables: false,
    errors: [] as string[]
  };

  try {
    // Test basic backend health
    const backendHealth = await checkBackendHealth();
    results.backend = backendHealth;
    if (!backendHealth) {
      results.errors.push('Backend health check failed');
    }
  } catch (error) {
    results.errors.push(`Backend health error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test tRPC connection
    const trpcHealth = await testTRPCConnection();
    results.trpc = trpcHealth;
    if (!trpcHealth) {
      results.errors.push('tRPC connection failed');
    }
  } catch (error) {
    results.errors.push(`tRPC error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test database connection
    const dbTest = await safeTrpcClient.testDatabase();
    results.database = dbTest.success;
    if (!dbTest.success) {
      results.errors.push(`Database test failed: ${dbTest.error}`);
    }
  } catch (error) {
    results.errors.push(`Database test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Test group tables
    const groupTest = await safeTrpcClient.testGroupTables();
    results.groupTables = groupTest.success;
    if (!groupTest.success) {
      results.errors.push(`Group tables test failed: ${groupTest.error}`);
    }
  } catch (error) {
    results.errors.push(`Group tables test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('Backend health check results:', results);
  return results;
};

// Create a simple tRPC client that doesn't throw on connection errors
export const safeTrpcClient = {
  async testConnection() {
    try {
      console.log('🔍 Testing tRPC connection via safeTrpcClient...');
      // Use a fresh client to avoid caching issues
      const freshClient = createFreshTRPCClient();
      console.log('🔄 Calling health procedure...');
      const result = await freshClient.health.query();
      console.log('✅ tRPC connection test successful:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ tRPC connection test failed:', error);
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  },
  
  async testDatabase() {
    try {
      console.log('🔍 Testing database connection...');
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.testDatabase.query();
      console.log('✅ Database test successful:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ tRPC database test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Database test failed' };
    }
  },
  
  async testGroupTables() {
    try {
      console.log('🔍 Testing group tables...');
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.testGroupTables.query();
      console.log('✅ Group tables test successful:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ tRPC group tables test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Group tables test failed' };
    }
  },
  
  async createChat(otherUserId: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.create.mutate({ otherUserId });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC create chat failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create chat' };
    }
  },
  
  async getChats() {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.getChats.query();
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get chats failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get chats' };
    }
  },
  
  async getFriends() {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.getFriends.query();
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get friends failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get friends' };
    }
  },
  
  async getMessages(chatId: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.getMessages.query({ chatId });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get messages failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get messages' };
    }
  },
  
  async sendMessage(chatId: string, content: string, messageType: 'text' | 'image' | 'snap' | 'audio' = 'text', mediaUrl?: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.sendMessage.mutate({ chatId, content, messageType, mediaUrl });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC send message failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  },
  
  async markAsRead(chatId: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.markAsRead.mutate({ chatId });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC mark as read failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to mark as read' };
    }
  },
  
  async setTypingStatus(chatId: string, isTyping: boolean) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.setTypingStatus.mutate({ chatId, isTyping });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC set typing status failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to set typing status' };
    }
  },
  
  async getTypingStatus(chatId?: string, groupId?: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.getTypingStatus.query({ chatId, groupId });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get typing status failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get typing status' };
    }
  },
  
  // Group chat methods
  async getGroupChats() {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.group.getGroupChats.query();
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get group chats failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get group chats' };
    }
  },
  
  async createGroupChat(name: string, description?: string, memberIds: string[] = []) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.group.createGroupChat.mutate({ name, description, memberIds });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC create group chat failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create group chat' };
    }
  },
  
  async getGroupMessages(groupId: string, limit = 50, offset = 0) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.group.getGroupMessages.query({ groupId, limit, offset });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get group messages failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get group messages' };
    }
  },
  
  async sendGroupMessage(groupId: string, content: string, messageType: 'text' | 'image' | 'snap' | 'audio' | 'system' = 'text', mediaUrl?: string, replyToId?: string) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.group.sendGroupMessage.mutate({ groupId, content, messageType, mediaUrl, replyToId });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC send group message failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send group message' };
    }
  },
  
  async setGroupTypingStatus(groupId: string, isTyping: boolean) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.chat.setTypingStatus.mutate({ groupId, isTyping });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC set group typing status failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to set group typing status' };
    }
  },
  
  // Call methods
  async createCall(receiverId?: string, groupId?: string, callType: 'voice' | 'video' = 'voice', isGroupCall = false) {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.callRoutes.create.mutate({ receiverId, groupId, callType, isGroupCall });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC create call failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create call' };
    }
  },
  
  async updateCallStatus(callId: string, status: 'calling' | 'answered' | 'declined' | 'ended' | 'missed') {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.callRoutes.updateStatus.mutate({ callId, status });
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC update call status failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update call status' };
    }
  },
  
  async getCalls() {
    try {
      const freshClient = createFreshTRPCClient();
      const result = await freshClient.callRoutes.getCalls.query();
      return { success: true, data: result };
    } catch (error) {
      console.error('tRPC get calls failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get calls' };
    }
  }
};

// Export a function to recreate the tRPC client
export const recreateTRPCClient = () => {
  console.log('🔄 Recreating tRPC client with fresh configuration...');
  return createFreshTRPCClient();
};