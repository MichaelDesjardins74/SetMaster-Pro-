import { supabase } from '@/lib/supabase';
import { BandMessage } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const chatService = {
  /**
   * Send a message to a band chat
   */
  async sendMessage(
    bandId: string,
    content: string,
    type: 'text' | 'system' | 'setlist_share' | 'song_share' = 'text',
    metadata?: any
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('band_messages')
        .insert({
          band_id: bandId,
          user_id: user.id,
          content,
          message_type: type,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return false;
    }
  },

  /**
   * Get messages for a band (paginated)
   */
  async getMessages(
    bandId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BandMessage[]> {
    try {
      const { data, error } = await supabase
        .from('band_messages')
        .select(`
          *,
          profiles!band_messages_user_id_profiles_fkey(id, full_name, avatar_url)
        `)
        .eq('band_id', bandId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  },

  /**
   * Subscribe to new messages in a band (Real-time)
   */
  subscribeToMessages(
    bandId: string,
    callback: (message: BandMessage) => void
  ): RealtimeChannel {
    const channel = supabase
      .channel(`band:${bandId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'band_messages',
          filter: `band_id=eq.${bandId}`
        },
        async (payload) => {
          console.log('New message received:', payload.new.id);

          // Fetch the full message with profile data
          const { data, error } = await supabase
            .from('band_messages')
            .select(`
              *,
              profiles!band_messages_user_id_profiles_fkey(id, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching full message:', error);
            return;
          }

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return channel;
  },

  /**
   * Unsubscribe from messages
   */
  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel);
  },

  /**
   * Share a setlist in the chat
   */
  async shareSetlistInChat(
    bandId: string,
    setlistId: string,
    setlistName: string
  ): Promise<boolean> {
    return this.sendMessage(
      bandId,
      `Shared setlist: ${setlistName}`,
      'setlist_share',
      { setlist_id: setlistId, setlist_name: setlistName }
    );
  },

  /**
   * Update a message (owner only)
   */
  async updateMessage(messageId: string, content: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('band_messages')
        .update({ content })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMessage:', error);
      return false;
    }
  },

  /**
   * Delete a message (owner only)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('band_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return false;
    }
  }
};
