import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface GroupChat {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  is_active: boolean;
  max_members: number;
  last_message: string | null;
  last_message_time: string | null;
  last_message_type: 'text' | 'image' | 'snap' | 'audio' | 'system' | null;
  member_count: number;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_muted: boolean;
  user: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'snap' | 'audio' | 'system';
  media_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  sender: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  reply_to?: GroupMessage;
}

interface GroupChatStore {
  groupChats: GroupChat[];
  currentGroupMembers: GroupMember[];
  currentGroupMessages: GroupMessage[];
  loading: boolean;
  
  // Group management
  fetchGroupChats: (userId: string) => Promise<void>;
  createGroupChat: (name: string, description?: string, memberIds?: string[]) => Promise<string | null>;
  updateGroupChat: (groupId: string, updates: Partial<Pick<GroupChat, 'name' | 'description' | 'avatar_url'>>) => Promise<void>;
  deleteGroupChat: (groupId: string) => Promise<void>;
  
  // Member management
  fetchGroupMembers: (groupId: string) => Promise<void>;
  addGroupMembers: (groupId: string, userIds: string[]) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  
  // Message management
  fetchGroupMessages: (groupId: string, limit?: number) => Promise<void>;
  sendGroupMessage: (groupId: string, content: string, messageType?: 'text' | 'image' | 'snap' | 'audio', mediaUrl?: string, replyToId?: string) => Promise<void>;
  markGroupAsRead: (groupId: string) => Promise<void>;
}

