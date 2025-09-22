import React, { useEffect } from 'react';
import { useCall } from '@/contexts/call-context';
import { router } from 'expo-router';

export default function CallHandler() {
  const { incomingCall } = useCall();

  useEffect(() => {
    if (incomingCall) {
      router.push('/incoming-call');
    }
  }, [incomingCall]);

  return null;
}