#!/usr/bin/env node

const SUPABASE_URL = 'https://ypumvyhwtpscevoqgcat.supabase.co';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    console.log('1️⃣ Testing basic connectivity...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdW12eWh3dHBzY2V2b3FnY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTAwNTYsImV4cCI6MjA3MzY4NjA1Nn0.oiKFbAhKLmdjZ72rPJ_ExeZLk6-b3CEyduUfSRZl9z8',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok || response.status === 404 || response.status === 401) {
      console.log('   ✅ Supabase is reachable!\n');
    } else {
      console.log('   ⚠️  Unexpected response\n');
    }

    console.log('2️⃣ Testing auth endpoint...');
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
    });

    console.log(`   Status: ${authResponse.status} ${authResponse.statusText}`);
    
    if (authResponse.ok) {
      const health = await authResponse.json();
      console.log('   ✅ Auth service is healthy!');
      console.log('   📋 Health data:', health);
    } else {
      console.log('   ⚠️  Auth service returned:', authResponse.status);
    }

    console.log('\n✅ Connection test complete!');
    console.log('\n💡 If you see this message, Supabase is accessible from your network.');
    console.log('💡 The "Failed to fetch" error in the app might be due to:');
    console.log('   1. CORS issues (web only)');
    console.log('   2. App-specific network configuration');
    console.log('   3. Incorrect credentials');

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\n💡 This means:');
    console.error('   1. No internet connection');
    console.error('   2. Firewall blocking Supabase');
    console.error('   3. DNS resolution issues');
    console.error('   4. The Supabase URL is incorrect');
  }
}

testSupabaseConnection();
