-- ============================================================================
-- TEST YOUR PERMISSIONS - Run this while logged into your app
-- ============================================================================
-- This will test if your user account can actually do what it needs to do
-- ============================================================================

-- TEST 1: Can you insert into bands table?
-- This should return the band you just created
INSERT INTO public.bands (name, description, owner_id)
VALUES (
    'Test Band - DELETE ME',
    'This is a test band',
    auth.uid()
)
RETURNING *;

-- If you see an error like "new row violates row-level security policy"
-- then the RLS policies are not set up correctly

-- TEST 2: Can you see the band you just created?
SELECT * FROM public.bands
WHERE owner_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- TEST 3: Are you automatically added as a member?
SELECT * FROM public.band_members
WHERE user_id = auth.uid()
ORDER BY joined_at DESC
LIMIT 5;

-- TEST 4: What's your user ID?
SELECT auth.uid() as your_user_id;

-- TEST 5: Clean up test band
DELETE FROM public.bands
WHERE name = 'Test Band - DELETE ME'
AND owner_id = auth.uid();

-- ============================================================================
-- WHAT TO LOOK FOR
-- ============================================================================
-- TEST 1: Should return a new band row - if error, RLS policies are wrong
-- TEST 2: Should show the test band - if empty, SELECT policy is wrong
-- TEST 3: Should show you as owner - if empty, trigger didn't fire
-- TEST 4: Should show your UUID - if NULL, you're not logged in
-- TEST 5: Should delete the test band - cleanup
-- ============================================================================