export const useGroupChatStore = create<GroupChatStore>((set, get) => ({
  groupChats: [],
  currentGroupMembers: [],
  currentGroupMessages: [],
  loading: false,
  
  fetchGroupChats: async (userId: string) => {
    set({ loading: true });
    try {
      console.log('Fetching group chats for user:', userId);
      
      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Database connection test failed:', testError);
        set({ groupChats: [] });
        return;
      }
      
      // Check if group tables exist
      const { data: groupTestData, error: groupTestError } = await supabase
        .from('group_chats')
        .select('id')
        .limit(1);
      
      if (groupTestError) {
        console.error('Group tables test failed:', groupTestError);
        if (groupTestError.message?.includes('does not exist') || 
            groupTestError.message?.includes('Could not find') ||
            groupTestError.code === '42P01') {
          console.log('Group chat tables do not exist. Please run the database schema SQL.');
          set({ groupChats: [] });
          return;
        }
      }
      
      // First, get group IDs where user is a member with better error handling
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      console.log('Member data query result:', { memberData, memberError });

      if (memberError) {
        console.error('Error fetching user group memberships:', memberError.message || memberError);
        
        // Handle specific database policy errors
        if (memberError.message?.includes('infinite recursion') || 
            memberError.message?.includes('policy') ||
            memberError.code === '42P17') {
          console.error('Database policy recursion detected. Please update your database policies.');
          set({ groupChats: [] });
          return;
        }
        
        // Handle table not found errors
        if (memberError.message?.includes('Could not find') || 
            memberError.message?.includes('does not exist') ||
            memberError.code === '42P01') {
          console.log('Database schema may need to be refreshed. Please check your Supabase database.');
          set({ groupChats: [] });
          return;
        }
        
        console.error('Failed to fetch group memberships, setting empty array');
        set({ groupChats: [] });
        return;
      }

      if (!memberData || memberData.length === 0) {
        console.log('No group memberships found for user');
        set({ groupChats: [] });
        return;
      }

      const groupIds = memberData.map(m => m.group_id);
      console.log('Found group IDs:', groupIds);

      // Then get the group chats
      const { data, error } = await supabase
        .from('group_chats')
        .select('*')
        .in('id', groupIds)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching group chats:', error.message || error);
        set({ groupChats: [] });
        return;
      }

      // Get member counts for each group (with error handling)
      const { data: memberCounts, error: countError } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);

      if (countError) {
        console.error('Error fetching member counts:', countError.message || countError);
      }

      const memberCountMap = memberCounts?.reduce((acc: Record<string, number>, member) => {
        acc[member.group_id] = (acc[member.group_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const formattedGroups: GroupChat[] = data?.map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url,
        created_by: group.created_by,
        is_active: group.is_active,
        max_members: group.max_members,
        last_message: group.last_message,
        last_message_time: group.last_message_time,
        last_message_type: group.last_message_type,
        member_count: memberCountMap[group.id] || 0,
        unread_count: 0, // TODO: Implement unread count
        created_at: group.created_at,
        updated_at: group.updated_at,
      })) || [];

      console.log(`Successfully fetched ${formattedGroups.length} group chats`);
      set({ groupChats: formattedGroups });
    } catch (error: any) {
      console.error('Error fetching group chats:', error.message || JSON.stringify(error) || error);
      set({ groupChats: [] });
    } finally {
      set({ loading: false });
    }
  },
  
  createGroupChat: async (name: string, description?: string, memberIds: string[] = []) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');
      
      const { data: groupData, error: groupError } = await supabase
        .from('group_chats')
        .insert({
          name,
          description: description || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group chat:', groupError);
        return null;
      }

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          user_id: user.user.id,
          role: 'admin',
        });

      if (memberError) {
        console.error('Error adding creator to group:', memberError);
        return null;
      }

      // Add other members
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map(userId => ({
          group_id: groupData.id,
          user_id: userId,
          role: 'member' as const,
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Error adding members to group:', membersError);
        }
      }

      // Refresh group chats
      await get().fetchGroupChats(user.user.id);
      
      return groupData.id;
    } catch (error) {
      console.error('Error creating group chat:', error);
      return null;
    }
  },
  
  updateGroupChat: async (groupId: string, updates: Partial<Pick<GroupChat, 'name' | 'description' | 'avatar_url'>>) => {
    try {
      const { error } = await supabase
        .from('group_chats')
        .update(updates)
        .eq('id', groupId);

      if (error) {
        console.error('Error updating group chat:', error);
        return;
      }

      // Update local state
      set((state) => ({
        groupChats: state.groupChats.map(group =>
          group.id === groupId ? { ...group, ...updates } : group
        ),
      }));
    } catch (error) {
      console.error('Error updating group chat:', error);
    }
  },
  
  deleteGroupChat: async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_chats')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) {
        console.error('Error deleting group chat:', error);
        return;
      }

      // Remove from local state
      set((state) => ({
        groupChats: state.groupChats.filter(group => group.id !== groupId),
      }));
    } catch (error) {
      console.error('Error deleting group chat:', error);
    }
  },
  
  fetchGroupMembers: async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          user:profiles(username, display_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching group members:', error);
        return;
      }

      const formattedMembers: GroupMember[] = data?.map((member: any) => ({
        id: member.id,
        group_id: member.group_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        is_muted: member.is_muted,
        user: {
          username: member.user.username,
          display_name: member.user.display_name,
          avatar_url: member.user.avatar_url,
        },
      })) || [];

      set({ currentGroupMembers: formattedMembers });
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  },
  
  addGroupMembers: async (groupId: string, userIds: string[]) => {
    try {
      const memberInserts = userIds.map(userId => ({
        group_id: groupId,
        user_id: userId,
        role: 'member' as const,
      }));

      const { error } = await supabase
        .from('group_members')
        .insert(memberInserts);

      if (error) {
        console.error('Error adding group members:', error);
        return;
      }

      // Refresh members
      await get().fetchGroupMembers(groupId);
    } catch (error) {
      console.error('Error adding group members:', error);
    }
  },
  
  removeGroupMember: async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing group member:', error);
        return;
      }

      // Update local state
      set((state) => ({
        currentGroupMembers: state.currentGroupMembers.filter(
          member => !(member.group_id === groupId && member.user_id === userId)
        ),
      }));
    } catch (error) {
      console.error('Error removing group member:', error);
    }
  },
  
  updateMemberRole: async (groupId: string, userId: string, role: 'admin' | 'moderator' | 'member') => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating member role:', error);
        return;
      }

      // Update local state
      set((state) => ({
        currentGroupMembers: state.currentGroupMembers.map(member =>
          member.group_id === groupId && member.user_id === userId
            ? { ...member, role }
            : member
        ),
      }));
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  },
  
  leaveGroup: async (groupId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');
      
      await get().removeGroupMember(groupId, user.user.id);
      
      // Remove from local group chats
      set((state) => ({
        groupChats: state.groupChats.filter(group => group.id !== groupId),
      }));
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  },
  
  fetchGroupMessages: async (groupId: string, limit: number = 50) => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          sender:profiles(username, display_name, avatar_url),
          reply_to:group_messages(id, content, sender_id, sender:profiles(username, display_name))
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching group messages:', error);
        return;
      }

      const formattedMessages: GroupMessage[] = data?.map((message: any) => ({
        id: message.id,
        group_id: message.group_id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        media_url: message.media_url,
        reply_to_id: message.reply_to_id,
        created_at: message.created_at,
        sender: {
          username: message.sender.username,
          display_name: message.sender.display_name,
          avatar_url: message.sender.avatar_url,
        },
        reply_to: message.reply_to ? {
          id: message.reply_to.id,
          group_id: groupId,
          sender_id: message.reply_to.sender_id,
          content: message.reply_to.content,
          message_type: 'text' as const,
          media_url: null,
          reply_to_id: null,
          created_at: '',
          sender: {
            username: message.reply_to.sender.username,
            display_name: message.reply_to.sender.display_name,
            avatar_url: null,
          },
        } : undefined,
      })).reverse() || [];

      set({ currentGroupMessages: formattedMessages });
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  },
  
  sendGroupMessage: async (
    groupId: string, 
    content: string, 
    messageType: 'text' | 'image' | 'snap' | 'audio' = 'text',
    mediaUrl?: string,
    replyToId?: string
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.user.id,
          content,
          message_type: messageType,
          media_url: mediaUrl || null,
          reply_to_id: replyToId || null,
        })
        .select(`
          *,
          sender:profiles(username, display_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending group message:', error);
        return;
      }

      // Update group chat last message
      const { error: updateError } = await supabase
        .from('group_chats')
        .update({
          last_message: content,
          last_message_time: data.created_at,
          last_message_type: messageType,
        })
        .eq('id', groupId);

      if (updateError) {
        console.error('Error updating group last message:', updateError);
      }

      // Add to local messages
      const newMessage: GroupMessage = {
        id: data.id,
        group_id: data.group_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type,
        media_url: data.media_url,
        reply_to_id: data.reply_to_id,
        created_at: data.created_at,
        sender: {
          username: data.sender.username,
          display_name: data.sender.display_name,
          avatar_url: data.sender.avatar_url,
        },
      };

      set((state) => ({
        currentGroupMessages: [...state.currentGroupMessages, newMessage],
        groupChats: state.groupChats.map(group =>
          group.id === groupId
            ? {
                ...group,
                last_message: content,
                last_message_time: data.created_at,
                last_message_type: messageType,
              }
            : group
        ),
      }));
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  },
  
  markGroupAsRead: async (groupId: string) => {
    try {
      console.log('Marking group as read:', groupId);
      // Update local state to clear unread count
      set((state) => ({
        groupChats: state.groupChats.map(group =>
          group.id === groupId ? { ...group, unread_count: 0 } : group
        ),
      }));
      console.log('Successfully marked group as read');
    } catch (error) {
      console.error('Error marking group as read:', error);
    }
  },
}));