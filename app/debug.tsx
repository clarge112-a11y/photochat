import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { safeTrpcClient, checkBackendHealth, testTRPCConnection, getBackendBaseUrl } from '@/lib/trpc';
import { useState } from 'react';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

export default function DebugScreen() {
  const router = useRouter();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runTests = async () => {
    setIsLoading(true);
    const testResults: TestResult[] = [];

    // Test direct backend connection
    try {
      const baseUrl = getBackendBaseUrl();
      console.log('Testing backend at:', `${baseUrl}/`);
      
      const response = await fetch(`${baseUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('Backend response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Backend response data:', data);
        testResults.push({
          name: 'Direct Backend Fetch',
          success: true,
          data: data
        });
      } else {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        testResults.push({
          name: 'Direct Backend Fetch',
          success: false,
          error: `${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`
        });
      }
    } catch (error) {
      console.error('Backend fetch error:', error);
      testResults.push({
        name: 'Direct Backend Fetch',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test tRPC router endpoint directly
    try {
      const baseUrl = getBackendBaseUrl();
      console.log('Testing tRPC router at:', `${baseUrl}/test-trpc`);
      
      const response = await fetch(`${baseUrl}/test-trpc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('tRPC router response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('tRPC router response data:', data);
        testResults.push({
          name: 'Direct tRPC Router Test',
          success: true,
          data: data
        });
      } else {
        const errorText = await response.text();
        console.error('tRPC router error response:', errorText);
        testResults.push({
          name: 'Direct tRPC Router Test',
          success: false,
          error: `${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`
        });
      }
    } catch (error) {
      console.error('tRPC router fetch error:', error);
      testResults.push({
        name: 'Direct tRPC Router Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test tRPC health endpoint directly
    try {
      const baseUrl = getBackendBaseUrl();
      const trpcHealthUrl = `${baseUrl}/api/trpc/health?input=%7B%22json%22%3Anull%7D`;
      console.log('Testing tRPC health at:', trpcHealthUrl);
      
      const response = await fetch(trpcHealthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('tRPC health response status:', response.status, response.statusText);
      console.log('tRPC health response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('tRPC health response data:', data);
        testResults.push({
          name: 'Direct tRPC Health Endpoint',
          success: true,
          data: data
        });
      } else {
        const errorText = await response.text();
        console.error('tRPC health error response:', errorText);
        testResults.push({
          name: 'Direct tRPC Health Endpoint',
          success: false,
          error: `${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`
        });
      }
    } catch (error) {
      console.error('tRPC health fetch error:', error);
      testResults.push({
        name: 'Direct tRPC Health Endpoint',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test backend health function
    try {
      const result = await checkBackendHealth();
      testResults.push({
        name: 'Backend Health Check',
        success: result,
        error: result ? undefined : 'Backend health check failed'
      });
    } catch (error) {
      testResults.push({
        name: 'Backend Health Check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test tRPC connection
    try {
      const result = await testTRPCConnection();
      testResults.push({
        name: 'tRPC Connection Test',
        success: result,
        error: result ? undefined : 'tRPC connection failed'
      });
    } catch (error) {
      testResults.push({
        name: 'tRPC Connection Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test tRPC safe client
    try {
      const result = await safeTrpcClient.testConnection();
      testResults.push({
        name: 'tRPC Safe Client',
        success: result.success,
        error: result.error,
        data: result.data
      });
    } catch (error) {
      testResults.push({
        name: 'tRPC Safe Client',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test database
    try {
      const result = await safeTrpcClient.testDatabase();
      testResults.push({
        name: 'Database Test',
        success: result.success,
        error: result.error,
        data: result.data
      });
    } catch (error) {
      testResults.push({
        name: 'Database Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test group tables
    try {
      const result = await safeTrpcClient.testGroupTables();
      testResults.push({
        name: 'Group Tables Test',
        success: result.success,
        error: result.error,
        data: result.data
      });
    } catch (error) {
      testResults.push({
        name: 'Group Tables Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test Supabase directly
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      testResults.push({
        name: 'Direct Supabase Test',
        success: !error,
        error: error?.message,
        data: data
      });
    } catch (error) {
      testResults.push({
        name: 'Direct Supabase Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setResults(testResults);
    setIsLoading(false);
  };

  const showDatabaseFixSQL = () => {
    const sqlFix = `-- Run this SQL in your Supabase SQL editor to fix policy recursion:

-- First, drop all existing policies that might cause recursion
DO $ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on group_chats
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'group_chats'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.schemaname || '.' || policy_record.tablename;
    END LOOP;
    
    -- Drop all policies on group_members
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'group_members'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.schemaname || '.' || policy_record.tablename;
    END LOOP;
    
    -- Drop all policies on group_messages
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'group_messages'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.schemaname || '.' || policy_record.tablename;
    END LOOP;
    
    -- Drop all policies on typing_status
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'typing_status'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.schemaname || '.' || policy_record.tablename;
    END LOOP;
END $;

-- Disable RLS on problematic tables to prevent recursion
ALTER TABLE group_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions for authenticated users
GRANT ALL ON group_chats TO authenticated;
GRANT ALL ON group_members TO authenticated;
GRANT ALL ON group_messages TO authenticated;
GRANT ALL ON typing_status TO authenticated;

-- Ensure typing_status table exists with correct structure
CREATE TABLE IF NOT EXISTS typing_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  group_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id),
  UNIQUE(group_id, user_id),
  CHECK (
    (chat_id IS NOT NULL AND group_id IS NULL) OR
    (chat_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Clean up any old typing status entries
DELETE FROM typing_status WHERE updated_at < NOW() - INTERVAL '5 minutes';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_typing_status_chat ON typing_status(chat_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_group ON typing_status(group_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_user ON typing_status(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_updated_at ON typing_status(updated_at);`;
    
    Alert.alert(
      'Database Fix SQL',
      'The SQL has been logged to the console. Copy it from the browser console and run it in your Supabase SQL editor to fix database policy recursion issues.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
    
    console.log('\n=== DATABASE FIX SQL ===');
    console.log('Copy the SQL below and run it in your Supabase SQL editor:');
    console.log('\n' + sqlFix);
    console.log('\n=== END DATABASE FIX SQL ===\n');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Backend Debug' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Backend Debug Console</Text>
          <TouchableOpacity 
            style={[styles.button, styles.testButton]} 
            onPress={runTests}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.fixButton]} 
            onPress={showDatabaseFixSQL}
          >
            <Text style={styles.buttonText}>Show Database Fix SQL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsContainer}>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={[styles.resultStatus, { color: result.success ? 'green' : 'red' }]}>
                  {result.success ? '✅ PASS' : '❌ FAIL'}
                </Text>
              </View>
              {result.error && (
                <Text style={styles.errorText}>Error: {result.error}</Text>
              )}
              {result.data && (
                <Text style={styles.dataText}>
                  Data: {JSON.stringify(result.data, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, styles.backButton]} 
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    marginBottom: 10,
  },
  fixButton: {
    backgroundColor: '#FF9500',
  },
  backButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    padding: 20,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'monospace',
  },
  dataText: {
    color: 'green',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'monospace',
  },
  footer: {
    padding: 20,
  },
});