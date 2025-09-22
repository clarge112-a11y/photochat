import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { safeTrpcClient } from '@/lib/trpc';


export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  other_user_name: string;
  other_user_avatar: string;
  last_message: string | null;
  last_message_time: string | null;
  last_message_type: 'text' | 'photo' | 'image' | 'snap' | 'audio' | null;
  message_status: 'sent' | 'delivered' | 'opened' | null;
  status_timestamp: string | null;
  is_typing: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ChatStore {
  chats: Chat[];
  friends: Friend[];
  loading: boolean;
  typingUsers: Record<string, boolean>;
  backendAvailable: boolean;
  fetchChats: (userId: string) => Promise<void>;
  fetchFriends: (userId: string) => Promise<void>;
  createChat: (userId: string, otherUserId: string) => Promise<string>;
  sendMessage: (chatId: string, content: string, messageType?: 'text' | 'image' | 'snap' | 'audio', userId?: string) => Promise<any>;
  getMessages: (chatId: string, limit?: number, offset?: number) => Promise<any[]>;
  updateLastMessage: (chatId: string, message: string, messageType?: 'text' | 'photo' | 'image') => Promise<void>;
  updateMessageStatus: (chatId: string, status: 'sent' | 'delivered' | 'opened') => Promise<void>;
  setTypingStatus: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string) => Promise<void>;
  checkBackendHealth: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  friends: [],
  loading: false,
  typingUsers: {},
  backendAvailable: false,
  
  checkBackendHealth: async () => {
    try {
      const result = await safeTrpcClient.testConnection();
      set({ backendAvailable: result.success });
      console.log('Backend health status:', result.success);
      if (!result.success) {
        console.log('Backend health check failed:', result.error);
      }
      
      // Also test database connectivity
      if (result.success) {
        const dbTest = await safeTrpcClient.testDatabase();
        console.log('Database health status:', dbTest.success);
        if (!dbTest.success) {
          console.log('Database test failed:', dbTest.error);
        }
      }
    } catch (error) {
      console.log('Backend health check failed:', error);
      set({ backendAvailable: false });
    }
  },

  fetchChats: async (userId: string) => {
    set({ loading: true });
    try {
      const { backendAvailable } = get();
      
      // Try tRPC first if backend is available
      if (backendAvailable) {
        console.log('Using tRPC for chat fetching');
        const result = await safeTrpcClient.getChats();
        if (result.success && result.data?.chats) {
          const formattedChats: Chat[] = result.data.chats.map((chat: any) => ({
            id: chat.id,
            user1_id: chat.user1_id,
            user2_id: chat.user2_id,
            other_user_name: chat.other_user_name || 'Unknown',
            other_user_avatar: chat.other_user_avatar || '',
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            last_message_type: chat.last_message_type || 'text',
            message_status: chat.message_status || 'sent',
            status_timestamp: chat.status_timestamp,
            is_typing: false,
            unread_count: chat.unread_count || 0,
            created_at: chat.created_at,
            updated_at: chat.updated_at,
          }));
          set({ chats: formattedChats });
          return;
        } else {
          console.log('tRPC chat fetch failed, falling back to Supabase:', result.error);
        }
      }
      
      // Fallback to Supabase
      console.log('Using Supabase for chat fetching');
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          user1:profiles!chats_user1_id_fkey (username, display_name, avatar_url),
          user2:profiles!chats_user2_id_fkey (username, display_name, avatar_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      const formattedChats: Chat[] = data?.map((chat: any) => {
        const isUser1 = chat.user1_id === userId;
        const otherUser = isUser1 ? chat.user2 : chat.user1;
        
        return {
          id: chat.id,
          user1_id: chat.user1_id,
          user2_id: chat.user2_id,
          other_user_name: otherUser?.display_name || otherUser?.username || 'Unknown',
          other_user_avatar: otherUser?.avatar_url || '',
          last_message: chat.last_message,
          last_message_time: chat.last_message_time,
          last_message_type: chat.last_message_type || 'text',
          message_status: chat.message_status || 'sent',
          status_timestamp: chat.status_timestamp,
          is_typing: false,
          unread_count: chat.unread_count || 0,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
        };
      }) || [];

      set({ chats: formattedChats });
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchFriends: async (userId: string) => {
    try {
      const { backendAvailable } = get();
      
      // Try tRPC first if backend is available
      if (backendAvailable) {
        console.log('Using tRPC for friends fetching');
        const result = await safeTrpcClient.getFriends();
        if (result.success && result.data?.friends) {
          const formattedFriends: Friend[] = result.data.friends.map((friend: any) => ({
            id: friend.id,
            username: friend.username,
            display_name: friend.display_name,
            avatar_url: friend.avatar_url,
          }));
          set({ friends: formattedFriends });
          return;
        } else {
          console.log('tRPC friends fetch failed, falling back to Supabase:', result.error);
        }
      }
      
      // Fallback to Supabase
      console.log('Using Supabase for friends fetching');
      const { data, error } = await supabase
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
        
        const fallbackFriends: Friend[] = profiles?.map((profile: any) => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        })) || [];
        
        set({ friends: fallbackFriends });
        return;
      }

      const formattedFriends: Friend[] = data?.map((friendship: any) => {
        const friend = friendship.user1_id === userId ? friendship.user2 : friendship.user1;
        return {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url,
        };
      }) || [];

      set({ friends: formattedFriends });
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  },
  
  createChat: async (userId: string, otherUserId: string) => {
    console.log('Creating chat:', { userId, otherUserId });
    
    // Check if chat already exists
    const existingChat = get().chats.find(chat => 
      (chat.user1_id === userId && chat.user2_id === otherUserId) ||
      (chat.user1_id === otherUserId && chat.user2_id === userId)
    );
    
    if (existingChat) {
      console.log('Chat already exists:', existingChat.id);
      return existingChat.id;
    }
    
    // Get friend info for better UX (but don't block on it)
    let friendInfo = null;
    try {
      // First try to get from friends list in store
      const friend = get().friends.find(f => f.id === otherUserId);
      if (friend) {
        friendInfo = {
          id: friend.id,
          username: friend.username,
          display_name: friend.display_name,
          avatar_url: friend.avatar_url
        };
        console.log('Using friend info from store:', friendInfo.display_name);
      } else {
        // Fallback to database query
        const { data: friendData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', otherUserId)
          .single();
        friendInfo = friendData;
        console.log('Friend info fetched from database:', friendInfo?.display_name);
      }
    } catch (error) {
      console.log('Could not fetch friend info, using fallback:', error);
      friendInfo = {
        id: otherUserId,
        username: 'friend',
        display_name: 'Friend',
        avatar_url: null
      };
    }
    
    // Create a working chat ID immediately
    const chatId = `chat-${userId}-${otherUserId}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const newChat: Chat = {
      id: chatId,
      user1_id: userId,
      user2_id: otherUserId,
      other_user_name: friendInfo?.display_name || friendInfo?.username || 'Friend',
      other_user_avatar: friendInfo?.avatar_url || '',
      last_message: null,
      last_message_time: null,
      last_message_type: null,
      message_status: null,
      status_timestamp: null,
      is_typing: false,
      unread_count: 0,
      created_at: timestamp,
      updated_at: timestamp,
    };
    
    // Add to local state immediately for instant UI feedback
    set((state) => ({
      chats: [newChat, ...state.chats],
    }));
    
    console.log('Chat created successfully:', chatId);
    
    // Try to create in database in the background (non-blocking)
    setTimeout(async () => {
      try {
        console.log('Attempting background database sync...');
        const { data, error } = await supabase
          .from('chats')
          .insert({
            user1_id: userId,
            user2_id: otherUserId,
          })
          .select()
          .single();

        if (!error && data) {
          console.log('Chat synced to database:', data.id);
          // Update the local chat with the real database ID
          set((state) => ({
            chats: state.chats.map(chat => 
              chat.id === chatId 
                ? { ...chat, id: data.id }
                : chat
            ),
          }));
        } else {
          console.log('Database sync failed, keeping local chat:', error?.message);
        }
      } catch (dbError) {
        console.log('Background database sync failed:', dbError);
      }
    }, 100);
    
    return chatId;
  },
  
  updateLastMessage: async (chatId: string, message: string, messageType: 'text' | 'photo' | 'image' = 'text') => {
    try {
      const timestamp = new Date().toISOString();
      
      // Update local state immediately for better UX
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId 
            ? { 
                ...chat, 
                last_message: message, 
                last_message_time: timestamp,
                last_message_type: messageType,
                message_status: 'sent',
                status_timestamp: timestamp,
                updated_at: timestamp,
              }
            : chat
        ),
      }));
      
      // Try to update in database
      try {
        const { error } = await supabase
          .from('chats')
          .update({
            last_message: message,
            last_message_time: timestamp,
            last_message_type: messageType,
            message_status: 'sent',
            status_timestamp: timestamp,
            updated_at: timestamp,
          })
          .eq('id', chatId);

        if (error) {
          console.error('Error updating last message:', error);
        }
      } catch (dbError) {
        console.error('Database update failed:', dbError);
      }
      
      // Simulate delivery after 1 second
      setTimeout(() => {
        get().updateMessageStatus(chatId, 'delivered');
      }, 1000);
    } catch (error) {
      console.error('Error updating last message:', error);
    }
  },
  
  updateMessageStatus: async (chatId: string, status: 'sent' | 'delivered' | 'opened') => {
    try {
      const timestamp = new Date().toISOString();
      
      // Update local state immediately
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId 
            ? { 
                ...chat, 
                message_status: status,
                status_timestamp: timestamp,
              }
            : chat
        ),
      }));
      
      // Try to update in database
      try {
        const { error } = await supabase
          .from('chats')
          .update({
            message_status: status,
            status_timestamp: timestamp,
          })
          .eq('id', chatId);

        if (error) {
          console.error('Error updating message status:', error);
        }
      } catch (dbError) {
        console.error('Database update failed:', dbError);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  },
  
  setTypingStatus: (chatId: string, isTyping: boolean) => {
    // Update local state immediately for instant UI feedback
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: isTyping,
      },
      chats: state.chats.map(chat =>
        chat.id === chatId 
          ? { ...chat, is_typing: isTyping }
          : chat
      ),
    }));
    
    // Try to sync with backend in background (non-blocking)
    const { backendAvailable } = get();
    if (backendAvailable && !chatId.startsWith('local-') && !chatId.startsWith('fallback-') && !chatId.startsWith('chat-')) {
      setTimeout(async () => {
        try {
          await safeTrpcClient.setTypingStatus(chatId, isTyping);
          console.log('Typing status synced to backend');
        } catch (error) {
          console.log('Failed to sync typing status to backend:', error);
        }
      }, 100);
    }
  },
  
  sendMessage: async (chatId: string, content: string, messageType: 'text' | 'image' | 'snap' | 'audio' = 'text', userId?: string) => {
    // Create a working local message immediately
    const localMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chat_id: chatId,
      content,
      message_type: messageType,
      created_at: new Date().toISOString(),
      sender_id: userId || 'current-user',
      sender: { id: userId || 'current-user', username: 'You', display_name: 'You' },
      is_read: false
    };
    
    // Update last message in chat immediately for instant UI feedback
    await get().updateLastMessage(chatId, content, messageType === 'image' ? 'photo' : 'text');
    
    // Try to send via backend in the background (non-blocking)
    if (userId) {
      setTimeout(async () => {
        try {
          console.log('Attempting background message sync:', { chatId, messageType, userId });
          
          // Only try backend if it's not a local/fallback chat
          if (!chatId.startsWith('local-') && !chatId.startsWith('fallback-') && !chatId.startsWith('chat-')) {
            const { backendAvailable } = get();
            
            // Try tRPC first if backend is available
            if (backendAvailable) {
              const result = await safeTrpcClient.sendMessage(chatId, content, messageType);
              if (result.success) {
                console.log('Message synced via tRPC:', result.data?.message?.id);
                return;
              } else {
                console.log('tRPC message sync failed, falling back to Supabase:', result.error);
              }
            }
            
            // Fallback to Supabase
            const { data, error } = await supabase
              .from('messages')
              .insert({
                chat_id: chatId,
                content,
                message_type: messageType,
                sender_id: userId,
              })
              .select()
              .single();

            if (!error && data) {
              console.log('Message synced to database:', data.id);
            } else {
              console.log('Database message sync failed:', error?.message);
            }
          } else {
            console.log('Skipping backend sync for local chat');
          }
        } catch (dbError) {
          console.log('Background message sync failed:', dbError);
        }
      }, 100);
    }
    
    return localMessage;
  },

  getMessages: async (chatId: string, limit: number = 50, offset: number = 0) => {
    try {
      console.log('Getting messages:', { chatId, limit, offset });
      
      // For local/fallback chats, return empty array (messages will be handled in the chat screen)
      if (chatId.startsWith('local-') || chatId.startsWith('fallback-') || chatId.startsWith('chat-')) {
        console.log('Local chat detected, returning empty messages array');
        return [];
      }
      
      const { backendAvailable } = get();
      
      // Try tRPC first if backend is available
      if (backendAvailable) {
        console.log('Using tRPC for messages fetching');
        const result = await safeTrpcClient.getMessages(chatId);
        if (result.success && result.data?.messages) {
          console.log(`Fetched ${result.data.messages.length} messages via tRPC`);
          return result.data.messages;
        } else {
          console.log('tRPC messages fetch failed, falling back to Supabase:', result.error);
        }
      }
      
      // Fallback to Supabase
      console.log('Using Supabase for messages fetching');
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.log('Database error getting messages, returning empty array:', error.message);
        return [];
      }

      console.log(`Fetched ${data?.length || 0} messages from database`);
      return data || [];
    } catch (dbError) {
      console.log('Failed to get messages, returning empty array:', dbError);
      return [];
    }
  },

  markAsRead: async (chatId: string) => {
    try {
      console.log('Marking messages as read:', chatId);
      
      // Update local state immediately for instant UI feedback
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === chatId 
            ? { ...chat, unread_count: 0 }
            : chat
        ),
      }));
      
      // Skip backend update for local/fallback chats
      if (chatId.startsWith('local-') || chatId.startsWith('fallback-') || chatId.startsWith('chat-')) {
        console.log('Local chat - mark as read completed');
        return;
      }
      
      // Try to update via backend in background (non-blocking)
      setTimeout(async () => {
        try {
          const { backendAvailable } = get();
          
          // Try tRPC first if backend is available
          if (backendAvailable) {
            const result = await safeTrpcClient.markAsRead(chatId);
            if (result.success) {
              console.log('Messages marked as read via tRPC');
              return;
            } else {
              console.log('tRPC mark as read failed, falling back to Supabase:', result.error);
            }
          }
          
          // Fallback to Supabase
          const { error } = await supabase
            .from('chats')
            .update({ unread_count: 0 })
            .eq('id', chatId);

          if (error) {
            console.log('Database mark as read failed:', error.message);
          } else {
            console.log('Messages marked as read in database');
          }
        } catch (dbError) {
          console.log('Background mark as read sync failed:', dbError);
        }
      }, 100);
    } catch (error) {
      console.log('Error marking as read:', error);
    }
  },
}));