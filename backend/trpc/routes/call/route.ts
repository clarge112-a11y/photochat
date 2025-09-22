import { z } from 'zod';
import { protectedProcedure } from '../../create-context';
import { supabase } from '../../../lib/supabase';

// Call procedures
export const createCallProcedure = protectedProcedure
  .input(z.object({
    receiverId: z.string().uuid().optional(),
    groupId: z.string().uuid().optional(),
    callType: z.enum(['voice', 'video']).default('voice'),
    isGroupCall: z.boolean().default(false),
  }))
  .mutation(async ({ input, ctx }) => {
    const { receiverId, groupId, callType, isGroupCall } = input;
    const userId = ctx.user.id;

    console.log('Creating call:', { receiverId, groupId, callType, isGroupCall, userId });

    try {
      // Validate input
      if (isGroupCall && !groupId) {
        throw new Error('Group ID is required for group calls');
      }
      if (!isGroupCall && !receiverId) {
        throw new Error('Receiver ID is required for direct calls');
      }

      // For group calls, verify user is a member
      if (isGroupCall && groupId) {
        const { data: membership, error: memberError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (memberError || !membership) {
          throw new Error('Access denied to this group');
        }
      }

      // For direct calls, verify both users exist
      if (!isGroupCall && receiverId) {
        const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', [userId, receiverId]);

        if (userError || !users || users.length !== 2) {
          throw new Error('One or both users do not exist');
        }
      }

      // Create the call
      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({
          caller_id: userId,
          receiver_id: isGroupCall ? null : receiverId,
          group_id: isGroupCall ? groupId : null,
          call_type: callType,
          is_group_call: isGroupCall,
          status: 'calling',
        })
        .select('*')
        .single();

      if (callError) {
        console.error('Database error creating call:', callError);
        throw new Error(`Failed to create call: ${callError.message}`);
      }

      if (!call) {
        throw new Error('No call data returned after creation');
      }

      console.log('Call created successfully:', call.id);
      return { call };
    } catch (error) {
      console.error('Error in createCall procedure:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create call';
      console.error('Detailed error message:', errorMessage);
      throw new Error(errorMessage);
    }
  });

export const updateCallStatusProcedure = protectedProcedure
  .input(z.object({
    callId: z.string().uuid(),
    status: z.enum(['calling', 'answered', 'declined', 'ended', 'missed']),
  }))
  .mutation(async ({ input, ctx }) => {
    const { callId, status } = input;
    const userId = ctx.user.id;

    console.log('Updating call status:', { callId, status, userId });

    try {
      // Verify user has access to this call
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError || !call) {
        throw new Error('Call not found or access denied');
      }

      if (call.caller_id !== userId && call.receiver_id !== userId) {
        throw new Error('Access denied to this call');
      }

      // Update the call status
      const updateData: any = { status };
      if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
        if (call.started_at) {
          const duration = Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000);
          updateData.duration = duration;
        }
      } else if (status === 'answered') {
        updateData.started_at = new Date().toISOString();
      }

      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating call status:', updateError);
        throw new Error(`Failed to update call status: ${updateError.message}`);
      }

      console.log('Call status updated successfully:', updatedCall.id);
      return { call: updatedCall };
    } catch (error) {
      console.error('Error in updateCallStatus procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to update call status');
    }
  });

export const getCallsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.user.id;

    console.log('Getting calls for user:', userId);

    try {
      const { data: calls, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:profiles!calls_caller_id_fkey(id, username, display_name, avatar_url),
          receiver:profiles!calls_receiver_id_fkey(id, username, display_name, avatar_url),
          group_chat:group_chats!calls_group_id_fkey(id, name, avatar_url)
        `)
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching calls:', error);
        throw new Error(`Failed to fetch calls: ${error.message}`);
      }

      console.log(`Fetched ${calls?.length || 0} calls`);
      return { calls: calls || [] };
    } catch (error) {
      console.error('Error in getCalls procedure:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch calls');
    }
  });