export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  uri?: string;
  albumArt?: string;
  audioUri?: string;
  lyrics?: string;
  notes?: string;
  bpm?: number;
  key?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Setlist {
  id: string;
  name: string;
  songs: string[]; // array of song IDs
  duration: number;
  createdAt: number;
  updatedAt: number;
  description?: string;
  venue?: string;
  eventDate?: number;
}

export interface Cue {
  id: string;
  songId: string;
  timeInSeconds: number;
  type: 'lyric' | 'section' | 'note' | 'warning';
  content: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PracticeSchedule {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  reminderEnabled: boolean;
  reminderMinutes?: number; // minutes before practice
  goals?: string[];
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoplayNext: boolean;
  keepScreenAwake: boolean;
  showLyrics: boolean;
  volume: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}

// Band/Group Collaboration Types

export interface Band {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profiles?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface BandInvitation {
  id: string;
  band_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  updated_at: string;
  expires_at: string;
  bands?: {
    name: string;
    avatar_url?: string;
  };
  profiles?: {
    full_name: string | null;
  };
}

export interface UserSearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email_hint: string | null;
}

export interface SharedSetlist {
  id: string;
  band_id: string;
  owner_id: string;
  name: string;
  description?: string;
  venue?: string;
  event_date?: string;
  metadata?: {
    duration?: number;
    song_count?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  shared_setlist_songs?: Array<{
    position: number;
    shared_songs: SharedSong;
  }>;
}

export interface SharedSong {
  id: string;
  band_id: string;
  owner_id: string;
  title: string;
  artist: string;
  duration: number;
  audio_url?: string;
  album_art?: string;
  lyrics?: string;
  notes?: string;
  bpm?: number;
  key?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface BandMessage {
  id: string;
  band_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'system' | 'setlist_share' | 'song_share';
  metadata?: any;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}
