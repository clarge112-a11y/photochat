import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCall } from '@/contexts/call-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function IncomingCallScreen() {
  const { } = useLocalSearchParams<{ callId: string }>();
  const { incomingCall, answerCall, declineCall, isAnsweringCall, isDecliningCall } = useCall();

  useEffect(() => {
    // If no incoming call, go back
    if (!incomingCall) {
      router.back();
    }
  }, [incomingCall]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    try {
      await answerCall(incomingCall.id);
      router.replace({ pathname: '/call', params: { callId: incomingCall.id } });
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    
    try {
      await declineCall(incomingCall.id);
      router.back();
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  if (!incomingCall) {
    return null;
  }

  const caller = incomingCall.caller;
  const isVideoCall = incomingCall.call_type === 'video';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.gradient}
      >
        {/* Caller Info */}
        <View style={styles.callerSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: caller.avatar_url || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
          </View>
          
          <Text style={styles.callerName}>{caller.display_name}</Text>
          <Text style={styles.callType}>
            Incoming {isVideoCall ? 'video' : 'voice'} call
          </Text>
        </View>

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            disabled={isDecliningCall}
          >
            <PhoneOff color="white" size={32} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.answerButton]}
            onPress={handleAnswer}
            disabled={isAnsweringCall}
          >
            {isVideoCall ? (
              <Video color="white" size={32} />
            ) : (
              <Phone color="white" size={32} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionText}>
            Swipe up for more options
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  callerSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
    shadowColor: '#FFFC00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FFFC00',
  },
  callerName: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  callType: {
    color: '#999',
    fontSize: 18,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: width * 0.6,
    marginBottom: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  answerButton: {
    backgroundColor: '#4CAF50',
  },
  quickActions: {
    alignItems: 'center',
  },
  quickActionText: {
    color: '#666',
    fontSize: 14,
  },
});