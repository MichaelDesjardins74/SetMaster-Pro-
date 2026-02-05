-- SetMaster Pro - Band/Group Collaboration Features
-- Run this SQL in your Supabase SQL Editor to add band features

-- ============================================
-- BANDS/GROUPS SCHEMA
-- ============================================

-- Bands table
CREATE TABLE IF NOT EXISTS public.bands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Band members table (junction table)
CREATE TABLE IF NOT EXISTS public.band_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, user_id)
);

-- Band invitations table
CREATE TABLE IF NOT EXISTS public.band_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Shared setlists table
CREATE TABLE IF NOT EXISTS public.shared_setlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    venue TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared songs table
CREATE TABLE IF NOT EXISTS public.shared_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration INTEGER NOT NULL,
    audio_url TEXT,
    album_art TEXT,
    lyrics TEXT,
    notes TEXT,
    bpm INTEGER,
    key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared setlist songs table (junction table)
CREATE TABLE IF NOT EXISTS public.shared_setlist_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shared_setlist_id UUID REFERENCES public.shared_setlists(id) ON DELETE CASCADE NOT NULL,
    shared_song_id UUID REFERENCES public.shared_songs(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Band messages/chat table
CREATE TABLE IF NOT EXISTS public.band_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'system', 'setlist_share', 'song_share')) DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS bands_owner_id_idx ON public.bands(owner_id);
CREATE INDEX IF NOT EXISTS band_members_band_id_idx ON public.band_members(band_id);
CREATE INDEX IF NOT EXISTS band_members_user_id_idx ON public.band_members(user_id);
CREATE INDEX IF NOT EXISTS band_invitations_band_id_idx ON public.band_invitations(band_id);
CREATE INDEX IF NOT EXISTS band_invitations_invitee_email_idx ON public.band_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS band_invitations_invitee_id_idx ON public.band_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS band_invitations_status_idx ON public.band_invitations(status);
CREATE INDEX IF NOT EXISTS shared_setlists_band_id_idx ON public.shared_setlists(band_id);
CREATE INDEX IF NOT EXISTS shared_setlists_owner_id_idx ON public.shared_setlists(owner_id);
CREATE INDEX IF NOT EXISTS shared_songs_band_id_idx ON public.shared_songs(band_id);
CREATE INDEX IF NOT EXISTS shared_songs_owner_id_idx ON public.shared_songs(owner_id);
CREATE INDEX IF NOT EXISTS shared_setlist_songs_setlist_id_idx ON public.shared_setlist_songs(shared_setlist_id);
CREATE INDEX IF NOT EXISTS shared_setlist_songs_song_id_idx ON public.shared_setlist_songs(shared_song_id);
CREATE INDEX IF NOT EXISTS band_messages_band_id_idx ON public.band_messages(band_id);
CREATE INDEX IF NOT EXISTS band_messages_created_at_idx ON public.band_messages(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_messages ENABLE ROW LEVEL SECURITY;

-- Bands policies
CREATE POLICY "Band members can view their bands"
    ON public.bands FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = bands.id
            AND band_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create bands"
    ON public.bands FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Band owners and admins can update bands"
    ON public.bands FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = bands.id
            AND band_members.user_id = auth.uid()
            AND band_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Band owners can delete bands"
    ON public.bands FOR DELETE
    USING (auth.uid() = owner_id);

-- Band members policies
CREATE POLICY "Band members can view band members"
    ON public.band_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members AS bm
            WHERE bm.band_id = band_members.band_id
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Band owners and admins can add members"
    ON public.band_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.band_members AS bm
            WHERE bm.band_id = band_members.band_id
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin')
        ) OR
        -- Allow system to add owner when band is created
        EXISTS (
            SELECT 1 FROM public.bands
            WHERE bands.id = band_members.band_id
            AND bands.owner_id = band_members.user_id
            AND band_members.role = 'owner'
        )
    );

CREATE POLICY "Band owners and admins can remove members"
    ON public.band_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members AS bm
            WHERE bm.band_id = band_members.band_id
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'admin')
        ) OR
        -- Members can remove themselves
        band_members.user_id = auth.uid()
    );

