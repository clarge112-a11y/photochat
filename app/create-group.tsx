import React, { useState, useEffect } from 'react';
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
import { Stack, router } from 'expo-router';
import { ArrowLeft, Users, Check, Search } from 'lucide-react-native';
import { useGroupChatStore } from '@/stores/group-chat-store';
import { useFriends } from '@/contexts/friends-context';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
  const insets = useSafeAreaInsets();
  const { createGroupChat } = useGroupChatStore();
  const { friends } = useFriends();
  const { user } = useAuth();
  
  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };
  
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const groupId = await createGroupChat(
        groupName.trim(),
        groupDescription.trim() || undefined,
        selectedFriends
      );
      
      if (groupId) {
        router.replace(`/group-chat/${groupId}`);
      } else {
        Alert.alert('Error', 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };
  
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
  
  const FriendItem = ({ friend }: { friend: any }) => {
    const isSelected = selectedFriends.includes(friend.id);
    
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.selectedFriendItem]}
        onPress={() => handleToggleFriend(friend.id)}
      >
        <View style={styles.friendInfo}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
          ) : (
            renderDefaultAvatar(friend.display_name)
          )}
          
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{friend.display_name}</Text>
            <Text style={styles.friendUsername}>@{friend.username}</Text>
          </View>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkedCheckbox]}>
          {isSelected && <Check color="white" size={16} />}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Group</Text>
        
        <TouchableOpacity
          style={[styles.createButton, (!groupName.trim() || selectedFriends.length === 0 || isCreating) && styles.createButtonDisabled]}
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedFriends.length === 0 || isCreating}
        >
          <Text style={[styles.createButtonText, (!groupName.trim() || selectedFriends.length === 0 || isCreating) && styles.createButtonTextDisabled]}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Group Info */}
        <View style={styles.groupInfoSection}>
          <View style={styles.groupAvatarContainer}>
            <View style={styles.groupAvatarPlaceholder}>
              <Users color="white" size={32} />
            </View>
          </View>
          
          <View style={styles.groupInputs}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name"
              placeholderTextColor="#666"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
            
            <TextInput
              style={styles.groupDescriptionInput}
              placeholder="Group description (optional)"
              placeholderTextColor="#666"
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={200}
              multiline
            />
          </View>
        </View>
        
        {/* Selected Friends Count */}
        {selectedFriends.length > 0 && (
          <View style={styles.selectedCountContainer}>
            <Text style={styles.selectedCountText}>
              {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}
        
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
        
        {/* Friends List */}
        <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Select Friends</Text>
          
          {filteredFriends.map((friend) => (
            <FriendItem key={friend.id} friend={friend} />
          ))}
          
          {filteredFriends.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No friends found' : 'No friends available'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Add friends to create groups'}
              </Text>
            </View>
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFC00',
  },
  createButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  createButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  groupInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  groupAvatarContainer: {
    marginRight: 16,
  },
  groupAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInputs: {
    flex: 1,
  },
  groupNameInput: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    paddingVertical: 4,
  },
  groupDescriptionInput: {
    color: '#999',
    fontSize: 14,
    paddingVertical: 4,
    maxHeight: 60,
  },
  selectedCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,252,0,0.1)',
  },
  selectedCountText: {
    color: '#FFFC00',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    marginVertical: 16,
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
  friendsList: {
    flex: 1,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedFriendItem: {
    backgroundColor: 'rgba(255,252,0,0.1)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendUsername: {
    color: '#666',
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#FFFC00',
    borderColor: '#FFFC00',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
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
});