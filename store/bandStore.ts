import { create } from 'zustand';
import { Band, BandMember, BandInvitation, UserSearchResult } from '@/types';
import { bandService } from '@/lib/services/bandService';

interface BandState {
  bands: Band[];
  currentBand: Band | null;
  members: Record<string, BandMember[]>; // bandId -> members
  invitations: BandInvitation[];
  isLoading: boolean;

  // User search state
  searchResults: UserSearchResult[];
  isSearching: boolean;

  // Actions
  loadBands: () => Promise<void>;
  createBand: (name: string, description?: string) => Promise<Band | null>;
  selectBand: (bandId: string) => void;
  loadBandMembers: (bandId: string) => Promise<void>;
  inviteMember: (bandId: string, email: string) => Promise<boolean>;
  loadInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  declineInvitation: (invitationId: string) => Promise<boolean>;
  leaveBand: (bandId: string) => Promise<boolean>;
  removeMember: (bandId: string, userId: string) => Promise<boolean>;
  updateBand: (bandId: string, updates: Partial<Band>) => Promise<boolean>;
  deleteBand: (bandId: string) => Promise<boolean>;
  clearData: () => void;

  // User search actions
  searchUsers: (searchTerm: string) => Promise<void>;
  clearSearchResults: () => void;
  inviteMemberById: (bandId: string, userId: string, userEmail: string) => Promise<{ success: boolean; error?: string }>;
}

export const useBandStore = create<BandState>((set, get) => ({
  bands: [],
  currentBand: null,
  members: {},
  invitations: [],
  isLoading: false,
  searchResults: [],
  isSearching: false,

  loadBands: async () => {
    set({ isLoading: true });
    try {
      const bands = await bandService.getUserBands();
      set({ bands, isLoading: false });
    } catch (error) {
      console.error('Error loading bands:', error);
      set({ isLoading: false });
    }
  },

  createBand: async (name, description) => {
    try {
      const band = await bandService.createBand(name, description);
      if (band) {
        set((state) => ({ bands: [...state.bands, band] }));
      }
      return band;
    } catch (error) {
      console.error('Error creating band:', error);
      return null;
    }
  },

  selectBand: (bandId) => {
    const band = get().bands.find((b) => b.id === bandId);
    set({ currentBand: band || null });

    // Load members if not already loaded
    if (band && !get().members[bandId]) {
      get().loadBandMembers(bandId);
    }
  },

  loadBandMembers: async (bandId) => {
    try {
      const members = await bandService.getBandMembers(bandId);
      set((state) => ({
        members: { ...state.members, [bandId]: members }
      }));
    } catch (error) {
      console.error('Error loading band members:', error);
    }
  },

  inviteMember: async (bandId, email) => {
    try {
      return await bandService.inviteMember(bandId, email);
    } catch (error) {
      console.error('Error inviting member:', error);
      return false;
    }
  },

  loadInvitations: async () => {
    try {
      const invitations = await bandService.getPendingInvitations();
      set({ invitations });
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  },

  acceptInvitation: async (invitationId) => {
    try {
      const success = await bandService.acceptInvitation(invitationId);
      if (success) {
        // Reload bands and invitations
        await get().loadBands();
        await get().loadInvitations();
      }
      return success;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  },

  declineInvitation: async (invitationId) => {
    try {
      const success = await bandService.declineInvitation(invitationId);
      if (success) {
        // Remove from local state
        set((state) => ({
          invitations: state.invitations.filter((inv) => inv.id !== invitationId)
        }));
      }
      return success;
    } catch (error) {
      console.error('Error declining invitation:', error);
      return false;
    }
  },

  leaveBand: async (bandId) => {
    try {
      const success = await bandService.leaveBand(bandId);
      if (success) {
        set((state) => ({
          bands: state.bands.filter((b) => b.id !== bandId),
          currentBand: state.currentBand?.id === bandId ? null : state.currentBand
        }));
      }
      return success;
    } catch (error) {
      console.error('Error leaving band:', error);
      return false;
    }
  },

  removeMember: async (bandId, userId) => {
    try {
      const success = await bandService.removeMember(bandId, userId);
      if (success) {
        await get().loadBandMembers(bandId);
      }
      return success;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  },

  updateBand: async (bandId, updates) => {
    try {
      const success = await bandService.updateBand(bandId, updates);
      if (success) {
        // Update local state
        set((state) => ({
          bands: state.bands.map((b) => (b.id === bandId ? { ...b, ...updates } : b)),
          currentBand: state.currentBand?.id === bandId
            ? { ...state.currentBand, ...updates }
            : state.currentBand
        }));
      }
      return success;
    } catch (error) {
      console.error('Error updating band:', error);
      return false;
    }
  },

  deleteBand: async (bandId) => {
    try {
      const success = await bandService.deleteBand(bandId);
      if (success) {
        set((state) => ({
          bands: state.bands.filter((b) => b.id !== bandId),
          currentBand: state.currentBand?.id === bandId ? null : state.currentBand
        }));
      }
      return success;
    } catch (error) {
      console.error('Error deleting band:', error);
      return false;
    }
  },

  clearData: () => {
    set({
      bands: [],
      currentBand: null,
      members: {},
      invitations: [],
      isLoading: false,
      searchResults: [],
      isSearching: false
    });
  },

  searchUsers: async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const results = await bandService.searchUsers(searchTerm);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error('Error searching users:', error);
      set({ searchResults: [], isSearching: false });
    }
  },

  clearSearchResults: () => {
    set({ searchResults: [], isSearching: false });
  },

  inviteMemberById: async (bandId: string, userId: string, userEmail: string) => {
    try {
      return await bandService.inviteMemberById(bandId, userId, userEmail);
    } catch (error) {
      console.error('Error inviting member by ID:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}));
