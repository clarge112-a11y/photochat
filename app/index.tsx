import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { View, ActivityIndicator, StyleSheet, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';

export default function Index() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, scaleAnim]);

  console.log('Index: Auth state -', { user: !!user, loading });

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View 
          style={[
            styles.loadingContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.appTitle}>PhotoChat</Text>
          <ActivityIndicator size="large" color="#000" style={styles.loader} />
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      </View>
    );
  }

  if (user) {
    console.log('Index: Redirecting to camera tab for authenticated user');
    return <Redirect href="/(tabs)/camera" />;
  }

  console.log('Index: Redirecting to login for unauthenticated user');
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFC00',
  },
  loadingContent: {
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 30,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#000',
    opacity: 0.7,
  },
});