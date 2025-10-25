const supabaseUrl = 'https://ypumvyhwtpscevoqgcat.supabase.co';

async function testSupabase() {
  console.log('🔍 Testing Supabase connectivity...');
  console.log('🌐 URL:', supabaseUrl);
  
  try {
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('   Status:', healthResponse.status);
    console.log('   OK:', healthResponse.ok);
    const healthData = await healthResponse.text();
    console.log('   Response:', healthData);
  } catch (error) {
    console.error('   ❌ Health check failed:', error.message);
  }
  
  try {
    console.log('\n2️⃣ Testing base URL...');
    const baseResponse = await fetch(supabaseUrl, {
      method: 'GET',
    });
    console.log('   Status:', baseResponse.status);
    console.log('   OK:', baseResponse.ok);
  } catch (error) {
    console.error('   ❌ Base URL test failed:', error.message);
  }
  
  try {
    console.log('\n3️⃣ Testing REST API...');
    const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdW12eWh3dHBzY2V2b3FnY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTAwNTYsImV4cCI6MjA3MzY4NjA1Nn0.oiKFbAhKLmdjZ72rPJ_ExeZLk6-b3CEyduUfSRZl9z8',
      },
    });
    console.log('   Status:', restResponse.status);
    console.log('   OK:', restResponse.ok);
  } catch (error) {
    console.error('   ❌ REST API test failed:', error.message);
  }
  
  console.log('\n✅ Test complete');
}

testSupabase().catch(console.error);
