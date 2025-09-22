import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';

export const [TabLoadingProvider, useTabLoading] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<string>('camera');

  const startTabTransition = useCallback((tabName: string) => {
    if (tabName !== currentTab) {
      setIsLoading(true);
      setCurrentTab(tabName);
      
      // Simulate loading time for smooth transition
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [currentTab]);

  const setTabLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    isLoading,
    currentTab,
    startTabTransition,
    setTabLoading,
  };
});