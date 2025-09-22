import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Database } from '@/lib/supabase';
import { useAuth } from './auth-context';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

type Call = Database['public']['Tables']['calls']['Row'] & {
  caller: Database['public']['Tables']['profiles']['Row'];
  receiver: Database['public']['Tables']['profiles']['Row'];
};

export const [CallProvider, useCall] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Get active calls
  const activeCallsQuery = useQuery({
    queryKey: ['active-calls', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:profiles!calls_caller_id_fkey(*),
          receiver:profiles!calls_receiver_id_fkey(*)
        `)
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'calling')
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as Call[];
    },
    enabled: !!user?.id,
    refetchInterval: 2000, // Poll every 2 seconds for active calls
  });

  // Initialize WebRTC for web platform
  const initializeWebRTC = useCallback(async (isVideo: boolean = false) => {
    if (Platform.OS !== 'web') return null;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Start a call
  const startCallMutation = useMutation({
    mutationFn: async ({ 
      receiverId, 
      groupId, 
      callType, 
      isGroupCall = false 
    }: { 
      receiverId?: string; 
      groupId?: string; 
      callType: 'voice' | 'video';
      isGroupCall?: boolean;
    }) => {
      console.log('Starting call mutation with:', { receiverId, groupId, callType, isGroupCall, userId: user?.id });
      
      if (!user?.id) {
        console.error('User not authenticated');
        throw new Error('Not authenticated');
      }
      
      // Validate input parameters
      if (!isGroupCall && !receiverId) {
        console.error('Receiver ID is required for individual calls');
        throw new Error('Receiver ID is required for individual calls');
      }
      
      if (isGroupCall && !groupId) {
        console.error('Group ID is required for group calls');
        throw new Error('Group ID is required for group calls');
      }
      
      try {
        // Initialize WebRTC if on web
        if (Platform.OS === 'web') {
          console.log('Initializing WebRTC for web platform');
          await initializeWebRTC(callType === 'video');
        }
        
        console.log('Inserting call record into database');
        const { data, error } = await supabase
          .from('calls')
          .insert({
            caller_id: user.id,
            receiver_id: receiverId || null,
            group_id: groupId || null,
            call_type: callType,
            is_group_call: isGroupCall,
            status: 'calling',
          })
          .select(`
            *,
            caller:profiles!calls_caller_id_fkey(*),
            receiver:profiles!calls_receiver_id_fkey(*)
          `)
          .single();
        
        if (error) {
          console.error('Database error creating call:', error);
          throw new Error(`Failed to create call: ${error.message}`);
        }
        
        console.log('Call record created successfully:', data);
        
        // If it's a group call, add all group members as participants
        if (isGroupCall && groupId) {
          console.log('Adding group members as call participants');
          const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', groupId)
            .neq('user_id', user.id);
          
          if (membersError) {
            console.error('Error fetching group members:', membersError);
            throw new Error(`Failed to fetch group members: ${membersError.message}`);
          }
          
          if (members && members.length > 0) {
            const participants = members.map(member => ({
              call_id: data.id,
              user_id: member.user_id,
              status: 'invited' as const,
            }));
            
            const { error: participantsError } = await supabase
              .from('call_participants')
              .insert(participants);
              
            if (participantsError) {
              console.error('Error adding call participants:', participantsError);
              throw new Error(`Failed to add call participants: ${participantsError.message}`);
            }
            
            console.log('Call participants added successfully');
          }
        }
        
        setCurrentCall(data as Call);
        setCallStartTime(new Date());
        console.log('Call started successfully');
        return data;
      } catch (error) {
        console.error('Error in startCall mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
    },
    onError: (error) => {
      console.error('Start call mutation failed:', error);
    },
  });

  // Answer a call
  const answerCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const call = activeCallsQuery.data?.find(c => c.id === callId);
      if (!call) throw new Error('Call not found');
      
      // Initialize WebRTC if on web
      if (Platform.OS === 'web') {
        await initializeWebRTC(call.call_type === 'video');
      }
      
      const { data, error } = await supabase
        .from('calls')
        .update({ status: 'answered' })
        .eq('id', callId)
        .select(`
          *,
          caller:profiles!calls_caller_id_fkey(*),
          receiver:profiles!calls_receiver_id_fkey(*)
        `)
        .single();
      
      if (error) throw error;
      
      setCurrentCall(data as Call);
      setIsInCall(true);
      setCallStartTime(new Date());
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
    },
  });

  // Decline a call
  const declineCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', callId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
      setCurrentCall(null);
    },
  });

  // End a call
  const endCallMutation = useMutation({
    mutationFn: async (callId: string) => {
      const duration = callStartTime ? Math.floor((Date.now() - callStartTime.getTime()) / 1000) : 0;
      
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration,
        })
        .eq('id', callId);
      
      if (error) throw error;
      
      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }
      
      setCurrentCall(null);
      setIsInCall(false);
      setCallStartTime(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-calls'] });
    },
  });

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [localStream]);

  // Check for incoming calls
  useEffect(() => {
    if (activeCallsQuery.data && user?.id) {
      const incomingCall = activeCallsQuery.data.find(
        call => call.receiver_id === user.id && call.status === 'calling'
      );
      
      if (incomingCall && (!currentCall || currentCall.id !== incomingCall.id)) {
        setCurrentCall(incomingCall);
      }
    }
  }, [activeCallsQuery.data, user?.id, currentCall]);

  const incomingCall = useMemo(() => {
    if (!activeCallsQuery.data || !user?.id) return null;
    
    return activeCallsQuery.data.find(
      call => call.receiver_id === user.id && call.status === 'calling'
    ) || null;
  }, [activeCallsQuery.data, user?.id]);

  const outgoingCall = useMemo(() => {
    if (!activeCallsQuery.data || !user?.id) return null;
    
    return activeCallsQuery.data.find(
      call => call.caller_id === user.id && call.status === 'calling'
    ) || null;
  }, [activeCallsQuery.data, user?.id]);

  return {
    currentCall,
    incomingCall,
    outgoingCall,
    isInCall,
    localStream,
    remoteStream,
    startCall: startCallMutation.mutateAsync,
    answerCall: answerCallMutation.mutateAsync,
    declineCall: declineCallMutation.mutateAsync,
    endCall: endCallMutation.mutateAsync,
    toggleMute,
    toggleVideo,
    isStartingCall: startCallMutation.isPending,
    isAnsweringCall: answerCallMutation.isPending,
    isDecliningCall: declineCallMutation.isPending,
    isEndingCall: endCallMutation.isPending,
  };
});