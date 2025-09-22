import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { 
  ArrowLeft, 
  Users, 
  Edit3, 
  UserPlus, 
  UserMinus, 
  Crown,
  Bell,
  BellOff,
  Trash2,
  LogOut
} from 'lucide-react-native';
import { useGroupChatStore } from '@/stores/group-chat-store';
import { useAuth } from '@/contexts/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [notifications, setNotifications] = useState<boolean>(true);
  const insets = useSafeAreaInsets();
  
  const {
    groupChats,
    currentGroupMembers,
    fetchGroupMembers,
    updateGroupChat,
    removeGroupMember,
    leaveGroup,
    deleteGroupChat,
  } = useGroupChatStore();
  
  const { user } = useAuth();
  
  const currentGroup = groupChats.find(group => group.id === id);
  const isAdmin = currentGroup?.created_by === user?.id;
  
  useEffect(() => {
    if (id) {
      fetchGroupMembers(id);
    }
  }, [id, fetchGroupMembers]);
  
  useEffect(() => {
    if (currentGroup) {
      setGroupName(currentGroup.name);
    }
  }, [currentGroup]);
  
  const handleSaveGroupName = async () => {
    if (!id || !groupName.trim()) return;
    
    try {
      await updateGroupChat(id, { name: groupName.trim() });
      setIsEditing(false);
      Alert.alert('Success', 'Group name updated successfully');
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group name');
    }
  };
  
  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await removeGroupMember(id, memberId);
                Alert.alert('Success', 'Member removed successfully');
              }
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };
  
  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await leaveGroup(id);
                router.back();
                Alert.alert('Success', 'You have left the group');
              }
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };
  
  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await deleteGroupChat(id);
                router.back();
                Alert.alert('Success', 'Group deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
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
        
        <Text style={styles.headerTitle}>Group Settings</Text>
        
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Info */}
        <View style={styles.section}>
          <View style={styles.groupHeader}>
            <View style={styles.groupAvatarContainer}>
              {currentGroup.avatar_url ? (
                <Image source={{ uri: currentGroup.avatar_url }} style={styles.groupAvatar} />
              ) : (
                <View style={styles.groupDefaultAvatar}>
                  <Users color="white" size={32} />
                </View>
              )}
            </View>
            
            <View style={styles.groupInfo}>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.groupNameInput}
                    value={groupName}
                    onChangeText={setGroupName}
                    placeholder="Group name"
                    placeholderTextColor="#666"
                    maxLength={50}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setGroupName(currentGroup.name);
                        setIsEditing(false);
                      }}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveGroupName}
                    >
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.groupNameContainer}>
                  <Text style={styles.groupName}>{currentGroup.name}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.editIconButton}
                      onPress={() => setIsEditing(true)}
                    >
                      <Edit3 color="#FFFC00" size={16} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <Text style={styles.memberCount}>
                {currentGroupMembers.length} members
              </Text>
            </View>
          </View>
        </View>
        
        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              {notifications ? (
                <Bell color="#FFFC00" size={20} />
              ) : (
                <BellOff color="#666" size={20} />
              )}
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333', true: '#FFFC00' }}
              thumbColor={notifications ? '#000' : '#666'}
            />
          </View>
        </View>
        
        {/* Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.addMemberButton}
                onPress={() => router.push(`/add-group-members?groupId=${id}`)}
              >
                <UserPlus color="#FFFC00" size={20} />
              </TouchableOpacity>
            )}
          </View>
          
          {currentGroupMembers.map((member) => (
            <View key={member.id} style={styles.memberItem}>
              <View style={styles.memberLeft}>
                {member.user.avatar_url ? (
                  <Image source={{ uri: member.user.avatar_url }} style={styles.memberAvatar} />
                ) : (
                  renderDefaultAvatar(member.user.display_name, 40)
                )}
                
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameContainer}>
                    <Text style={styles.memberName}>{member.user.display_name}</Text>
                    {member.user_id === currentGroup.created_by && (
                      <Crown color="#FFFC00" size={16} />
                    )}
                  </View>
                  <Text style={styles.memberStatus}>
                    {member.user_id === user?.id ? 'You' : 'Member'}
                  </Text>
                </View>
              </View>
              
              {isAdmin && member.user_id !== user?.id && member.user_id !== currentGroup.created_by && (
                <TouchableOpacity
                  style={styles.removeMemberButton}
                  onPress={() => handleRemoveMember(member.user_id, member.user.display_name)}
                >
                  <UserMinus color="#FF3B30" size={20} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        
        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleLeaveGroup}>
            <LogOut color="#FF3B30" size={20} />
            <Text style={styles.dangerText}>Leave Group</Text>
          </TouchableOpacity>
          
          {isAdmin && (
            <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteGroup}>
              <Trash2 color="#FF3B30" size={20} />
              <Text style={styles.dangerText}>Delete Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  dangerSectionTitle: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addMemberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,252,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatarContainer: {
    marginRight: 16,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  groupDefaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 8,
  },
  editIconButton: {
    padding: 4,
  },
  memberCount: {
    color: '#666',
    fontSize: 14,
  },
  editContainer: {
    marginBottom: 8,
  },
  groupNameInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFC00',
  },
  cancelText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  saveText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  memberStatus: {
    color: '#666',
    fontSize: 14,
  },
  removeMemberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dangerText: {
    color: '#FF3B30',
    fontSize: 16,
    marginLeft: 12,
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