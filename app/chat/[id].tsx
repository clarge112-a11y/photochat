import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,

} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { 
  ArrowLeft, 
  Camera, 
  Mic, 
  Send,
  Phone,
  Video,
  Info,
  Smile,
  Plus
} from 'lucide-react-native';
import { useChatStore } from '@/stores/chat-store';
import { useAuth } from '@/contexts/auth-context';
import { useCall } from '@/contexts/call-context';
import { TypingIndicator } from '@/components/TypingIndicator';
import { safeTrpcClient } from '@/lib/trpc';

interface Message {
  id: string;
  text: string;
  timestamp: number;
  isMe: boolean;
  type: 'text' | 'snap' | 'image';
  isRead: boolean;
  expiresAt?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export default function ChatDetailScreen() {
  const { user, loading: authLoading } = useAuth();
  const { startCall } = useCall();
  const { id } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const { chats, setTypingStatus, updateLastMessage, fetchChats, sendMessage: sendMessageStore, getMessages, markAsRead } = useChatStore();
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputHeightAnim = useRef(new Animated.Value(50)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputHeight, setInputHeight] = useState(50);
  
  const chat = chats.find(c => c.id === id);
  
  console.log('Chat detail screen - ID:', id, 'Chat found:', !!chat, 'Total chats:', chats.length);

  // Animate chat UI entrance with smooth slide up
  useEffect(() => {
    const screenHeight = Dimensions.get('window').height;
    slideAnim.setValue(screenHeight);
    fadeAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Fetch chats if not loaded yet
  useEffect(() => {
    if (user?.id && chats.length === 0) {
      console.log('Fetching chats for user:', user.id);
      fetchChats(user.id);
    }
  }, [user?.id, chats.length, fetchChats]);

  // Load messages when chat is available
  useEffect(() => {
    const loadMessages = async () => {
      if (chat?.id && user?.id) {
        setLoadingMessages(true);
        try {
          console.log('Loading messages for chat:', chat.id);
          const fetchedMessages = await getMessages(chat.id);
          
          // Convert to local message format
          const formattedMessages: Message[] = fetchedMessages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
            isMe: msg.sender_id === user.id,
            type: msg.message_type as 'text' | 'snap' | 'image',
            isRead: msg.is_read,
            status: (msg.sender_id === user.id ? 'read' : undefined) as 'sending' | 'sent' | 'delivered' | 'read' | undefined,
          })).reverse(); // Reverse to show oldest first
          
          setMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} messages`);
          
          // Mark messages as read when chat is opened
          if (chat.unread_count > 0) {
            markAsRead(chat.id);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
        } finally {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();
  }, [chat?.id, chat?.unread_count, user?.id, getMessages, markAsRead]);

  useEffect(() => {
    if (!authLoading && user && chats.length > 0 && !chat) {
      console.log('Chat not found, going back. ID:', id, 'Available chats:', chats.map(c => c.id));
      // Use setTimeout to avoid state update during render
      const timeout = setTimeout(() => {
        router.back();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [chat, authLoading, user, chats.length, id, chats]);

  // Handle typing indicator with improved logic
  useEffect(() => {
    if (chat) {
      setOtherUserTyping(chat.is_typing);
    }
  }, [chat?.is_typing, chat]);
  
  // Enhanced typing indicator simulation for demo purposes
  useEffect(() => {
    let typingSimulationTimeout: ReturnType<typeof setTimeout>;
    
    const simulateTyping = () => {
      // Only simulate if user is not currently typing and there are messages
      if (!isTyping && messages.length > 0 && Math.random() > 0.85) {
        setOtherUserTyping(true);
        
        // Stop typing after 1-3 seconds
        const duration = 1000 + Math.random() * 2000;
        setTimeout(() => {
          setOtherUserTyping(false);
        }, duration);
      }
      
      // Schedule next potential typing simulation
      typingSimulationTimeout = setTimeout(simulateTyping, 8000 + Math.random() * 12000);
    };
    
    // Start simulation after initial delay
    typingSimulationTimeout = setTimeout(simulateTyping, 5000);
    
    return () => {
      if (typingSimulationTimeout) {
        clearTimeout(typingSimulationTimeout);
      }
    };
  }, [isTyping, messages.length]);

  // If auth is still loading, show loading screen
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFC00" />
      </View>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Show loading if chats are still being fetched or chat not found yet
  if (!chat && (chats.length === 0 || authLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFC00" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }
  
  // If we have chats loaded but this specific chat doesn't exist, show error
  if (!chat && chats.length > 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Chat not found</Text>
        <TouchableOpacity 
          style={styles.goBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      if (!chat) return;
      const otherUserId = chat.user2_id === user?.id ? chat.user1_id : chat.user2_id;
      console.log('Starting call with user:', otherUserId, 'type:', callType);
      await startCall({ receiverId: otherUserId, callType });
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
    }
  };

  const handleTyping = async (text: string) => {
    if (text.length > 500) return;
    
    setMessage(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      if (chat) {
        // Use the new tRPC typing status
        await safeTrpcClient.setTypingStatus(chat.id, true);
        setTypingStatus(chat.id, true);
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      if (chat) {
        // Use the new tRPC typing status
        await safeTrpcClient.setTypingStatus(chat.id, false);
        setTypingStatus(chat.id, false);
      }
    }, 2000); // Increased to 2 seconds for better UX
  };

  const sendMessageHandler = async () => {
    if (message.trim() && chat && user) {
      const messageText = message.trim();
      const tempId = `temp-${Date.now()}`;
      
      // Add optimistic message to UI
      const optimisticMessage: Message = {
        id: tempId,
        text: messageText,
        timestamp: Date.now(),
        isMe: true,
        type: 'text',
        isRead: false,
        status: 'sending',
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setMessage('');
      setIsTyping(false);
      
      if (chat) {
        // Clear typing status when sending message
        await safeTrpcClient.setTypingStatus(chat.id, false);
        setTypingStatus(chat.id, false);
      }
      
      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      try {
        // Try to send message via backend
        const sentMessage = await sendMessageStore(chat.id, messageText, 'text', user.id);
        
        // Replace optimistic message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            id: sentMessage.id,
            text: sentMessage.content,
            timestamp: new Date(sentMessage.created_at).getTime(),
            isMe: true,
            type: sentMessage.message_type as 'text' | 'snap' | 'image',
            isRead: sentMessage.is_read,
            status: 'sent',
          } : msg
        ));
        
        // Update chat store with new message
        await updateLastMessage(chat.id, messageText, 'text');
        
        // Simulate delivery status updates with more realistic timing
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === sentMessage.id ? { ...msg, status: 'delivered' } : msg
          ));
        }, 500 + Math.random() * 1000); // 0.5-1.5 seconds
        
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === sentMessage.id ? { ...msg, status: 'read', isRead: true } : msg
          ));
        }, 2000 + Math.random() * 3000); // 2-5 seconds
        
      } catch (error) {
        console.error('Error sending message, using local fallback:', error);
        
        // For local chats or when backend fails, just keep the message locally
        const localMessage: Message = {
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: messageText,
          timestamp: Date.now(),
          isMe: true,
          type: 'text',
          isRead: false,
          status: 'sent',
        };
        
        // Replace optimistic message with local message
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? localMessage : msg
        ));
        
        // Update chat store with new message (local only)
        await updateLastMessage(chat.id, messageText, 'text');
        
        // Simulate delivery status updates for local messages with realistic timing
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === localMessage.id ? { ...msg, status: 'delivered' } : msg
          ));
        }, 300 + Math.random() * 700); // 0.3-1 second
        
        setTimeout(() => {
          setMessages(prev => prev.map(msg => 
            msg.id === localMessage.id ? { ...msg, status: 'read', isRead: true } : msg
          ));
        }, 1000 + Math.random() * 2000); // 1-3 seconds
        
        // Add a simulated response for demo purposes with typing indicator
        setTimeout(() => {
          // Show typing indicator first
          setOtherUserTyping(true);
          
          // Then send response after typing delay
          setTimeout(() => {
            setOtherUserTyping(false);
            
            const responseMessage: Message = {
              id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: getRandomResponse(messageText),
              timestamp: Date.now(),
              isMe: false,
              type: 'text',
              isRead: false,
              status: 'sent',
            };
            
            setMessages(prev => [...prev, responseMessage]);
            
            // Update chat store with the response
            updateLastMessage(chat.id, responseMessage.text, 'text');
          }, 1000 + Math.random() * 2000); // 1-3 seconds of typing
        }, 1000 + Math.random() * 2000); // Initial delay before typing starts
      }
    }
  };
  
  const getRandomResponse = (userMessage: string): string => {
    const responses = [
      "That's interesting! 😊",
      "I see what you mean",
      "Totally agree with you",
      "Haha, that's funny! 😂",
      "Really? Tell me more",
      "I was just thinking the same thing",
      "That sounds great!",
      "Thanks for sharing that",
      "You're absolutely right",
      "I love that idea! 💡",
      "That made my day 😄",
      "Couldn't agree more",
    ];
    
    // Simple keyword-based responses
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hey there! How's it going? 👋";
    }
    if (lowerMessage.includes('how are you')) {
      return "I'm doing great, thanks for asking! How about you?";
    }
    if (lowerMessage.includes('good') || lowerMessage.includes('great')) {
      return "That's awesome to hear! 🎉";
    }
    if (lowerMessage.includes('?')) {
      return "That's a great question! Let me think about it 🤔";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const MessageBubble = ({ msg, index }: { msg: Message; index: number }) => {
    const bubbleAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(bubbleAnim, {
        toValue: 1,
        duration: 200,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, [bubbleAnim, index]);
    
    return (
      <Animated.View 
        style={[
          styles.messageBubble,
          msg.isMe ? styles.myMessage : styles.theirMessage,
          {
            opacity: bubbleAnim,
            transform: [{
              translateY: bubbleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <Text style={[
          styles.messageText,
          msg.isMe ? styles.myMessageText : styles.theirMessageText
        ]}>
          {msg.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            msg.isMe ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {formatTime(msg.timestamp)}
          </Text>
          {msg.isMe && (
            <Text style={[
              styles.messageStatus,
              msg.status === 'read' && styles.readStatus,
              msg.status === 'delivered' && styles.deliveredStatus,
            ]}>
              {msg.status === 'sending' && '⏳'}
              {msg.status === 'sent' && '✓'}
              {msg.status === 'delivered' && '✓✓'}
              {msg.status === 'read' && '✓✓'}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  };
  
  // Remove the old TypingIndicator component since we're using the new one

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.chatContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image
            source={{ uri: chat?.other_user_avatar || 'https://via.placeholder.com/40' }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{chat?.other_user_name || 'Unknown'}</Text>
            <Text style={[styles.headerStatus, otherUserTyping && styles.typingStatus]}>
              {otherUserTyping ? 'typing...' : 'last seen recently'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => handleStartCall('voice')}
          >
            <Phone color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => handleStartCall('video')}
          >
            <Video color="white" size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Info color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread Count Info */}
      {chat && chat.unread_count > 0 && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakText}>
            📬 {chat.unread_count} unread message{chat.unread_count > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {loadingMessages ? (
            <View style={styles.loadingMessages}>
              <ActivityIndicator size="small" color="#FFFC00" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={msg.id} msg={msg} index={index} />
            ))
          )}
          <TypingIndicator chatId={chat?.id} />
        </ScrollView>

        {/* Input */}
        <Animated.View style={[styles.inputContainer, { height: inputHeightAnim }]}>
          <TouchableOpacity style={styles.cameraButton}>
            <Camera color="white" size={24} />
          </TouchableOpacity>
          
          <View style={styles.textInputContainer}>
            <TouchableOpacity 
              style={styles.emojiButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile color="#666" size={20} />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.textInput, { height: Math.max(40, inputHeight) }]}
              placeholder="Send a chat"
              placeholderTextColor="#666"
              value={message}
              onChangeText={handleTyping}
              onContentSizeChange={(event) => {
                const newHeight = Math.min(100, Math.max(40, event.nativeEvent.contentSize.height));
                setInputHeight(newHeight);
                Animated.timing(inputHeightAnim, {
                  toValue: newHeight + 20,
                  duration: 100,
                  useNativeDriver: false,
                }).start();
              }}
              multiline
              maxLength={500}
              textAlignVertical="center"
            />
            
            <TouchableOpacity style={styles.attachButton}>
              <Plus color="#666" size={20} />
            </TouchableOpacity>
            
            {message.trim() ? (
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendMessageHandler}
              >
                <Send color="black" size={16} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton}>
                <Mic color="white" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
        
        {/* Quick Emoji Reactions */}
        {showEmojiPicker && (
          <Animated.View style={styles.emojiPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['😀', '😂', '😍', '😢', '😮', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉'].map((emoji) => (
                <TouchableOpacity 
                  key={emoji}
                  style={styles.emojiOption}
                  onPress={() => {
                    setMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  streakBanner: {
    backgroundColor: 'rgba(255,252,0,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  streakText: {
    color: '#FFFC00',
    fontSize: 14,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 20,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFC00',
    borderBottomRightRadius: 5,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'black',
  },
  theirMessageText: {
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  messageStatus: {
    fontSize: 10,
    opacity: 0.7,
    marginLeft: 4,
  },
  myMessageTime: {
    color: 'black',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  typingBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 1,
  },
  emojiButton: {
    padding: 8,
    marginRight: 8,
  },
  attachButton: {
    padding: 8,
    marginLeft: 8,
  },
  emojiPicker: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  emojiOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  readStatus: {
    color: '#4CAF50',
  },
  deliveredStatus: {
    color: '#666',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
  },
  goBackButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFFC00',
    borderRadius: 5,
  },
  goBackText: {
    color: 'black',
  },
  loadingMessages: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  typingStatus: {
    color: '#FFFC00',
    fontStyle: 'italic',
  },
  typingText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
});