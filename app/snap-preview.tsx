import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { 
  X, 
  Download, 
  Send, 
  Type, 
  Smile,
  Clock,
  Users
} from 'lucide-react-native';
import { useSnapStore } from '@/stores/snap-store';
import { useChatStore } from '@/stores/chat-store';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function SnapPreviewScreen() {
  const [caption, setCaption] = useState('');
  const [timer, setTimer] = useState(10);
  const [showFriends, setShowFriends] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { currentSnap } = useSnapStore();
  const { friends } = useChatStore();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  if (!currentSnap) {
    router.back();
    return null;
  }

  const handleSend = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    console.log('Sending snap to:', selectedFriends);
    console.log('Caption:', caption);
    console.log('Timer:', timer);
    
    router.back();
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Snap Preview */}
      <View style={styles.snapContainer}>
        <Image
          source={{ uri: currentSnap.uri }}
          style={styles.snapImage}
          contentFit="cover"
        />
        
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => router.back()}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          
          <View style={styles.timerContainer}>
            <Clock color="white" size={16} />
            <Text style={styles.timerText}>{timer}s</Text>
          </View>
          
          <TouchableOpacity style={styles.controlButton}>
            <Download color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Caption Input */}
        {caption.length > 0 && (
          <View style={styles.captionOverlay}>
            <Text style={styles.captionText}>{caption}</Text>
          </View>
        )}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Caption Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor="#666"
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          
          <TouchableOpacity style={styles.inputButton}>
            <Type color="white" size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.inputButton}>
            <Smile color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Timer Selection */}
        <View style={styles.timerSection}>
          <Text style={styles.sectionLabel}>Timer</Text>
          <View style={styles.timerOptions}>
            {[1, 3, 5, 10].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timerOption,
                  timer === time && styles.timerOptionActive
                ]}
                onPress={() => setTimer(time)}
              >
                <Text style={[
                  styles.timerOptionText,
                  timer === time && styles.timerOptionTextActive
                ]}>
                  {time}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Friends Selection */}
        <View style={styles.friendsSection}>
          <TouchableOpacity 
            style={styles.friendsSectionHeader}
            onPress={() => setShowFriends(!showFriends)}
          >
            <Text style={styles.sectionLabel}>Send to</Text>
            <Users color="white" size={20} />
          </TouchableOpacity>
          
          {showFriends && (
            <View style={styles.friendsList}>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    selectedFriends.includes(friend.id) && styles.friendItemSelected
                  ]}
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <Image
                    source={{ uri: friend.avatar }}
                    style={styles.friendAvatar}
                  />
                  <Text style={styles.friendName}>{friend.name}</Text>
                  {selectedFriends.includes(friend.id) && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity 
          style={[
            styles.sendButton,
            selectedFriends.length === 0 && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={selectedFriends.length === 0}
        >
          <Send color={selectedFriends.length > 0 ? "black" : "#666"} size={20} />
          <Text style={[
            styles.sendButtonText,
            selectedFriends.length === 0 && styles.sendButtonTextDisabled
          ]}>
            Send to {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  snapContainer: {
    flex: 1,
    position: 'relative',
  },
  snapImage: {
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  timerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 15,
  },
  captionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomSection: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
  },
  captionInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 80,
  },
  inputButton: {
    marginLeft: 10,
    padding: 5,
  },
  timerSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  timerOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  timerOption: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timerOptionActive: {
    backgroundColor: '#FFFC00',
  },
  timerOptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  timerOptionTextActive: {
    color: 'black',
  },
  friendsSection: {
    marginBottom: 20,
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  friendsList: {
    gap: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(255,252,0,0.2)',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFC00',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFC00',
    paddingVertical: 15,
    borderRadius: 25,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sendButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sendButtonTextDisabled: {
    color: '#666',
  },
});