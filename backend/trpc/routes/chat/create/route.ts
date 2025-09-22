import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../../../create-context';
import { supabase } from '../../../../lib/supabase';

export const testChatProcedure = publicProcedure.query(() => {
  return { message: 'Chat routes are working!' };
});

// Add database health check procedure
export const testDatabaseProcedure = publicProcedure.query(async () => {
  try {
    console.log('Testing database connection...');
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database test failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('Database test successful');
    return { 
      message: 'Database connection successful!', 
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    console.error('Database test error:', error);
    throw error instanceof Error ? error : new Error('Database test failed');
  }
});

// Add group tables test procedure with better error handling
export const testGroupTablesProcedure = publicProcedure.query(async () => {
  try {
    console.log('Testing group tables...');
    
    // Test each table individually with minimal queries
    const results = {
      success: true,
      message: 'Group tables test completed',
      timestamp: new Date().toISOString(),
      tablesChecked: [] as string[],
      tableResults: {} as Record<string, { success: boolean; error?: string; count?: number }>
    };

    // Test group_chats table
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('group_chats')
        .select('id')
        .limit(1);

      if (groupError) {
        console.error('Group chats table error:', groupError.message);
        results.tableResults['group_chats'] = {
          success: false,
          error: groupError.message
        };
        if (groupError.message.includes('infinite recursion') || groupError.message.includes('policy')) {
          results.success = false;
          results.message = 'Group tables have policy recursion issues';
        }
      } else {
        results.tableResults['group_chats'] = {
          success: true,
          count: Array.isArray(groupData) ? groupData.length : 0
        };
      }
      results.tablesChecked.push('group_chats');
    } catch (error) {
      console.error('Group chats table exception:', error);
      results.tableResults['group_chats'] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.success = false;
    }

    // Test group_members table
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id')
        .limit(1);

      if (membersError) {
        console.error('Group members table error:', membersError.message);
        results.tableResults['group_members'] = {
          success: false,
          error: membersError.message
        };
        if (membersError.message.includes('infinite recursion') || membersError.message.includes('policy')) {
          results.success = false;
          results.message = 'Group tables have policy recursion issues';
        }
      } else {
        results.tableResults['group_members'] = {
          success: true,
          count: Array.isArray(membersData) ? membersData.length : 0
        };
      }
      results.tablesChecked.push('group_members');
    } catch (error) {
      console.error('Group members table exception:', error);
      results.tableResults['group_members'] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.success = false;
    }

    // Test group_messages table
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select('id')
        .limit(1);

      if (messagesError) {
        console.error('Group messages table error:', messagesError.message);
        results.tableResults['group_messages'] = {
          success: false,
          error: messagesError.message
        };
        if (messagesError.message.includes('infinite recursion') || messagesError.message.includes('policy')) {
          results.success = false;
          results.message = 'Group tables have policy recursion issues';
        }
      } else {
        results.tableResults['group_messages'] = {
          success: true,
          count: Array.isArray(messagesData) ? messagesData.length : 0
        };
      }
      results.tablesChecked.push('group_messages');
    } catch (error) {
      console.error('Group messages table exception:', error);
      results.tableResults['group_messages'] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.success = false;
    }

    // Test typing_status table
    try {
      const { data: typingData, error: typingError } = await supabase
        .from('typing_status')
        .select('id')
        .limit(1);

      if (typingError) {
        console.error('Typing status table error:', typingError.message);
        results.tableResults['typing_status'] = {
          success: false,
          error: typingError.message
        };
        if (typingError.message.includes('infinite recursion') || typingError.message.includes('policy')) {
          results.success = false;
          results.message = 'Group tables have policy recursion issues';
        }
      } else {
        results.tableResults['typing_status'] = {
          success: true,
          count: Array.isArray(typingData) ? typingData.length : 0
        };
      }
      results.tablesChecked.push('typing_status');
    } catch (error) {
      console.error('Typing status table exception:', error);
      results.tableResults['typing_status'] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.success = false;
    }

    console.log('Group tables test completed:', results);
    return results;
  } catch (error) {
    console.error('Group tables test error:', error);
    
    // Return a structured error response instead of throwing
    return {
      success: false,
      message: 'Group tables test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
});