-- Band invitations policies
CREATE POLICY "Users can view their own invitations"
    ON public.band_invitations FOR SELECT
    USING (
        auth.uid() = invitee_id OR
        auth.uid() = inviter_id OR
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = band_invitations.band_id
            AND band_members.user_id = auth.uid()
            AND band_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Band owners and admins can create invitations"
    ON public.band_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = band_invitations.band_id
            AND band_members.user_id = auth.uid()
            AND band_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update their own invitations"
    ON public.band_invitations FOR UPDATE
    USING (
        auth.uid() = invitee_id OR
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = band_invitations.band_id
            AND band_members.user_id = auth.uid()
            AND band_members.role IN ('owner', 'admin')
        )
    );

-- Shared setlists policies
CREATE POLICY "Band members can view shared setlists"
    ON public.shared_setlists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = shared_setlists.band_id
            AND band_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Band members can create shared setlists"
    ON public.shared_setlists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = shared_setlists.band_id
            AND band_members.user_id = auth.uid()
        )
        AND auth.uid() = owner_id
    );

CREATE POLICY "Setlist owners can update their setlists"
    ON public.shared_setlists FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Setlist owners can delete their setlists"
    ON public.shared_setlists FOR DELETE
    USING (auth.uid() = owner_id);

-- Shared setlist songs policies
CREATE POLICY "Band members can view shared setlist songs"
    ON public.shared_setlist_songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_setlists
            JOIN public.band_members ON band_members.band_id = shared_setlists.band_id
            WHERE shared_setlists.id = shared_setlist_songs.shared_setlist_id
            AND band_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Setlist owners can manage setlist songs"
    ON public.shared_setlist_songs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_setlists
            WHERE shared_setlists.id = shared_setlist_songs.shared_setlist_id
            AND shared_setlists.owner_id = auth.uid()
        )
    );

-- Shared songs policies
CREATE POLICY "Band members can view shared songs"
    ON public.shared_songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = shared_songs.band_id
            AND band_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Band members can create shared songs"
    ON public.shared_songs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = shared_songs.band_id
            AND band_members.user_id = auth.uid()
        )
        AND auth.uid() = owner_id
    );

CREATE POLICY "Song owners can update their songs"
    ON public.shared_songs FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Song owners can delete their songs"
    ON public.shared_songs FOR DELETE
    USING (auth.uid() = owner_id);

-- Band messages policies
CREATE POLICY "Band members can view messages"
    ON public.band_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = band_messages.band_id
            AND band_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Band members can send messages"
    ON public.band_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id = band_messages.band_id
            AND band_members.user_id = auth.uid()
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "Message owners can update their messages"
    ON public.band_messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Message owners can delete their messages"
    ON public.band_messages FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp on bands
CREATE TRIGGER bands_updated_at
    BEFORE UPDATE ON public.bands
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update updated_at timestamp on band_invitations
CREATE TRIGGER band_invitations_updated_at
    BEFORE UPDATE ON public.band_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update updated_at timestamp on shared_setlists
CREATE TRIGGER shared_setlists_updated_at
    BEFORE UPDATE ON public.shared_setlists
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update updated_at timestamp on shared_songs
CREATE TRIGGER shared_songs_updated_at
    BEFORE UPDATE ON public.shared_songs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update updated_at timestamp on band_messages
CREATE TRIGGER band_messages_updated_at
    BEFORE UPDATE ON public.band_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-add owner as member when band is created
CREATE OR REPLACE FUNCTION public.handle_new_band()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.band_members (band_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_band_created
    AFTER INSERT ON public.bands
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_band();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for band audio files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('band-audio', 'band-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Band members can upload audio to their band's folder
CREATE POLICY "Band members can upload band audio"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'band-audio' AND
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id::text = (storage.foldername(name))[1]
            AND band_members.user_id = auth.uid()
        )
    );

-- Policy: Band members can view band audio
CREATE POLICY "Band members can view band audio"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'band-audio' AND
        EXISTS (
            SELECT 1 FROM public.band_members
            WHERE band_members.band_id::text = (storage.foldername(name))[1]
            AND band_members.user_id = auth.uid()
        )
    );

-- Policy: File owners can update their uploads
CREATE POLICY "Users can update their band audio"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'band-audio' AND
        auth.uid()::text = (storage.foldername(name))[2]
    );

-- Policy: File owners can delete their uploads
CREATE POLICY "Users can delete their band audio"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'band-audio' AND
        auth.uid()::text = (storage.foldername(name))[2]
    );
