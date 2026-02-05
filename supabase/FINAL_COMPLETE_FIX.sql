-- ============================================================================
-- FINAL COMPLETE FIX - Single file to fix ALL recursion issues
-- ============================================================================
-- Run this ONE file in your Supabase SQL Editor
-- This combines all previous fixes into one comprehensive solution
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing policies
-- ============================================================================

-- Bands table
DROP POLICY IF EXISTS "Band members can view their bands" ON public.bands;
DROP POLICY IF EXISTS "Anyone can view bands they own" ON public.bands;
DROP POLICY IF EXISTS "Authenticated users can create bands" ON public.bands;
DROP POLICY IF EXISTS "Band owners can update their bands" ON public.bands;
DROP POLICY IF EXISTS "Owners can update their bands" ON public.bands;
DROP POLICY IF EXISTS "Band owners can delete their bands" ON public.bands;
DROP POLICY IF EXISTS "Owners can delete their bands" ON public.bands;
DROP POLICY IF EXISTS "Members can view their bands" ON public.bands;

-- Band members table
DROP POLICY IF EXISTS "Band members can view members of their bands" ON public.band_members;
DROP POLICY IF EXISTS "View own membership records" ON public.band_members;
DROP POLICY IF EXISTS "System can insert band members" ON public.band_members;
DROP POLICY IF EXISTS "System can insert members" ON public.band_members;
DROP POLICY IF EXISTS "Band admins can remove members" ON public.band_members;
DROP POLICY IF EXISTS "Owners can delete members" ON public.band_members;

-- Band invitations table
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.band_invitations;
DROP POLICY IF EXISTS "View invitations sent to me" ON public.band_invitations;
DROP POLICY IF EXISTS "Band admins can view invitations for their bands" ON public.band_invitations;
DROP POLICY IF EXISTS "Band admins can create invitations" ON public.band_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON public.band_invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to them" ON public.band_invitations;
DROP POLICY IF EXISTS "Users can update their invitations" ON public.band_invitations;

-- Storage policies
DROP POLICY IF EXISTS "Band members can view band audio files" ON storage.objects;
DROP POLICY IF EXISTS "Band members can upload band audio files" ON storage.objects;
DROP POLICY IF EXISTS "Band members can update band audio files" ON storage.objects;
DROP POLICY IF EXISTS "Band members can delete band audio files" ON storage.objects;

-- ============================================================================
-- STEP 2: Drop and recreate helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.user_band_ids(UUID);
DROP FUNCTION IF EXISTS public.is_band_member(UUID, UUID);

-- Function to get band IDs for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_band_ids(check_user_id UUID)
RETURNS TABLE(band_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT bm.band_id
    FROM public.band_members bm
    WHERE bm.user_id = check_user_id;
END;
$$;

-- Function to check if user is member of a band (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_band_member(check_band_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.band_members
        WHERE band_id = check_band_id
        AND user_id = check_user_id
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_band_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_band_ids(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_band_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_band_member(UUID, UUID) TO anon;

-- ============================================================================
-- STEP 3: Create SIMPLE non-recursive policies
-- ============================================================================

-- BANDS TABLE POLICIES
-- Policy 1: Owners can view their own bands (no band_members reference)
CREATE POLICY "Owners can view their bands"
    ON public.bands FOR SELECT
    USING (owner_id = auth.uid());

-- Policy 2: Members can view bands (uses security definer function)
CREATE POLICY "Members can view their bands"
    ON public.bands FOR SELECT
    USING (
        id IN (SELECT band_id FROM public.user_band_ids(auth.uid()))
    );

-- Policy 3: Anyone authenticated can create a band
CREATE POLICY "Authenticated users can create bands"
    ON public.bands FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy 4: Owners can update their bands
CREATE POLICY "Owners can update their bands"
    ON public.bands FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy 5: Owners can delete their bands
CREATE POLICY "Owners can delete their bands"
    ON public.bands FOR DELETE
    USING (owner_id = auth.uid());

-- BAND_MEMBERS TABLE POLICIES
-- Policy 1: Users can view their own membership records
CREATE POLICY "View own membership records"
    ON public.band_members FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: Band owners can view all members (no recursion - only checks bands table)
CREATE POLICY "Owners can view all members"
    ON public.band_members FOR SELECT
    USING (
        band_id IN (
            SELECT id FROM public.bands WHERE owner_id = auth.uid()
        )
    );

-- Policy 3: System can insert members (for band creation and invitations)
CREATE POLICY "System can insert members"
    ON public.band_members FOR INSERT
    WITH CHECK (true);

-- Policy 4: Owners can delete members
CREATE POLICY "Owners can delete members"
    ON public.band_members FOR DELETE
    USING (
        band_id IN (
            SELECT id FROM public.bands WHERE owner_id = auth.uid()
        )
    );

-- BAND_INVITATIONS TABLE POLICIES
-- Policy 1: View invitations sent to you
CREATE POLICY "View invitations sent to me"
    ON public.band_invitations FOR SELECT
    USING (
        invitee_id = auth.uid() OR
        invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Policy 2: Band owners can view invitations for their bands
CREATE POLICY "Owners can view invitations"
    ON public.band_invitations FOR SELECT
    USING (
        band_id IN (
            SELECT id FROM public.bands WHERE owner_id = auth.uid()
        )
    );

-- Policy 3: Owners can create invitations
CREATE POLICY "Owners can create invitations"
    ON public.band_invitations FOR INSERT
    WITH CHECK (
        band_id IN (
            SELECT id FROM public.bands WHERE owner_id = auth.uid()
        )
    );

-- Policy 4: Users can update their invitations (accept/decline)
CREATE POLICY "Users can update their invitations"
    ON public.band_invitations FOR UPDATE
    USING (
        invitee_id = auth.uid() OR
        invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- ============================================================================
-- STEP 4: Fix storage policies for band-audio bucket
-- ============================================================================

-- Policy 1: View band audio files
CREATE POLICY "Band members can view band audio files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'band-audio' AND
        public.is_band_member(
            (storage.foldername(name))[1]::uuid,
            auth.uid()
        )
    );

-- Policy 2: Upload band audio files
CREATE POLICY "Band members can upload band audio files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'band-audio' AND
        public.is_band_member(
            (storage.foldername(name))[1]::uuid,
            auth.uid()
        )
    );

-- Policy 3: Update band audio files
CREATE POLICY "Band members can update band audio files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'band-audio' AND
        public.is_band_member(
            (storage.foldername(name))[1]::uuid,
            auth.uid()
        )
    );

-- Policy 4: Delete band audio files
CREATE POLICY "Band members can delete band audio files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'band-audio' AND
        public.is_band_member(
            (storage.foldername(name))[1]::uuid,
            auth.uid()
        )
    );

-- ============================================================================
-- STEP 5: Ensure avatars bucket policies exist (for profile pictures)
-- ============================================================================

-- Drop existing avatar policies (from COMPLETE_SETUP_FIXED.sql)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Recreate avatar policies - simple, no band_members involved
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- DONE! Summary of changes:
-- ============================================================================
-- 1. Dropped ALL existing policies to start clean
-- 2. Created SECURITY DEFINER functions to bypass RLS and prevent recursion
-- 3. Bands policies NEVER directly query band_members
-- 4. Band_members policies NEVER query band_members itself
-- 5. Storage policies use SECURITY DEFINER functions
-- 6. Profile picture policies are completely separate and simple
--
-- Test by:
-- 1. Creating a new band
-- 2. Uploading a profile picture
-- 3. Uploading an audio file to a band
-- ============================================================================
