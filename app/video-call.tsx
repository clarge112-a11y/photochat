import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import VideoChat from '@/components/VideoChat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VideoCallScreen() {
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    router.replace('/(tabs)/chat');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal'
        }} 
      />
      <VideoChat onClose={handleClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});