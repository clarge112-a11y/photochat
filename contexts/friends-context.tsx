import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Database } from '@/lib/supabase';
import { useAuth } from './auth-context';
import { useCallback, useMemo } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type FriendRequest = Database['public']['Tables']['friend_requests']['Row'] & {
  sender: Profile;
  receiver: Profile;
};
type Friendship = Database['public']['Tables']['friendships']['Row'];

export const [FriendsProvider, useFriends] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all friend requests (sent and received)
  const friendRequestsQuery = useQuery({
    queryKey: ['friend-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*),
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      if (error) throw error;
      return data as FriendRequest[];
    },
    enabled: !!user?.id,
  });

  // Get all friendships
  const friendshipsQuery = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user1:profiles!friendships_user1_id_fkey(*),
          user2:profiles!friendships_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Search users by username
  const searchUsers = useCallback(async (username: string) => {
    if (!username.trim()) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${username}%`)
      .neq('id', user?.id || '')
      .limit(10);
    
    if (error) throw error;
    return data;
  }, [user?.id]);

  // Send friend request
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if request already exists
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);
      
      if (existing && existing.length > 0) {
        throw new Error('Friend request already exists');
      }
      
      // Check if already friends
      const { data: friendship } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${user.id})`);
      
      if (friendship && friendship.length > 0) {
        throw new Error('Already friends');
      }
      
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  // Accept friend request
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: request, error: requestError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (requestError) throw requestError;
      
      // Update request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      
      if (updateError) throw updateError;
      
      // Create friendship
      const { data, error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user1_id: request.sender_id,
          user2_id: request.receiver_id,
        })
        .select()
        .single();
      
      if (friendshipError) throw friendshipError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  // Decline friend request
  const declineFriendRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
    },
  });

  // Remove friend
  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const friends = useMemo(() => {
    if (!friendshipsQuery.data || !user?.id) return [];
    
    return friendshipsQuery.data.map((friendship: any) => {
      const friend = friendship.user1_id === user.id ? friendship.user2 : friendship.user1;
      return {
        ...friend,
        friendshipId: friendship.id,
      };
    });
  }, [friendshipsQuery.data, user?.id]);

  const pendingRequests = useMemo(() => {
    if (!friendRequestsQuery.data || !user?.id) return [];
    
    return friendRequestsQuery.data.filter(
      (request) => request.receiver_id === user.id && request.status === 'pending'
    );
  }, [friendRequestsQuery.data, user?.id]);

  const sentRequests = useMemo(() => {
    if (!friendRequestsQuery.data || !user?.id) return [];
    
    return friendRequestsQuery.data.filter(
      (request) => request.sender_id === user.id && request.status === 'pending'
    );
  }, [friendRequestsQuery.data, user?.id]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    searchUsers,
    sendFriendRequest: sendFriendRequestMutation.mutateAsync,
    acceptFriendRequest: acceptFriendRequestMutation.mutateAsync,
    declineFriendRequest: declineFriendRequestMutation.mutateAsync,
    removeFriend: removeFriendMutation.mutateAsync,
    isLoading: friendRequestsQuery.isLoading || friendshipsQuery.isLoading,
    sendingRequest: sendFriendRequestMutation.isPending,
    acceptingRequest: acceptFriendRequestMutation.isPending,
    decliningRequest: declineFriendRequestMutation.isPending,
  };
});