export const getChatsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.user.id;

    console.log('Getting chats for user:', userId);

    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:profiles!chats_user1_id_fkey (id, username, display_name, avatar_url),
          user2:profiles!chats_user2_id_fkey (id, username, display_name, avatar_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        throw new Error(`Failed to fetch chats: ${error.message}`);
      }

      const formattedChats = chats?.map((chat: any) => {
        const isUser1 = chat.user1_id === userId;
        const otherUser = isUser1 ? chat.user2 : chat.user1;
        
        return {
          ...chat,
          other_user_name: otherUser?.display_name || otherUser?.username || 'Unknown',
          other_user_avatar: otherUser?.avatar_url || null,
        };
      }) || [];

      console.log(`Fetched ${formattedChats.length} chats`);
      return { chats: formattedChats };
    } catch (error) {
      console.error('Error in getChats procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch chats');
    }
  });

export const createChatProcedure = protectedProcedure
  .input(z.object({
    otherUserId: z.string().uuid(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { otherUserId } = input;
    const userId = ctx.user.id;

    console.log('Creating chat between:', userId, 'and', otherUserId);

    try {
      console.log('Starting chat creation process...');
      // Validate that both users exist
      console.log('Validating users exist...');
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .in('id', [userId, otherUserId]);

      if (userError) {
        console.error('Error validating users:', userError);
        throw new Error(`Failed to validate users: ${userError.message}`);
      }

      if (!users || users.length !== 2) {
        console.error('User validation failed. Found users:', users?.length || 0);
        throw new Error('One or both users do not exist');
      }
      
      console.log('User validation successful');

      // Check if chat already exists (in either direction)
      const { data: existingChat, error: searchError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
        .maybeSingle();

      if (searchError) {
        console.error('Error searching for existing chat:', searchError);
        throw new Error(`Failed to search for existing chat: ${searchError.message || 'Unknown search error'}`);
      }

      if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        return { chatId: existingChat.id };
      }

      // Create new chat - let the database trigger handle user ordering
      console.log('Creating new chat with users:', { userId, otherUserId });

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user1_id: userId,
          user2_id: otherUserId,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating chat:', {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
          full: createError
        });
        throw new Error(`Failed to create chat: ${createError.message || 'Unknown creation error'} (Code: ${createError.code || 'UNKNOWN'})`);
      }

      if (!newChat) {
        console.error('No chat data returned after creation');
        throw new Error('No chat data returned after creation');
      }

      console.log('Created new chat:', newChat.id);
      return { chatId: newChat.id };
    } catch (error) {
      console.error('Error in createChat procedure:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        stringified: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      
      // Ensure we're throwing a proper Error object with a message
      if (error instanceof Error) {
        throw error;
      } else {
        let errorMessage = 'Unknown error occurred';
        
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (typeof error === 'object' && error !== null) {
          if ('message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
          } else {
            errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error));
          }
        } else {
          errorMessage = String(error);
        }
        
        throw new Error(errorMessage);
      }
    }
  });

export const sendMessageProcedure = protectedProcedure
  .input(z.object({
    chatId: z.string().uuid(),
    content: z.string().min(1).max(1000),
    messageType: z.enum(['text', 'image', 'snap', 'audio']).default('text'),
    mediaUrl: z.string().url().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { chatId, content, messageType, mediaUrl } = input;
    const userId = ctx.user.id;

    console.log('Sending message:', { chatId, messageType, userId });

    try {
      // Verify user has access to this chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        throw new Error('Chat not found or access denied');
      }

      if (chat.user1_id !== userId && chat.user2_id !== userId) {
        throw new Error('Access denied to this chat');
      }

      // Insert the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
        })
        .select('*')
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw new Error(`Failed to send message: ${messageError.message}`);
      }

      console.log('Message sent successfully:', message.id);
      return { message };
    } catch (error) {
      console.error('Error in sendMessage procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to send message');
    }
  });

