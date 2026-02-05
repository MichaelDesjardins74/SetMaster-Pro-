import { create } from 'zustand';
import { BandMessage } from '@/types';
import { chatService } from '@/lib/services/chatService';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  messages: Record<string, BandMessage[]>; // bandId -> messages
  subscriptions: Record<string, RealtimeChannel>; // bandId -> channel
  isLoading: boolean;

  // Actions
  loadMessages: (bandId: string) => Promise<void>;
  sendMessage: (bandId: string, content: string) => Promise<boolean>;
  subscribeToChat: (bandId: string) => void;
  unsubscribeFromChat: (bandId: string) => void;
  shareSetlistInChat: (bandId: string, setlistId: string, setlistName: string) => Promise<boolean>;
  updateMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (bandId: string, messageId: string) => Promise<boolean>;
  clearData: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  subscriptions: {},
  isLoading: false,

  loadMessages: async (bandId) => {
    set({ isLoading: true });
    try {
      const messages = await chatService.getMessages(bandId);
      set((state) => ({
        messages: { ...state.messages, [bandId]: messages.reverse() }, // Reverse to show oldest first
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (bandId, content) => {
    try {
      return await chatService.sendMessage(bandId, content);
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  },

  subscribeToChat: (bandId) => {
    const { subscriptions } = get();

    // Don't subscribe if already subscribed
    if (subscriptions[bandId]) {
      console.log('Already subscribed to chat:', bandId);
      return;
    }

    console.log('Subscribing to chat:', bandId);

    const channel = chatService.subscribeToMessages(bandId, (newMessage) => {
      console.log('Received new message:', newMessage.id);
      set((state) => ({
        messages: {
          ...state.messages,
          [bandId]: [...(state.messages[bandId] || []), newMessage]
        }
      }));
    });

    set((state) => ({
      subscriptions: { ...state.subscriptions, [bandId]: channel }
    }));
  },

  unsubscribeFromChat: (bandId) => {
    const { subscriptions } = get();
    const channel = subscriptions[bandId];

    if (channel) {
      console.log('Unsubscribing from chat:', bandId);
      chatService.unsubscribe(channel);
      set((state) => {
        const newSubscriptions = { ...state.subscriptions };
        delete newSubscriptions[bandId];
        return { subscriptions: newSubscriptions };
      });
    }
  },

  shareSetlistInChat: async (bandId, setlistId, setlistName) => {
    try {
      return await chatService.shareSetlistInChat(bandId, setlistId, setlistName);
    } catch (error) {
      console.error('Error sharing setlist in chat:', error);
      return false;
    }
  },

  updateMessage: async (messageId, content) => {
    try {
      return await chatService.updateMessage(messageId, content);
    } catch (error) {
      console.error('Error updating message:', error);
      return false;
    }
  },

  deleteMessage: async (bandId, messageId) => {
    try {
      const success = await chatService.deleteMessage(messageId);
      if (success) {
        // Remove from local state
        set((state) => ({
          messages: {
            ...state.messages,
            [bandId]: state.messages[bandId]?.filter((m) => m.id !== messageId) || []
          }
        }));
      }
      return success;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  },

  clearData: () => {
    // Unsubscribe from all channels
    const { subscriptions } = get();
    Object.values(subscriptions).forEach((channel) => {
      chatService.unsubscribe(channel);
    });

    set({
      messages: {},
      subscriptions: {},
      isLoading: false
    });
  }
}));
