-- Fix database policy recursion issues
-- Run this SQL in your Supabase SQL editor

-- First, disable RLS on all group tables to clear any problematic policies
ALTER TABLE group_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view groups they created" ON group_chats;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON group_chats;
DROP POLICY IF EXISTS "Users can view groups they are members of or created" ON group_chats;
DROP POLICY IF EXISTS "Users can create group chats" ON group_chats;
DROP POLICY IF EXISTS "Group creators can update group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can view their own membership" ON group_members;
DROP POLICY IF EXISTS "Group creators can view all members" ON group_members;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can manage members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can update members" ON group_members;
DROP POLICY IF EXISTS "Group creators and users can delete members" ON group_members;
DROP POLICY IF EXISTS "Users can view all group chats" ON group_chats;
DROP POLICY IF EXISTS "Users can view all group members" ON group_members;
DROP POLICY IF EXISTS "Users can view group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can send group messages" ON group_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_chats;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_chats;
DROP POLICY IF EXISTS "Enable update for creators only" ON group_chats;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_members;
DROP POLICY IF EXISTS "Enable delete for users themselves" ON group_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON group_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON group_messages;
DROP POLICY IF EXISTS "group_chats_select_policy" ON group_chats;
DROP POLICY IF EXISTS "group_members_select_policy" ON group_members;
DROP POLICY IF EXISTS "group_messages_select_policy" ON group_messages;
DROP POLICY IF EXISTS "group_chats_select_all" ON group_chats;
DROP POLICY IF EXISTS "group_chats_insert_creator" ON group_chats;
DROP POLICY IF EXISTS "group_chats_update_creator" ON group_chats;
DROP POLICY IF EXISTS "group_members_select_all" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_self" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_self" ON group_members;
DROP POLICY IF EXISTS "group_messages_select_all" ON group_messages;
DROP POLICY IF EXISTS "group_messages_insert_sender" ON group_messages;
DROP POLICY IF EXISTS "group_chats_allow_all_select" ON group_chats;
DROP POLICY IF EXISTS "group_chats_public_select" ON group_chats;
DROP POLICY IF EXISTS "group_chats_authenticated_insert" ON group_chats;
DROP POLICY IF EXISTS "group_chats_creator_update" ON group_chats;
DROP POLICY IF EXISTS "group_members_public_select" ON group_members;
DROP POLICY IF EXISTS "group_members_authenticated_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_self_delete" ON group_members;
DROP POLICY IF EXISTS "group_messages_public_select" ON group_messages;
DROP POLICY IF EXISTS "group_messages_authenticated_insert" ON group_messages;

-- Re-enable RLS with simple, non-recursive policies
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for group_chats
CREATE POLICY "group_chats_public_select" ON group_chats FOR SELECT USING (true);
CREATE POLICY "group_chats_authenticated_insert" ON group_chats FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "group_chats_creator_update" ON group_chats FOR UPDATE USING (auth.uid() = created_by);

-- Create simple, non-recursive policies for group_members
CREATE POLICY "group_members_public_select" ON group_members FOR SELECT USING (true);
CREATE POLICY "group_members_authenticated_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "group_members_self_delete" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Create simple, non-recursive policies for group_messages
CREATE POLICY "group_messages_public_select" ON group_messages FOR SELECT USING (true);
CREATE POLICY "group_messages_authenticated_insert" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Clean up old typing status entries (older than 1 minute)
DELETE FROM typing_status WHERE updated_at < NOW() - INTERVAL '1 minute';

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('group_chats', 'group_members', 'group_messages')
ORDER BY tablename, policyname;