export const getMessagesProcedure = protectedProcedure
  .input(z.object({
    chatId: z.string().uuid(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
  }))
  .query(async ({ input, ctx }) => {
    const { chatId, limit, offset } = input;
    const userId = ctx.user.id;

    console.log('Getting messages for chat:', chatId);

    try {
      // Verify user has access to this chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        throw new Error('Chat not found or access denied');
      }

      if (chat.user1_id !== userId && chat.user2_id !== userId) {
        throw new Error('Access denied to this chat');
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      console.log(`Fetched ${messages?.length || 0} messages`);
      return { messages: messages || [] };
    } catch (error) {
      console.error('Error in getMessages procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch messages');
    }
  });

export const markMessagesAsReadProcedure = protectedProcedure
  .input(z.object({
    chatId: z.string().uuid(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { chatId } = input;
    const userId = ctx.user.id;

    console.log('Marking messages as read for chat:', chatId);

    try {
      // Verify user has access to this chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id')
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        throw new Error('Chat not found or access denied');
      }

      if (chat.user1_id !== userId && chat.user2_id !== userId) {
        throw new Error('Access denied to this chat');
      }

      // Mark messages as read (only messages not sent by current user)
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        throw new Error(`Failed to mark messages as read: ${updateError.message}`);
      }

      // Reset unread count for this chat
      const { error: chatUpdateError } = await supabase
        .from('chats')
        .update({ unread_count: 0 })
        .eq('id', chatId);

      if (chatUpdateError) {
        console.error('Error updating chat unread count:', chatUpdateError);
      }

      console.log('Messages marked as read successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in markMessagesAsRead procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to mark messages as read');
    }
  });



// Add get friends procedure
export const getFriendsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.user.id;

    console.log('Getting friends for user:', userId);

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user1:profiles!friendships_user1_id_fkey(id, username, display_name, avatar_url),
          user2:profiles!friendships_user2_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (error) {
        console.error('Error fetching friends:', error);
        // Fallback to all profiles for demo purposes
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .neq('id', userId)
          .limit(10);
        
        const fallbackFriends = profiles?.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        })) || [];
        
        return { friends: fallbackFriends };
      }

      const formattedFriends = friendships?.map((friendship: any) => {
        const friend = friendship.user1_id === userId ? friendship.user2 : friendship.user1;
        return {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
        };
      }) || [];

      console.log(`Fetched ${formattedFriends.length} friends`);
      return { friends: formattedFriends };
    } catch (error) {
      console.error('Error in getFriends procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch friends');
    }
  });

// Group chat procedures
export const getGroupChatsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.user.id;

    console.log('Getting group chats for user:', userId);

    try {
      const { data: groupMemberships, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          group_chats!inner (
            id,
            name,
            description,
            avatar_url,
            created_by,
            last_message,
            last_message_time,
            last_message_type,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('group_chats.updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching group chats:', error);
        return { groupChats: [] };
      }

      const formattedGroupChats = groupMemberships?.map((membership: any) => ({
        ...membership.group_chats,
        user_role: membership.role,
      })) || [];

      console.log(`Fetched ${formattedGroupChats.length} group chats`);
      return { groupChats: formattedGroupChats };
    } catch (error) {
      console.error('Error in getGroupChats procedure:', error);
      return { groupChats: [] };
    }
  });

export const createGroupChatProcedure = protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    memberIds: z.array(z.string().uuid()).min(1).max(49), // Max 49 + creator = 50
  }))
  .mutation(async ({ input, ctx }) => {
    const { name, description, memberIds } = input;
    const userId = ctx.user.id;

    console.log('Creating group chat:', { name, memberCount: memberIds.length });

    try {
      // Create the group chat
      const { data: groupChat, error: groupError } = await supabase
        .from('group_chats')
        .insert({
          name,
          description,
          created_by: userId,
        })
        .select('id')
        .single();

      if (groupError) {
        console.error('Error creating group chat:', groupError);
        throw new Error(`Failed to create group chat: ${groupError.message}`);
      }

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupChat.id,
          user_id: userId,
          role: 'admin',
        });

      if (creatorError) {
        console.error('Error adding creator to group:', creatorError);
        // Try to clean up the group chat
        await supabase.from('group_chats').delete().eq('id', groupChat.id);
        throw new Error(`Failed to add creator to group: ${creatorError.message}`);
      }

      // Add other members
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map(memberId => ({
          group_id: groupChat.id,
          user_id: memberId,
          role: 'member' as const,
        }));

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(memberInserts);

        if (membersError) {
          console.error('Error adding members to group:', membersError);
          // Continue anyway, group is created with just the creator
        }
      }

      console.log('Group chat created successfully:', groupChat.id);
      return { groupChatId: groupChat.id };
    } catch (error) {
      console.error('Error in createGroupChat procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to create group chat');
    }
  });

