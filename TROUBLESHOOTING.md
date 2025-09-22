# Troubleshooting Guide

This guide addresses common issues with the chat app and provides solutions.

## Database Issues

### 1. Policy Recursion Errors

**Error Messages:**
- `infinite recursion detected in policy for relation "group_members"`
- `infinite recursion detected in policy for relation "group_chats"`

**Cause:** The database policies were referencing each other in a circular manner.

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Policies
3. Delete all policies for these tables:
   - `group_chats`
   - `group_members` 
   - `group_messages`
4. Go to SQL Editor
5. Run the complete `database-schema.sql` file

The updated schema includes non-recursive policies that fix this issue.

### 2. Missing Database Columns

**Error Messages:**
- `Could not find the 'last_message_type' column of 'chats' in the schema cache`
- `relation "group_chats" does not exist`

**Cause:** Database schema is incomplete or outdated.

**Solution:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire `database-schema.sql` file
3. Execute the SQL script
4. Verify all tables were created in the Table Editor

### 3. Database Connection Test Failed

**Error Messages:**
- `Database connection test failed: [object Object]`
- `Error fetching user group memberships`

**Cause:** Database credentials are incorrect or Supabase project is inactive.

**Solution:**
1. Check your Supabase project status
2. Verify credentials in `lib/supabase.ts`:
   ```typescript
   const supabaseUrl = 'https://your-project.supabase.co';
   const supabaseAnonKey = 'your-anon-key';
   ```
3. Test connection in Supabase Dashboard
4. Ensure your project has not been paused

## Backend Connection Issues

### 1. tRPC Connection Failed

**Error Messages:**
- `tRPC connection test failed: TRPCClientError: Network connection failed`
- `Failed to fetch`
- `tRPC fetch error: TypeError: Failed to fetch`

**Cause:** Backend server is not responding or network issues.

**Solution:**
The app includes automatic fallbacks, but you can:
1. Check your internet connection
2. Verify the backend URL in `lib/trpc.ts`
3. The app will work offline with local storage
4. Backend health is checked automatically

### 2. Backend May Be Unavailable

**Error Messages:**
- `Network connection failed - backend may be unavailable`
- `Backend health check failed`

**Cause:** The tRPC backend server is not running or unreachable.

**Solution:**
1. The app is designed to work without the backend
2. All core features (messaging, chats) work offline
3. Data is stored locally and synced when backend is available
4. No action required - this is expected behavior

## App-Specific Issues

### 1. Group Chats Not Loading

**Error Messages:**
- `Error fetching group chats: Failed to fetch group memberships`
- `Database policy recursion detected`

**Solution:**
1. Apply the database schema fixes (see Database Issues above)
2. Clear app data and restart
3. Check console logs for specific errors

### 2. Messages Not Sending

**Symptoms:**
- Messages appear to send but don't persist
- Other users don't receive messages

**Solution:**
1. Check database connection
2. Verify message table exists in Supabase
3. Messages work locally even without database
4. Will sync when connection is restored

### 3. Authentication Issues

**Error Messages:**
- `Not authenticated`
- `User not found`

**Solution:**
1. Check Supabase Auth configuration
2. Verify user profiles table exists
3. Ensure RLS policies allow user operations
4. Try logging out and back in

## Development Issues

### 1. App Won't Start

**Error Messages:**
- Build errors
- Module not found errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
bunx expo start --clear
```

### 2. TypeScript Errors

**Common Issues:**
- Type mismatches
- Missing imports

**Solution:**
1. Check that all dependencies are installed
2. Restart TypeScript server in your editor
3. Verify import paths are correct

### 3. Expo Go Issues

**Symptoms:**
- App crashes in Expo Go
- Features not working

**Solution:**
1. Some features require custom development builds
2. Use web preview for testing: `bun run start-web`
3. Check Expo Go compatibility in documentation

## Quick Fixes

### Reset Everything

If you're experiencing multiple issues:

1. **Database Reset:**
   - Go to Supabase Dashboard
   - Delete all tables in Table Editor
   - Run `database-schema.sql` completely

2. **App Reset:**
   ```bash
   rm -rf node_modules
   bun install
   bunx expo start --clear
   ```

3. **Clear App Data:**
   - Delete app from device/simulator
   - Reinstall via Expo Go or development build

### Verify Setup

1. **Check Database:**
   - All tables exist in Supabase Table Editor
   - RLS policies are enabled
   - No policy recursion errors

2. **Check App:**
   - Console shows successful database connection
   - No TypeScript errors
   - App loads without crashes

3. **Test Features:**
   - Can create account/login
   - Can send messages
   - Can create chats
   - Group features work

## Getting Help

If issues persist:

1. **Check Console Logs:** Look for specific error messages
2. **Verify Database Schema:** Ensure all tables and policies are correct
3. **Test Step by Step:** Isolate which features are failing
4. **Check Network:** Ensure internet connectivity
5. **Try Web Version:** Use `bun run start-web` to test in browser

## Prevention

To avoid future issues:

1. **Always run complete database schema** when updating
2. **Keep dependencies updated** with `bun update`
3. **Test in multiple environments** (device, simulator, web)
4. **Monitor console logs** during development
5. **Backup database** before making schema changes

The app is designed to be resilient and work offline, so most issues are non-blocking and will resolve automatically when connectivity is restored.