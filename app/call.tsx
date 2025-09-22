import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Speaker,
  MessageCircle,
  X 
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCall } from '@/contexts/call-context';
import { LinearGradient } from 'expo-linear-gradient';



export default function CallScreen() {
  const { } = useLocalSearchParams<{ callId: string }>();
  const { currentCall, endCall, toggleMute, toggleVideo, localStream, remoteStream } = useCall();
  
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start call timer
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Set up video streams for web
    if (Platform.OS === 'web') {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [localStream, remoteStream]);

  useEffect(() => {
    // If no current call, go back
    if (!currentCall) {
      router.back();
    }
  }, [currentCall]);

  const handleEndCall = async () => {
    if (!currentCall) return;
    
    try {
      await endCall(currentCall.id);
      router.replace('/(tabs)/chat');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleExitCall = () => {
    router.replace('/(tabs)/chat');
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker toggle would need native implementation
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentCall) {
    return null;
  }

  const otherUser = currentCall.caller_id === currentCall.receiver.id ? currentCall.caller : currentCall.receiver;
  const isVideoCall = currentCall.call_type === 'video';

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={styles.gradient}
      >
        {/* Video Views */}
        {isVideoCall && Platform.OS === 'web' && (
          <View style={styles.videoContainer}>
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              style={styles.remoteVideo}
              autoPlay
              playsInline
            />
            
            {/* Local Video */}
            <video
              ref={localVideoRef}
              style={styles.localVideo}
              autoPlay
              playsInline
              muted
            />
          </View>
        )}

        {/* Exit Button */}
        <TouchableOpacity style={styles.exitButton} onPress={handleExitCall}>
          <X color="white" size={24} />
        </TouchableOpacity>

        {/* Call Info */}
        <View style={[styles.callInfo, isVideoCall && styles.callInfoOverlay]}>
          <View style={styles.userInfo}>
            {!isVideoCall && (
              <Image
                source={{ uri: otherUser.avatar_url || 'https://via.placeholder.com/120' }}
                style={styles.avatar}
              />
            )}
            <Text style={styles.userName}>{otherUser.display_name}</Text>
            <Text style={styles.callStatus}>
              {formatDuration(callDuration)}
            </Text>
          </View>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.topControls}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
            >
              {isMuted ? (
                <MicOff color="white" size={24} />
              ) : (
                <Mic color="white" size={24} />
              )}
            </TouchableOpacity>

            {isVideoCall && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={handleToggleVideo}
              >
                {isVideoEnabled ? (
                  <Video color="white" size={24} />
                ) : (
                  <VideoOff color="white" size={24} />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={handleToggleSpeaker}
            >
              <Speaker color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <MessageCircle color="white" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
            >
              <PhoneOff color="white" size={32} />
            </TouchableOpacity>
          </View>
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
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    objectFit: 'cover',
    borderWidth: 2,
    borderColor: '#FFFC00',
  } as any,
  callInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  callInfoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    flex: 0,
    paddingTop: 80,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FFFC00',
  },
  userName: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  callStatus: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
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
    backgroundColor: '#FFFC00',
  },
  bottomControls: {
    alignItems: 'center',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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