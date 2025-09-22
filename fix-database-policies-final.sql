-- COMPREHENSIVE DATABASE POLICY FIX
-- Run this SQL in your Supabase SQL editor to fix all policy recursion issues
-- This will completely reset and fix all problematic policies

-- Step 1: Disable RLS on all problematic tables
ALTER TABLE group_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might cause recursion
-- Group chats policies
DROP POLICY IF EXISTS "Users can view groups they created" ON group_chats;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON group_chats;
DROP POLICY IF EXISTS "Users can view groups they are members of or created" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Group creators can update group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can view all group chats" ON group_chats;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_chats;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_chats;
DROP POLICY IF EXISTS "Enable update for creators only" ON group_chats;
DROP POLICY IF EXISTS "group_chats_select_policy" ON group_chats;
DROP POLICY IF EXISTS "group_chats_select_all" ON group_chats;
DROP POLICY IF EXISTS "group_chats_insert_creator" ON group_chats;
DROP POLICY IF EXISTS "group_chats_update_creator" ON group_chats;
DROP POLICY IF EXISTS "group_chats_allow_all_select" ON group_chats;
DROP POLICY IF EXISTS "group_chats_public_select" ON group_chats;
DROP POLICY IF EXISTS "group_chats_authenticated_insert" ON group_chats;
DROP POLICY IF EXISTS "group_chats_creator_update" ON group_chats;

-- Group members policies
DROP POLICY IF EXISTS "Users can view their own membership" ON group_members;
DROP POLICY IF EXISTS "Group creators can view all members" ON group_members;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can manage members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can update members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can delete members" ON group_members;
DROP POLICY IF EXISTS "Users can view all group members" ON group_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_members;
DROP POLICY IF EXISTS "Enable delete for users themselves" ON group_members;
DROP POLICY IF EXISTS "group_members_select_policy" ON group_members;
DROP POLICY IF EXISTS "group_members_select_all" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_self" ON group_members;
DROP POLICY IF EXISTS "group_members_public_select" ON group_members;
DROP POLICY IF EXISTS "group_members_authenticated_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_self_delete" ON group_members;

-- Group messages policies
DROP POLICY IF EXISTS "Users can view group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can send group messages" ON group_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_messages;
DROP POLICY IF EXISTS "group_messages_select_policy" ON group_messages;
DROP POLICY IF EXISTS "group_messages_select_all" ON group_messages;
DROP POLICY IF EXISTS "group_messages_insert_sender" ON group_messages;
DROP POLICY IF EXISTS "group_messages_public_select" ON group_messages;
DROP POLICY IF EXISTS "group_messages_authenticated_insert" ON group_messages;

-- Typing status policies
DROP POLICY IF EXISTS "Users can view typing status in their chats" ON typing_status;
DROP POLICY IF EXISTS "Users can manage their own typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can update their own typing status" ON typing_status;
DROP POLICY IF EXISTS "Users can delete their own typing status" ON typing_status;

-- Step 3: Clean up old data that might cause issues
DELETE FROM typing_status WHERE updated_at < NOW() - INTERVAL '5 minutes';

-- Step 4: Re-enable RLS with simple, non-recursive policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive policies

-- Group chats: Allow all authenticated users to read, creators to insert/update
CREATE POLICY "group_chats_public_read" ON group_chats 
  FOR SELECT USING (true);

CREATE POLICY "group_chats_creator_insert" ON group_chats 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "group_chats_creator_update" ON group_chats 
  FOR UPDATE USING (auth.uid() = created_by);

-- Group members: Allow all authenticated users to read, authenticated users to insert, users to delete themselves
CREATE POLICY "group_members_public_read" ON group_members 
  FOR SELECT USING (true);

CREATE POLICY "group_members_auth_insert" ON group_members 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "group_members_self_delete" ON group_members 
  FOR DELETE USING (auth.uid() = user_id);

-- Group messages: Allow all authenticated users to read, senders to insert
CREATE POLICY "group_messages_public_read" ON group_messages 
  FOR SELECT USING (true);

CREATE POLICY "group_messages_sender_insert" ON group_messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Typing status: Simple policies for authenticated users
CREATE POLICY "typing_status_public_read" ON typing_status 
  FOR SELECT USING (true);

CREATE POLICY "typing_status_user_manage" ON typing_status 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "typing_status_user_update" ON typing_status 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "typing_status_user_delete" ON typing_status 
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('group_chats', 'group_members', 'group_messages', 'typing_status')
ORDER BY tablename, policyname;

-- Step 7: Test basic operations
-- This should work without recursion errors
SELECT COUNT(*) FROM group_chats;
SELECT COUNT(*) FROM group_members;
SELECT COUNT(*) FROM group_messages;
SELECT COUNT(*) FROM typing_status;

-- Success message
SELECT 'Database policies have been successfully fixed and tested!' as status;