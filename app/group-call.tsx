import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Mic, MicOff, VideoIcon, VideoOff, PhoneOff, Users, X } from 'lucide-react-native';
import { useGroupChatStore } from '@/stores/group-chat-store';
import { useCall } from '@/contexts/call-context';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isWeb = Platform.OS === ('web' as any);

export default function GroupCallScreen() {
  const { groupId, callType } = useLocalSearchParams<{ groupId: string; callType: 'voice' | 'video' }>();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(callType === 'voice');
  const [participants, setParticipants] = useState<any[]>([]);
  
  const insets = useSafeAreaInsets();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  const { groupChats, currentGroupMembers, fetchGroupMembers } = useGroupChatStore();
  const { localStream, toggleMute, toggleVideo, endCall } = useCall();
  const { user } = useAuth();
  
  const currentGroup = groupChats.find(group => group.id === groupId);
  
  useEffect(() => {
    if (groupId) {
      fetchGroupMembers(groupId);
    }
  }, [groupId, fetchGroupMembers]);
  
  useEffect(() => {
    if (localStream && isWeb && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
    }
  }, [localStream]);
  
  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };
  
  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff(!isVideoOff);
  };
  
  const handleEndCall = async () => {
    // TODO: Get actual call ID
    // await endCall(callId);
    router.replace('/(tabs)/chat');
  };

  const handleExitCall = () => {
    router.replace('/(tabs)/chat');
  };
  
  const getInitials = (name: string) => {
    if (!name?.trim()) return 'U';
    return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  const renderDefaultAvatar = (name: string, size: number = 80) => {
    const initials = getInitials(name);
    return (
      <View style={[styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initialsText, { fontSize: size * 0.3 }]}>{initials}</Text>
      </View>
    );
  };
  
  const renderVideo = (stream: MediaStream | null, isLocal: boolean = false) => {
    if (isWeb && stream) {
      return (
        <video
          ref={isLocal ? localVideoRef : undefined}
          autoPlay
          playsInline
          muted={isLocal}
          style={styles.videoElement}
        />
      );
    } else {
      return (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>
            {isLocal ? 'Your Video' : 'Participant Video'}
          </Text>
          <Text style={styles.videoPlaceholderSubtext}>
            {isWeb ? 'Loading...' : 'Mobile video coming soon'}
          </Text>
        </View>
      );
    }
  };
  
  const ParticipantTile = ({ member, isLocal = false }: { member: any; isLocal?: boolean }) => {
    const displayName = isLocal ? 'You' : member.user.display_name;
    const isVideoCall = callType === 'video';
    
    return (
      <View style={styles.participantTile}>
        {isVideoCall && !isVideoOff ? (
          <View style={styles.videoContainer}>
            {isLocal ? renderVideo(localStream, true) : renderVideo(null)}
            <View style={styles.participantOverlay}>
              <Text style={styles.participantName}>{displayName}</Text>
              {isMuted && isLocal && (
                <View style={styles.mutedIndicator}>
                  <MicOff color="white" size={12} />
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.audioOnlyContainer}>
            {member.user?.avatar_url ? (
              <Image source={{ uri: member.user.avatar_url }} style={styles.participantAvatar} />
            ) : (
              renderDefaultAvatar(displayName, 80)
            )}
            <Text style={styles.participantName}>{displayName}</Text>
            {isMuted && isLocal && (
              <View style={styles.mutedIndicator}>
                <MicOff color="white" size={16} />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };
  
  if (!currentGroup) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
      
      {/* Exit Button */}
      <TouchableOpacity style={styles.exitButton} onPress={handleExitCall}>
        <X color="white" size={24} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.groupInfo}>
          <View style={styles.groupAvatarContainer}>
            {currentGroup.avatar_url ? (
              <Image source={{ uri: currentGroup.avatar_url }} style={styles.groupAvatar} />
            ) : (
              <View style={styles.groupAvatarPlaceholder}>
                <Users color="white" size={20} />
              </View>
            )}
          </View>
          <View>
            <Text style={styles.groupName}>{currentGroup.name}</Text>
            <Text style={styles.callStatus}>
              {callType === 'video' ? 'Video Call' : 'Voice Call'} • {currentGroupMembers.length + 1} participants
            </Text>
          </View>
        </View>
      </View>
      
      {/* Participants Grid */}
      <ScrollView style={styles.participantsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.participantsGrid}>
          {/* Local user */}
          <ParticipantTile 
            member={{ user: { display_name: 'You', avatar_url: null } }} 
            isLocal={true} 
          />
          
          {/* Other participants */}
          {currentGroupMembers.map((member) => (
            <ParticipantTile key={member.id} member={member} />
          ))}
        </View>
      </ScrollView>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, isMuted && styles.controlButtonActive]} 
          onPress={handleToggleMute}
        >
          {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
        </TouchableOpacity>
        
        {callType === 'video' && (
          <TouchableOpacity 
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]} 
            onPress={handleToggleVideo}
          >
            {isVideoOff ? <VideoOff color="white" size={24} /> : <VideoIcon color="white" size={24} />}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <PhoneOff color="white" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatarContainer: {
    marginRight: 12,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  groupAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  callStatus: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  participantsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  participantTile: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoPlaceholderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoPlaceholderSubtext: {
    color: '#666',
    fontSize: 12,
  },
  audioOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  participantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  participantOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mutedIndicator: {
    backgroundColor: 'rgba(255,59,48,0.8)',
    borderRadius: 12,
    padding: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#FF3B30',
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
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
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});