-- ============================================================================
-- VERIFICATION PLAN: Test RLS Policies and Relationships
-- ============================================================================
-- Run these queries in order to verify the migration fixed all issues.
-- Execute in Supabase SQL Editor as an authenticated user.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SETUP: Get your current user ID
-- ----------------------------------------------------------------------------
SELECT auth.uid() AS my_user_id;
-- Copy this UUID for use in tests below


-- ----------------------------------------------------------------------------
-- TEST 1: Create a new band
-- ----------------------------------------------------------------------------
-- This should succeed without infinite recursion errors

INSERT INTO public.bands (name, description, owner_id)
VALUES (
  'Test Band ' || floor(random() * 1000)::text,
  'A test band for verification',
  auth.uid()
)
RETURNING id, name, owner_id;

-- Save the returned band_id for next tests


-- ----------------------------------------------------------------------------
-- TEST 2: Add yourself as a band member
-- ----------------------------------------------------------------------------
-- Replace <band_id> with the ID from TEST 1

INSERT INTO public.band_members (band_id, user_id, role)
VALUES (
  '<band_id>'::uuid,  -- ← Replace with actual band ID
  auth.uid(),
  'owner'
)
RETURNING id, band_id, user_id, role;


-- ----------------------------------------------------------------------------
-- TEST 3: Verify is_band_member() function works
-- ----------------------------------------------------------------------------
-- Replace <band_id> with the ID from TEST 1

SELECT public.is_band_member('<band_id>'::uuid) AS am_i_member;
-- Should return: true

