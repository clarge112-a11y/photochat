import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Peer, MediaConnection } from 'peerjs';
import { Mic, MicOff, VideoIcon, VideoOff, Phone, PhoneOff } from 'lucide-react-native';

// Type guard for web platform
const isWeb = Platform.OS === ('web' as any);

interface VideoChatProps {
  onClose?: () => void;
}

export default function VideoChat({ onClose }: VideoChatProps) {
  // Remove unused variable
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [call, setCall] = useState<MediaConnection | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Disconnected');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializePeer();
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    
    init();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializePeer = async () => {
    try {
      // Get user media first
      const stream = await getUserMedia();
      setLocalStream(stream);
      
      if (isWeb && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      // Initialize PeerJS - use public server for reliability
      console.log('Initializing PeerJS with public server');
      const peerInstance = new Peer({
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peerInstance.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        setMyPeerId(id);
        setStatus('Ready');
      });

      peerInstance.on('call', (incomingCall) => {
        console.log('Receiving call from:', incomingCall.peer);
        setStatus('Incoming call...');
        
        // Auto-answer the call
        incomingCall.answer(stream);
        setCall(incomingCall);
        setIsInCall(true);
        setStatus('Connected');
        
        incomingCall.on('stream', (remoteStream) => {
          console.log('Received remote stream');
          setRemoteStream(remoteStream);
          
          if (isWeb && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
        
        incomingCall.on('close', () => {
          console.log('Call ended');
          setIsInCall(false);
          setStatus('Disconnected');
          setRemoteStream(null);
          setCall(null);
        });
      });

      peerInstance.on('error', (error) => {
        console.error('Peer error:', error);
        setStatus('Error: ' + error.message);
      });

      setPeer(peerInstance);
      setIsConnected(true);
      
      console.log('Video chat initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      setStatus('Failed to initialize');
      if (isWeb) {
        console.error('Failed to access camera/microphone');
      } else {
        Alert.alert('Error', 'Failed to access camera/microphone');
      }
    }
  };

  const getUserMedia = async (): Promise<MediaStream> => {
    if (isWeb) {
      try {
        const stream = await (navigator as any).mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        console.log('Successfully got user media');
        return stream;
      } catch (error) {
        console.error('Failed to get user media:', error);
        throw error;
      }
    } else {
      // For mobile, we'll need to use expo-camera or react-native-webrtc
      // For now, return a mock stream
      throw new Error('Mobile video calling not implemented yet');
    }
  };





  const startCall = () => {
    if (!peer || !localStream || !remotePeerId.trim()) {
      if (isWeb) {
        console.error('Please enter a valid Peer ID');
      } else {
        Alert.alert('Error', 'Please enter a valid Peer ID');
      }
      return;
    }

    console.log('Calling peer:', remotePeerId);
    setStatus('Calling...');
    
    const outgoingCall = peer.call(remotePeerId, localStream);
    setCall(outgoingCall);
    setIsInCall(true);
    
    outgoingCall.on('stream', (remoteStream) => {
      console.log('Received remote stream');
      setRemoteStream(remoteStream);
      setStatus('Connected');
      
      if (isWeb && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
    
    outgoingCall.on('close', () => {
      console.log('Call ended');
      setIsInCall(false);
      setStatus('Disconnected');
      setRemoteStream(null);
      setCall(null);
    });
  };

  const hangUp = () => {
    if (call) {
      call.close();
    }
    setIsInCall(false);
    setStatus('Ready');
    setRemoteStream(null);
    setCall(null);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    console.log('Cleaning up video chat resources');
    if (call) {
      call.close();
    }
    if (peer) {
      peer.destroy();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCall(null);
    setPeer(null);
  };

  const renderVideo = (stream: MediaStream | null, isLocal: boolean) => {
    if (isWeb) {
      return (
        <video
          ref={isLocal ? localVideoRef : remoteVideoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={styles.videoElement}
        />
      );
    } else {
      // For mobile, we would use react-native-webrtc or expo-camera
      return (
        <View style={[styles.videoPlaceholder, { backgroundColor: isLocal ? '#2a2a2a' : '#1a1a1a' }]}>
          <Text style={styles.videoPlaceholderText}>
            {isLocal ? 'Local Video' : 'Remote Video'}
          </Text>
          <Text style={styles.videoPlaceholderSubtext}>
            {isWeb ? 'Loading...' : 'Mobile video coming soon'}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { 
          color: status === 'Connected' ? '#4CAF50' : 
                 status === 'Ready' ? '#2196F3' : 
                 status.includes('Error') ? '#F44336' : '#FFC107'
        }]}>
          {status}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {/* Local Video */}
        <View style={styles.localVideo}>
          <Text style={styles.videoLabel}>You</Text>
          {renderVideo(localStream, true)}
        </View>

        {/* Remote Video */}
        <View style={styles.remoteVideo}>
          <Text style={styles.videoLabel}>Remote</Text>
          {renderVideo(remoteStream, false)}
        </View>
      </View>

      {/* Peer ID Display */}
      <View style={styles.peerIdContainer}>
        <Text style={styles.peerIdLabel}>Your Peer ID:</Text>
        <Text style={styles.peerIdText}>{myPeerId || 'Generating...'}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!isInCall ? (
          <>
            <TextInput
              style={styles.peerInput}
              placeholder="Enter Peer ID to call"
              placeholderTextColor="#666"
              value={remotePeerId}
              onChangeText={setRemotePeerId}
            />
            <TouchableOpacity 
              style={[styles.callButton, !isConnected && styles.disabledButton]} 
              onPress={startCall}
              disabled={!isConnected}
            >
              <Phone color="white" size={20} />
              <Text style={styles.buttonText}>Start Call</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.hangUpButton} onPress={hangUp}>
            <PhoneOff color="white" size={20} />
            <Text style={styles.buttonText}>Hang Up</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media Controls */}
      {isInCall && (
        <View style={styles.mediaControls}>
          <TouchableOpacity 
            style={[styles.mediaButton, isMuted && styles.mediaButtonActive]} 
            onPress={toggleMute}
          >
            {isMuted ? <MicOff color="white" size={20} /> : <Mic color="white" size={20} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mediaButton, isVideoOff && styles.mediaButtonActive]} 
            onPress={toggleVideo}
          >
            {isVideoOff ? <VideoOff color="white" size={20} /> : <VideoIcon color="white" size={20} />}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  videoContainer: {
    flexDirection: 'row',
    height: 300,
    marginBottom: 20,
    gap: 10,
  },
  localVideo: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  videoLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  videoPlaceholderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  videoPlaceholderSubtext: {
    color: '#666',
    fontSize: 12,
  },
  peerIdContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  peerIdLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  peerIdText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  peerInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 15,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  hangUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  mediaButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButtonActive: {
    backgroundColor: '#F44336',
  },
  videoElement: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
});