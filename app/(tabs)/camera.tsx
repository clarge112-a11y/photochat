import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity
} from 'react-native';
import { 
  RotateCcw, 
  Circle, 
  Square, 
  Zap, 
  ZapOff, 
  Smile,
  Download
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSnapStore } from '@/stores/snap-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { addSnap } = useSnapStore();
  const insets = useSafeAreaInsets();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need camera access to take photos and videos</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current: 'off' | 'on') => (current === 'off' ? 'on' : 'off'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        
        if (photo) {
          addSnap({
            id: Date.now().toString(),
            type: 'photo',
            uri: photo.uri,
            timestamp: Date.now(),
            duration: 10,
          });
          
          router.push('/snap-preview');
        }
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
        });
        
        if (video) {
          addSnap({
            id: Date.now().toString(),
            type: 'video',
            uri: video.uri,
            timestamp: Date.now(),
            duration: 10,
          });
          
          router.push('/snap-preview');
        }
      } catch (error) {
        console.error('Error recording video:', error);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing={facing}
        flash={flash}
      >
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              {flash === 'on' ? (
                <Zap color="#FFFC00" size={24} />
              ) : (
                <ZapOff color="white" size={24} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton}>
              <Smile color="white" size={24} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton}>
              <Download color="white" size={24} />
            </TouchableOpacity>
          </View>

          {/* Side Navigation Hints */}
          <View style={styles.sideHints}>
            <TouchableOpacity 
              style={styles.sideHint}
              onPress={() => router.push('/stories')}
            >
              <Text style={styles.sideHintText}>Stories</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sideHint, styles.rightHint]}
              onPress={() => router.push('/chat')}
            >
              <Text style={styles.sideHintText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.galleryButton}>
              <View style={styles.galleryPreview} />
            </TouchableOpacity>

            <View style={styles.captureContainer}>
              <TouchableOpacity
                style={[styles.captureButton, isRecording && styles.recordingButton]}
                onPress={takePicture}
                onLongPress={startRecording}
                onPressOut={stopRecording}
              >
                <View style={[styles.captureInner, isRecording && styles.recordingInner]}>
                  {isRecording ? (
                    <Square color="red" size={20} fill="red" />
                  ) : (
                    <Circle color="white" size={60} />
                  )}
                </View>
              </TouchableOpacity>
              
              <Text style={styles.captureHint}>
                {isRecording ? 'Recording...' : 'Hold for video'}
              </Text>
            </View>

            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <RotateCcw color="white" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#FFFC00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: 'black',
    fontWeight: '600',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideHints: {
    flex: 1,
    justifyContent: 'center',
  },
  sideHint: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  rightHint: {
    right: 20,
    left: 'auto' as any,
  },
  sideHintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  galleryButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  galleryPreview: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInner: {
    backgroundColor: 'red',
  },
  captureHint: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});