-- Test with a random UUID (you're not a member)
SELECT public.is_band_member('00000000-0000-0000-0000-000000000000'::uuid) AS am_i_member;
-- Should return: false


-- ----------------------------------------------------------------------------
-- TEST 4: Fetch bands (verify SELECT policy)
-- ----------------------------------------------------------------------------
-- Should return only bands you're a member of or own

SELECT id, name, description, owner_id, avatar_url
FROM public.bands
ORDER BY created_at DESC;


-- ----------------------------------------------------------------------------
-- TEST 5: Fetch band members (verify SELECT policy on band_members)
-- ----------------------------------------------------------------------------
-- Replace <band_id> with the ID from TEST 1
-- Should succeed without recursion error

SELECT bm.id, bm.band_id, bm.user_id, bm.role, p.full_name, p.email
FROM public.band_members bm
LEFT JOIN public.profiles p ON p.id = bm.user_id
WHERE bm.band_id = '<band_id>'::uuid;


-- ----------------------------------------------------------------------------
-- TEST 6: Verify Storage policies (avatars bucket)
-- ----------------------------------------------------------------------------
-- These queries check the policies exist and are correctly configured

-- Check avatars SELECT policy (should allow public read)
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE 'avatars_%'
ORDER BY policyname;

-- Expected policies:
-- - avatars_select_policy (SELECT, public)
-- - avatars_insert_policy (INSERT, authenticated, folder check)
-- - avatars_update_policy (UPDATE, authenticated, folder check)
-- - avatars_delete_policy (DELETE, authenticated, folder check)


-- ----------------------------------------------------------------------------
-- TEST 7: Test avatar upload path validation (simulation)
-- ----------------------------------------------------------------------------
-- Verify the folder check logic works correctly
-- Replace <your_user_id> with your actual UUID from SETUP

SELECT
  'c7b5f3e1-1234-5678-9abc-def012345678/profile.jpg' AS test_path,
  (storage.foldername('c7b5f3e1-1234-5678-9abc-def012345678/profile.jpg'))[1] AS extracted_folder,
  (storage.foldername('c7b5f3e1-1234-5678-9abc-def012345678/profile.jpg'))[1] = auth.uid()::text AS is_my_folder;

-- is_my_folder should be TRUE if the UUID matches your user_id


-- ----------------------------------------------------------------------------
-- TEST 8: Create a band invitation
-- ----------------------------------------------------------------------------
-- Replace <band_id> with the ID from TEST 1
-- Replace <invitee_email> with a test email

INSERT INTO public.band_invitations (
  band_id,
  inviter_id,
  invitee_email,
  status
)
VALUES (
  '<band_id>'::uuid,
  auth.uid(),
  'test@example.com',
  'pending'
)
RETURNING id, band_id, inviter_id, invitee_email, status;


-- ----------------------------------------------------------------------------
-- TEST 9: Fetch invitations with inviter profile (PostgREST relationship test)
-- ----------------------------------------------------------------------------
-- This query simulates what PostgREST does when you request:
-- GET /band_invitations?select=*,inviter:profiles(full_name,email)

SELECT
  bi.id,
  bi.band_id,
  bi.invitee_email,
  bi.status,
  bi.created_at,
  p.full_name AS inviter_name,
  p.email AS inviter_email
FROM public.band_invitations bi
LEFT JOIN public.profiles p ON p.id = bi.inviter_id
WHERE bi.invitee_id = auth.uid()
   OR bi.inviter_id = auth.uid()
ORDER BY bi.created_at DESC;

-- Should succeed without PGRST200 error
-- The JOIN should work because we added FK from band_invitations to profiles


-- ----------------------------------------------------------------------------
-- TEST 10: Verify foreign key constraints exist
-- ----------------------------------------------------------------------------
-- Check that band_invitations now has FKs to profiles

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'band_invitations'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Should show:
-- - band_invitations_inviter_id_fkey_profiles -> profiles(id)
-- - band_invitations_invitee_id_fkey_profiles -> profiles(id)
-- - band_invitations_band_id_fkey -> bands(id)


-- ----------------------------------------------------------------------------
-- TEST 11: Check all RLS policies are enabled
-- ----------------------------------------------------------------------------

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bands', 'band_members', 'band_invitations')
ORDER BY tablename, cmd, policyname;

-- Should show:
-- bands: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- band_members: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- band_invitations: 4 policies (SELECT, INSERT, UPDATE, DELETE)


-- ----------------------------------------------------------------------------
-- TEST 12: Verify SECURITY DEFINER functions exist
-- ----------------------------------------------------------------------------

SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  p.prosecdef AS is_security_definer,
  p.provolatile AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_band_member', 'is_band_owner');

-- Should show:
-- - is_band_member(uuid, uuid) - security definer = true
-- - is_band_owner(uuid, uuid) - security definer = true


-- ============================================================================
-- APP-LEVEL VERIFICATION STEPS
-- ============================================================================
-- Test these flows in your Expo app after running the migration:

-- 1. CREATE BAND FLOW:
--    - Navigate to Bands tab
--    - Click "Create Band"
--    - Fill in name, description
--    - Click Submit
--    - ✓ Should succeed without "infinite recursion" error
--    - ✓ New band should appear in your bands list

-- 2. UPLOAD PROFILE AVATAR FLOW:
--    - Navigate to Settings/Profile
--    - Click "Upload Avatar"
--    - Select an image
--    - ✓ Should upload to: avatars/{your_user_id}/{timestamp}.jpg
--    - ✓ Should succeed without "infinite recursion" error
--    - ✓ Avatar should display in UI

-- 3. FETCH BANDS FLOW:
--    - Navigate to Bands tab
--    - ✓ Should display all bands you're a member of
--    - ✓ Should not show bands you're not a member of

-- 4. FETCH INVITATIONS FLOW:
--    - Navigate to Invitations/Notifications
--    - Fetch pending invitations with inviter profile:
--      GET /rest/v1/band_invitations?select=*,inviter:profiles(full_name,email)
--    - ✓ Should succeed without PGRST200 error
--    - ✓ Should display inviter name and email

-- 5. ACCEPT INVITATION FLOW:
--    - Click "Accept" on a pending invitation
--    - Should update invitation status to 'accepted'
--    - Should insert into band_members
--    - ✓ Should succeed without recursion errors

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If you still see PGRST200 errors after migration:
-- 1. Restart PostgREST to reload schema cache:
--    In Supabase Dashboard: Settings → API → Click "Restart"
--    Or run: NOTIFY pgrst, 'reload schema';

-- If you see "permission denied" errors:
-- 1. Verify RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 2. Check policy grants: SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- If avatar uploads still fail:
-- 1. Verify bucket exists: SELECT * FROM storage.buckets WHERE name = 'avatars';
-- 2. Check bucket is public: UPDATE storage.buckets SET public = true WHERE name = 'avatars';
-- 3. Verify Storage policies: SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================================================
