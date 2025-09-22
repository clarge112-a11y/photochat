import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Send, Phone, Video, Users, Settings, ArrowLeft } from 'lucide-react-native';
import { useGroupChatStore } from '@/stores/group-chat-store';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TypingIndicator } from '@/components/TypingIndicator';
import { safeTrpcClient } from '@/lib/trpc';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState<string>('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  
  const {
    groupChats,
    currentGroupMembers,
    currentGroupMessages,
    fetchGroupMembers,
    fetchGroupMessages,
    sendGroupMessage,
    markGroupAsRead,
  } = useGroupChatStore();
  
  const { user } = useAuth();
  
  const currentGroup = groupChats.find(group => group.id === id);
  
  useEffect(() => {
    if (id) {
      fetchGroupMembers(id);
      fetchGroupMessages(id);
      markGroupAsRead(id);
    }
  }, [id, fetchGroupMembers, fetchGroupMessages, markGroupAsRead]);
  
  useEffect(() => {
    if (currentGroupMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentGroupMessages]);
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  const handleTyping = async (text: string) => {
    if (text.length > 1000) return;
    
    setMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      if (id) {
        await safeTrpcClient.setGroupTypingStatus(id, true);
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      if (id) {
        await safeTrpcClient.setGroupTypingStatus(id, false);
      }
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !id) return;
    
    try {
      // Clear typing status when sending message
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      await safeTrpcClient.setGroupTypingStatus(id, false);
      
      await sendGroupMessage(id, message.trim(), 'text', undefined, replyTo || undefined);
      setMessage('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };
  
  const handleStartGroupCall = (callType: 'voice' | 'video') => {
    router.push(`/group-call?groupId=${id}&callType=${callType}`);
  };
  
  const getInitials = (name: string) => {
    if (!name?.trim()) return 'U';
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const renderDefaultAvatar = (name: string, size: number = 40) => {
    const initials = getInitials(name);
    return (
      <View style={[styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
      </View>
    );
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };
  
  const MessageItem = ({ message: msg }: { message: any }) => {
    const isOwnMessage = msg.sender_id === user?.id;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
        {!isOwnMessage && (
          <View style={styles.senderInfo}>
            {msg.sender.avatar_url ? (
              <Image source={{ uri: msg.sender.avatar_url }} style={styles.messageAvatar} />
            ) : (
              renderDefaultAvatar(msg.sender.display_name, 30)
            )}
          </View>
        )}
        
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble]}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{msg.sender.display_name}</Text>
          )}
          
          {msg.reply_to && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyAuthor}>{msg.reply_to.sender.display_name}</Text>
              <Text style={styles.replyText} numberOfLines={2}>{msg.reply_to.content}</Text>
            </View>
          )}
          
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {msg.content}
          </Text>
          
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {formatTime(msg.created_at)}
          </Text>
        </View>
      </View>
    );
  };
  
  if (!currentGroup) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={styles.groupAvatar}>
            {currentGroup.avatar_url ? (
              <Image source={{ uri: currentGroup.avatar_url }} style={styles.headerAvatarImage} />
            ) : (
              <View style={styles.headerDefaultAvatar}>
                <Users color="white" size={20} />
              </View>
            )}
          </View>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{currentGroup.name}</Text>
            <Text style={styles.headerSubtitle}>
              {currentGroupMembers.length} members
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => handleStartGroupCall('voice')}
          >
            <Phone color="#FFFC00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => handleStartGroupCall('video')}
          >
            <Video color="#FFFC00" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push(`/group-settings?id=${id}`)}
          >
            <Settings color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {currentGroupMessages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        
        <TypingIndicator groupId={id} />
        
        {currentGroupMessages.length === 0 && (
          <View style={styles.emptyState}>
            <Users color="#666" size={48} />
            <Text style={styles.emptyText}>Welcome to {currentGroup.name}!</Text>
            <Text style={styles.emptySubtext}>Start the conversation by sending a message</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Reply Preview */}
      {replyTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyPreviewContent}>
            <Text style={styles.replyPreviewText}>Replying to message...</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyPreviewCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!message.trim()}
          >
            <Send color={message.trim() ? '#FFFC00' : '#666'} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatar: {
    marginRight: 12,
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerDefaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
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
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  senderInfo: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  ownMessageBubble: {
    backgroundColor: '#FFFC00',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#FFFC00',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  replyContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFC00',
  },
  replyAuthor: {
    color: '#FFFC00',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: '#999',
    fontSize: 12,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  messageTime: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(0,0,0,0.6)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,252,0,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,252,0,0.3)',
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewText: {
    color: '#FFFC00',
    fontSize: 14,
  },
  replyPreviewCancel: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#000',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,252,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});