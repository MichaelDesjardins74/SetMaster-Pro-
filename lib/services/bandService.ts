import { supabase } from '@/lib/supabase';
import { Band, BandMember, BandInvitation, UserSearchResult } from '@/types';

export const bandService = {
  /**
   * Create a new band
   */
  async createBand(name: string, description?: string): Promise<Band | null> {
    try {
      console.log('🎸 Starting band creation...');
      console.log('   Name:', name);
      console.log('   Description:', description || '(none)');

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('❌ Error getting user:', userError);
        return null;
      }

      if (!user) {
        console.error('❌ No authenticated user found');
        return null;
      }

      console.log('✓ User authenticated:', user.id);
      console.log('📝 Inserting band into database...');

      const { data, error } = await supabase
        .rpc('create_band', {
          p_name: name,
          p_description: description || null
        });


      if (error) {
        console.error('❌ Error creating band:', error);
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        return null;
      }

      console.log('✓ Band created successfully!', data);
      console.log('   Band ID:', data.id);

      return data;
    } catch (error) {
      console.error('❌ Critical error in createBand:', error);
      if (error instanceof Error) {
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
      }
      return null;
    }
  },

  /**
   * Get all bands for current user
   */
  async getUserBands(): Promise<Band[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('bands')
        .select(`
          *,
          band_members!inner(user_id)
        `)
        .eq('band_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bands:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserBands:', error);
      return [];
    }
  },

  /**
   * Get single band by ID
   */
  async getBandById(bandId: string): Promise<Band | null> {
    try {
      const { data, error } = await supabase
        .from('bands')
        .select('*')
        .eq('id', bandId)
        .single();

      if (error) {
        console.error('Error fetching band:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBandById:', error);
      return null;
    }
  },

  /**
   * Get band members with profile information
   */
  async getBandMembers(bandId: string): Promise<BandMember[]> {
    try {
      const { data, error } = await supabase
        .from('band_members')
        .select(`
          *,
          profiles(id, email, full_name, avatar_url)
        `)
        .eq('band_id', bandId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching band members:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBandMembers:', error);
      return [];
    }
  },

  /**
   * Invite a member by email
   */
  async inviteMember(bandId: string, email: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user exists in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      const { error } = await supabase
        .from('band_invitations')
        .insert({
          band_id: bandId,
          inviter_id: user.id,
          invitee_email: email.toLowerCase(),
          invitee_id: profile?.id || null,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating invitation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in inviteMember:', error);
      return false;
    }
  },

  /**
   * Accept an invitation
   */
  async acceptInvitation(invitationId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('band_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (inviteError || !invitation) {
        console.error('Error fetching invitation:', inviteError);
        return false;
      }

      // Verify user is the invitee
      if (invitation.invitee_id !== user.id && invitation.invitee_email !== user.email) {
        console.error('User is not the invitee');
        return false;
      }

      // Add user to band
      const { error: memberError } = await supabase
        .from('band_members')
        .insert({
          band_id: invitation.band_id,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding band member:', memberError);
        return false;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('band_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      return false;
    }
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('band_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) {
        console.error('Error declining invitation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in declineInvitation:', error);
      return false;
    }
  },

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<BandInvitation[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('band_invitations')
        .select(`
          *,
          bands(name, avatar_url)
        `)
        .or(`invitee_id.eq.${user.id},invitee_email.eq.${user.email}`)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }

      // Fetch inviter profiles separately since there's no direct FK relationship
      const invitations = data || [];
      if (invitations.length > 0) {
        const inviterIds = [...new Set(invitations.map(inv => inv.inviter_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', inviterIds);

        // Map profiles to invitations
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return invitations.map(inv => ({
          ...inv,
          profiles: profileMap.get(inv.inviter_id) || { full_name: null }
        }));
      }

      return invitations;
    } catch (error) {
      console.error('Error in getPendingInvitations:', error);
      return [];
    }
  },

  /**
   * Leave a band (remove yourself)
   */
  async leaveBand(bandId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user is the owner
      const { data: band } = await supabase
        .from('bands')
        .select('owner_id')
        .eq('id', bandId)
        .single();

      if (band?.owner_id === user.id) {
        console.error('Band owner cannot leave, must transfer ownership or delete band');
        return false;
      }

      const { error } = await supabase
        .from('band_members')
        .delete()
        .eq('band_id', bandId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving band:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in leaveBand:', error);
      return false;
    }
  },

  /**
   * Remove a member from the band (admin/owner only)
   */
  async removeMember(bandId: string, userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify requester is admin or owner
      const { data: member } = await supabase
        .from('band_members')
        .select('role')
        .eq('band_id', bandId)
        .eq('user_id', user.id)
        .single();

      if (!member || !['owner', 'admin'].includes(member.role)) {
        console.error('User does not have permission to remove members');
        return false;
      }

      const { error } = await supabase
        .from('band_members')
        .delete()
        .eq('band_id', bandId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing member:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeMember:', error);
      return false;
    }
  },

  /**
   * Update band information
   */
  async updateBand(bandId: string, updates: Partial<Band>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bands')
        .update(updates)
        .eq('id', bandId);

      if (error) {
        console.error('Error updating band:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateBand:', error);
      return false;
    }
  },

  /**
   * Delete a band (owner only)
   */
  async deleteBand(bandId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bands')
        .delete()
        .eq('id', bandId);

      if (error) {
        console.error('Error deleting band:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteBand:', error);
      return false;
    }
  },

  /**
   * Search for users by name or email
   * Returns top 10 results excluding current user
   */
  async searchUsers(searchTerm: string): Promise<UserSearchResult[]> {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .rpc('search_users', {
          search_term: searchTerm.trim(),
          result_limit: 10
        });

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  },

  /**
   * Invite a member by user ID (direct invite for existing users)
   */
  async inviteMemberById(bandId: string, userId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('band_members')
        .select('id')
        .eq('band_id', bandId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return { success: false, error: 'User is already a member of this band' };
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('band_invitations')
        .select('id')
        .eq('band_id', bandId)
        .eq('invitee_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return { success: false, error: 'User already has a pending invitation' };
      }

      // Get the user's actual email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      const email = profile?.email || userEmail;

      const { error } = await supabase
        .from('band_invitations')
        .insert({
          band_id: bandId,
          inviter_id: user.id,
          invitee_email: email.toLowerCase(),
          invitee_id: userId,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating invitation:', error);
        return { success: false, error: 'Failed to create invitation' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in inviteMemberById:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
};
