import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { safeTrpcClient } from '@/lib/trpc';

interface TypingIndicatorProps {
  chatId?: string;
  groupId?: string;
  refreshInterval?: number;
}

interface TypingUser {
  id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  chatId,
  groupId,
  refreshInterval = 5000,
}) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [dotAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!chatId && !groupId) return;

    const fetchTypingStatus = async () => {
      try {
        const result = await safeTrpcClient.getTypingStatus(chatId, groupId);
        if (result.success && result.data) {
          setTypingUsers(result.data.typingUsers || []);
        } else {
          // Clear typing users if request failed
          setTypingUsers([]);
          // Only log error if it's not a connection issue
          if (result.error && !result.error.includes('Failed to fetch')) {
            console.log('tRPC get typing status failed:', result.error);
          }
        }
      } catch (error) {
        // Silently handle errors and clear typing users
        setTypingUsers([]);
        // Only log non-network errors
        if (error instanceof Error && !error.message.includes('Failed to fetch')) {
          console.log('Typing status fetch error:', error.message);
        }
      }
    };

    // Initial fetch with a small delay to allow backend to be ready
    const initialTimeout = setTimeout(fetchTypingStatus, 1000);

    // Set up polling with longer interval to reduce load
    const interval = setInterval(fetchTypingStatus, Math.max(refreshInterval, 10000));

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [chatId, groupId, refreshInterval]);

  useEffect(() => {
    if (typingUsers.length > 0) {
      // Start dot animation
      const animateLoop = () => {
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(animateLoop);
      };
      animateLoop();
    } else {
      dotAnimation.setValue(0);
    }
  }, [typingUsers.length, dotAnimation]);

  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user.display_name || typingUsers[0].user.username} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user.display_name || typingUsers[0].user.username} and ${typingUsers[1].user.display_name || typingUsers[1].user.username} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{getTypingText()}</Text>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1, 0.3],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dotAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.3],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 1,
  },
});