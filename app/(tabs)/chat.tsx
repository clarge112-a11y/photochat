import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Search, UserPlus, Phone, Video, Check, X, MessageCircle, Square, Users, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFriends } from '@/contexts/friends-context';
import { useCall } from '@/contexts/call-context';
import { useChatStore } from '@/stores/chat-store';
import { useGroupChatStore } from '@/stores/group-chat-store';
import { useAuth } from '@/contexts/auth-context';


export default function ChatScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { friends, pendingRequests, acceptFriendRequest, declineFriendRequest } = useFriends();
  const { startCall, incomingCall } = useCall();
  const { chats, fetchChats, markAsRead, createChat, checkBackendHealth } = useChatStore();
  const { groupChats, fetchGroupChats, markGroupAsRead } = useGroupChatStore();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');

  
  useEffect(() => {
    if (user?.id) {
      // Check backend health first, then fetch data
      checkBackendHealth().then(() => {
        fetchChats(user.id);
        fetchGroupChats(user.id);
      });
    }
  }, [user?.id, fetchChats, fetchGroupChats, checkBackendHealth]);

  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredChats = chats.filter(chat =>
    chat.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredGroupChats = groupChats.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getInitials = (name: string) => {
    if (!name?.trim()) return 'U';
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const renderDefaultAvatar = (name: string, size: number = 50) => {
    const initials = getInitials(name);
    return (
      <View style={[styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
      </View>
    );
  };
  
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };
  
  const getStatusText = (status: string | null, timestamp: string | null) => {
    if (!status || !timestamp) return '';
    const timeAgo = formatTime(timestamp);
    return `${status.charAt(0).toUpperCase() + status.slice(1)} ${timeAgo}`;
  };
  
  const handleChatPress = async (chatId: string) => {
    console.log('Chat pressed:', chatId);
    try {
      await markAsRead(chatId);
      console.log('Navigating to chat:', chatId);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error handling chat press:', error);
    }
  };
  
  const handleGroupChatPress = async (groupId: string) => {
    await markGroupAsRead(groupId);
    router.push(`/group-chat/${groupId}`);
  };
  
  const handleCreateGroup = () => {
    router.push('/create-group');
  };

  // Handle incoming calls
  useEffect(() => {
    if (incomingCall) {
      router.push('/incoming-call');
    }
  }, [incomingCall]);

  const handleStartCall = async (friendId: string, callType: 'voice' | 'video') => {
    try {
      console.log('Starting call with:', friendId, callType);
      await startCall({ receiverId: friendId, callType });
      console.log('Call started successfully, navigating to call screen');
      router.push('/call');
    } catch (error) {
      console.error('Error starting call:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to start call';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      console.error('Detailed error message:', errorMessage);
      Alert.alert('Call Error', errorMessage);
    }
  };
  
  const handleStartGroupCall = async (groupId: string, callType: 'voice' | 'video') => {
    try {
      console.log('Starting group call with:', groupId, callType);
      await startCall({ groupId, callType, isGroupCall: true });
      console.log('Group call started successfully, navigating to group call screen');
      router.push('/group-call');
    } catch (error) {
      console.error('Error starting group call:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to start group call';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.log('Processed error message:', errorMessage);
      Alert.alert('Group Call Error', errorMessage);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline friend request');
    }
  };

  const FriendRequestItem = ({ request }: { request: any }) => (
    <View style={styles.friendRequestItem}>
      <Image
        source={{ uri: request.sender.avatar_url || 'https://via.placeholder.com/50' }}
        style={styles.avatar}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.sender.display_name}</Text>
        <Text style={styles.requestUsername}>@{request.sender.username}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptFriendRequest(request.id)}
        >
          <Check color="white" size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineFriendRequest(request.id)}
        >
          <X color="white" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ChatItem = ({ chat }: { chat: any }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => handleChatPress(chat.id)}
    >
      <View style={styles.avatarContainer}>
        {chat.other_user_avatar ? (
          <Image
            source={{ uri: chat.other_user_avatar }}
            style={styles.avatar}
          />
        ) : (
          renderDefaultAvatar(chat.other_user_name)
        )}
        {chat.is_typing && <View style={styles.typingIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{chat.other_user_name}</Text>
          <Text style={styles.chatTime}>{formatTime(chat.last_message_time)}</Text>
        </View>
        
        <View style={styles.chatPreview}>
          <View style={styles.messagePreview}>
            {chat.last_message_type === 'photo' && (
              <Square color="#FF3B30" size={12} style={styles.messageTypeIcon} />
            )}
            {chat.last_message_type === 'text' && chat.last_message && (
              <MessageCircle color="#007AFF" size={12} style={styles.messageTypeIcon} />
            )}
            <Text style={[
              styles.lastMessage,
              chat.last_message_type === 'photo' && styles.photoMessage,
              !chat.last_message && styles.newChatMessage
            ]} numberOfLines={1}>
              {chat.is_typing ? 'typing...' : 
               chat.last_message_type === 'photo' ? 'New Photo' :
               chat.last_message || 'New Chat'}
            </Text>
          </View>
          {chat.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread_count}</Text>
            </View>
          )}
        </View>
        
        {chat.message_status && chat.last_message && (
          <Text style={styles.statusText}>
            {getStatusText(chat.message_status, chat.status_timestamp)}
          </Text>
        )}
      </View>
      
      <View style={styles.callButtons}>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleStartCall(chat.user2_id === user?.id ? chat.user1_id : chat.user2_id, 'voice')}
        >
          <Phone color="#FFFC00" size={18} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleStartCall(chat.user2_id === user?.id ? chat.user1_id : chat.user2_id, 'video')}
        >
          <Video color="#FFFC00" size={18} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  const FriendItem = ({ friend }: { friend: any }) => {
    const handleFriendPress = async () => {
      console.log('Friend pressed:', friend.id, friend.display_name);
      try {
        if (!user?.id) {
          console.error('No user ID available');
          Alert.alert('Error', 'User not authenticated');
          return;
        }
        
        console.log('Creating chat for friend:', friend.display_name);
        
        // Create or find existing chat - this should always work now
        const chatId = await createChat(user.id, friend.id);
        console.log('Chat created/found with ID:', chatId);
        
        if (chatId) {
          console.log('Navigating to chat:', chatId);
          // Navigate immediately - the chat screen will handle loading
          router.push(`/chat/${chatId}`);
        } else {
          console.error('Failed to create chat - no ID returned');
          Alert.alert('Error', 'Failed to create chat');
        }
      } catch (error) {
        console.error('Error handling friend press:', error);
        
        // For any error, still try to create a basic chat
        try {
          const fallbackChatId = `emergency-${user?.id || 'unknown'}-${friend.id}-${Date.now()}`;
          console.log('Creating emergency fallback chat:', fallbackChatId);
          router.push(`/chat/${fallbackChatId}`);
        } catch (fallbackError) {
          console.error('Even fallback failed:', fallbackError);
          Alert.alert('Error', 'Unable to open chat. Please try again.');
        }
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={handleFriendPress}
      >
        <View style={styles.avatarContainer}>
          {friend.avatar_url ? (
            <Image
              source={{ uri: friend.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            renderDefaultAvatar(friend.display_name)
          )}
          <View style={styles.onlineIndicator} />
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{friend.display_name}</Text>
            <Text style={styles.chatTime}>@{friend.username}</Text>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              Tap to start chatting
            </Text>
          </View>
        </View>
        
        <View style={styles.callButtons}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleStartCall(friend.id, 'voice')}
          >
            <Phone color="#FFFC00" size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleStartCall(friend.id, 'video')}
          >
            <Video color="#FFFC00" size={18} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const GroupChatItem = ({ group }: { group: any }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => handleGroupChatPress(group.id)}
    >
      <View style={styles.avatarContainer}>
        {group.avatar_url ? (
          <Image
            source={{ uri: group.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.groupAvatarDefault}>
            <Users color="white" size={20} />
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{group.name}</Text>
          <Text style={styles.chatTime}>{formatTime(group.last_message_time)}</Text>
        </View>
        
        <View style={styles.chatPreview}>
          <View style={styles.messagePreview}>
            <Text style={[
              styles.lastMessage,
              !group.last_message && styles.newChatMessage
            ]} numberOfLines={1}>
              {group.last_message || 'No messages yet'}
            </Text>
          </View>
          {group.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{group.unread_count}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.memberCountText}>
          {group.member_count} members
        </Text>
      </View>
      
      <View style={styles.callButtons}>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleStartGroupCall(group.id, 'voice')}
        >
          <Phone color="#FFFC00" size={18} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleStartGroupCall(group.id, 'video')}
        >
          <Video color="#FFFC00" size={18} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PhotoChat</Text>

        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleCreateGroup}
          >
            <Users color="#FFFC00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/add-friend')}
          >
            <UserPlus color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color="#666" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Friend Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.friendRequestsSection}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          {pendingRequests.map((request) => (
            <FriendRequestItem key={request.id} request={request} />
          ))}
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Chats */}
      {activeTab === 'chats' && filteredChats.length > 0 && (
        <View style={styles.chatsSection}>
          <Text style={styles.sectionTitle}>Recent Chats</Text>
          <ScrollView style={styles.chatsList} showsVerticalScrollIndicator={false}>
            {filteredChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Group Chats */}
      {activeTab === 'groups' && (
        <View style={styles.chatsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Group Chats</Text>
            <TouchableOpacity 
              style={styles.createGroupButton}
              onPress={handleCreateGroup}
            >
              <Plus color="#FFFC00" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.chatsList} showsVerticalScrollIndicator={false}>
            {filteredGroupChats.map((group) => (
              <GroupChatItem key={group.id} group={group} />
            ))}
            {filteredGroupChats.length === 0 && (
              <View style={styles.emptyState}>
                <Users color="#666" size={48} />
                <Text style={styles.emptyText}>No group chats yet</Text>
                <Text style={styles.emptySubtext}>Create a group to start chatting with multiple friends</Text>
                <TouchableOpacity 
                  style={styles.createFirstGroupButton}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.createFirstGroupText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
      
      {/* Best Friends */}
      <View style={styles.bestFriendsSection}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bestFriendsRow}>
          {friends.slice(0, 8).map((friend) => (
            <TouchableOpacity key={friend.id} style={styles.bestFriendItem}>
              <View style={styles.bestFriendAvatar}>
                {friend.avatar_url ? (
                  <Image
                    source={{ uri: friend.avatar_url }}
                    style={styles.bestFriendImage}
                  />
                ) : (
                  renderDefaultAvatar(friend.display_name, 60)
                )}
              </View>
              <Text style={styles.bestFriendName} numberOfLines={1}>
                {friend.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Friends List */}
      {activeTab === 'chats' && (
        <ScrollView style={styles.chatsList} showsVerticalScrollIndicator={false}>
          {filteredFriends.map((friend) => (
            <FriendItem key={friend.id} friend={friend} />
          ))}
          {filteredFriends.length === 0 && filteredChats.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>Add friends to start chatting</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  debugStatus: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFC00',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  createGroupButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,252,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarDefault: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  createFirstGroupButton: {
    backgroundColor: '#FFFC00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  createFirstGroupText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  bestFriendsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  bestFriendsRow: {
    paddingLeft: 20,
  },
  bestFriendItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 70,
  },
  bestFriendAvatar: {
    position: 'relative',
    marginBottom: 8,
  },
  bestFriendImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  bestFriendStreak: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestFriendStreakText: {
    fontSize: 10,
  },
  bestFriendName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  chatsList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  streakBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 10,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    color: '#666',
    fontSize: 12,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#999',
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  streakInfo: {
    marginTop: 4,
  },
  streakDays: {
    color: '#FFFC00',
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    padding: 10,
  },
  friendRequestsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 15,
  },
  requestName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestUsername: {
    color: '#666',
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,252,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
  },
  chatsSection: {
    marginBottom: 20,
  },
  defaultAvatar: {
    backgroundColor: '#FFFC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: 'bold',
    color: '#000',
  },
  typingIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFC00',
    borderWidth: 2,
    borderColor: '#000',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageTypeIcon: {
    marginRight: 6,
  },
  photoMessage: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  newChatMessage: {
    color: '#007AFF',
    fontWeight: '600',
  },
  statusText: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
});