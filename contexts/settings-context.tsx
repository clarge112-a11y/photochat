import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  darkMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  readReceipts: boolean;
  onlineStatus: boolean;
  autoSavePhotos: boolean;
  chatBackups: boolean;
  locationSharing: boolean;
  twoFactorAuth: boolean;
  dataUsage: 'wifi' | 'cellular' | 'both';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light' | 'auto';
}

const defaultSettings: UserSettings = {
  darkMode: true,
  notifications: true,
  soundEnabled: true,
  readReceipts: true,
  onlineStatus: true,
  autoSavePhotos: false,
  chatBackups: true,
  locationSharing: false,
  twoFactorAuth: false,
  dataUsage: 'wifi',
  language: 'en',
  fontSize: 'medium',
  theme: 'dark',
};

export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }, [settings]);

  const updateMultipleSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const resetSettings = useCallback(async () => {
    try {
      setSettings(defaultSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }, []);

  return {
    settings,
    loading,
    updateSetting,
    updateMultipleSettings,
    resetSettings,
  };
});