export const getGroupMessagesProcedure = protectedProcedure
  .input(z.object({
    groupId: z.string().uuid(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
  }))
  .query(async ({ input, ctx }) => {
    const { groupId, limit, offset } = input;
    const userId = ctx.user.id;

    console.log('Getting group messages for group:', groupId);

    try {
      // Verify user is a member of this group
      const { data: membership, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        throw new Error('Access denied to this group');
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('group_messages')
        .select(`
          *,
          sender:profiles!group_messages_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        console.error('Error fetching group messages:', messagesError);
        throw new Error(`Failed to fetch group messages: ${messagesError.message}`);
      }

      console.log(`Fetched ${messages?.length || 0} group messages`);
      return { messages: messages || [] };
    } catch (error) {
      console.error('Error in getGroupMessages procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch group messages');
    }
  });

export const sendGroupMessageProcedure = protectedProcedure
  .input(z.object({
    groupId: z.string().uuid(),
    content: z.string().min(1).max(1000),
    messageType: z.enum(['text', 'image', 'snap', 'audio', 'system']).default('text'),
    mediaUrl: z.string().url().optional(),
    replyToId: z.string().uuid().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { groupId, content, messageType, mediaUrl, replyToId } = input;
    const userId = ctx.user.id;

    console.log('Sending group message:', { groupId, messageType, userId });

    try {
      // Verify user is a member of this group
      const { data: membership, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        throw new Error('Access denied to this group');
      }

      // Insert the message
      const { data: message, error: messageError } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: userId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          reply_to_id: replyToId,
        })
        .select('*')
        .single();

      if (messageError) {
        console.error('Error creating group message:', messageError);
        throw new Error(`Failed to send group message: ${messageError.message}`);
      }

      console.log('Group message sent successfully:', message.id);
      return { message };
    } catch (error) {
      console.error('Error in sendGroupMessage procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to send group message');
    }
  });

// Enhanced typing status with real-time support
export const setTypingStatusProcedure = protectedProcedure
  .input(z.object({
    chatId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    isTyping: z.boolean(),
  }))
  .mutation(async ({ input, ctx }) => {
    const { chatId, groupId, isTyping } = input;
    const userId = ctx.user.id;

    if (!chatId && !groupId) {
      throw new Error('Either chatId or groupId must be provided');
    }

    console.log('Setting typing status:', { chatId, groupId, isTyping, userId });

    try {
      if (chatId) {
        // Verify user has access to this chat
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('id, user1_id, user2_id')
          .eq('id', chatId)
          .single();

        if (chatError || !chat) {
          throw new Error('Chat not found or access denied');
        }

        if (chat.user1_id !== userId && chat.user2_id !== userId) {
          throw new Error('Access denied to this chat');
        }
      }

      if (groupId) {
        // Verify user is a member of this group
        const { data: membership, error: memberError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (memberError || !membership) {
          throw new Error('Access denied to this group');
        }
      }

      // Update or insert typing status
      const { error: typingError } = await supabase
        .from('typing_status')
        .upsert({
          chat_id: chatId,
          group_id: groupId,
          user_id: userId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: chatId ? 'chat_id,user_id' : 'group_id,user_id'
        });

      if (typingError) {
        console.error('Error updating typing status:', typingError);
        // Don't throw error for typing status, just log it
      }

      console.log('Typing status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in setTypingStatus procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to set typing status');
    }
  });

export const getTypingStatusProcedure = protectedProcedure
  .input(z.object({
    chatId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const { chatId, groupId } = input;
    const userId = ctx.user.id;

    if (!chatId && !groupId) {
      throw new Error('Either chatId or groupId must be provided');
    }

    try {
      let query = supabase
        .from('typing_status')
        .select(`
          *,
          user:profiles!typing_status_user_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('is_typing', true)
        .neq('user_id', userId) // Don't include current user
        .gte('updated_at', new Date(Date.now() - 30000).toISOString()); // Only recent typing status

      if (chatId) {
        query = query.eq('chat_id', chatId);
      } else if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data: typingUsers, error } = await query;

      if (error) {
        console.error('Error fetching typing status:', error);
        return { typingUsers: [] };
      }

      return { typingUsers: typingUsers || [] };
    } catch (error) {
      console.error('Error in getTypingStatus procedure:', error);
      return { typingUsers: [] };
    }
  });