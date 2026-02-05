import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Music, Play, Pause, Clock, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useSharedSetlistStore } from '@/store/sharedSetlistStore';
import { usePlayerStore } from '@/store/playerStore';
import { SharedSetlist, SharedSong } from '@/types';

export default function SharedSetlistDetailScreen() {
  const { id, setlistId } = useLocalSearchParams<{ id: string; setlistId: string }>();
  const { colors } = useTheme();
  const { getSetlistDetails } = useSharedSetlistStore();
  const { loadAndPlayAudio, unloadAudio, playbackState, setPlaybackState } = usePlayerStore();

  const [setlist, setSetlist] = useState<SharedSetlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayingSongId, setCurrentPlayingSongId] = useState<string | null>(null);

  useEffect(() => {
    loadSetlist();

    return () => {
      // Cleanup: unload audio when leaving screen
      unloadAudio();
      setCurrentPlayingSongId(null);
    };
  }, [setlistId]);

  const loadSetlist = async () => {
    if (!setlistId) return;

    setIsLoading(true);
    try {
      const details = await getSetlistDetails(setlistId);
      setSetlist(details);
    } catch (error) {
      console.error('Error loading setlist:', error);
      Alert.alert('Error', 'Failed to load setlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySong = async (song: SharedSong) => {
    if (!song.audio_url) {
      Alert.alert('No Audio', 'This song does not have an audio file.');
      return;
    }

    try {
      // If same song is playing, toggle play/pause
      if (currentPlayingSongId === song.id) {
        if (playbackState.isPlaying) {
          setPlaybackState({ isPlaying: false });
        } else {
          setPlaybackState({ isPlaying: true });
        }
        return;
      }

      // Stop current playback
      await unloadAudio();

      // Start playing new song
      setCurrentPlayingSongId(song.id);
      await loadAndPlayAudio(song.audio_url, true);
    } catch (error: any) {
      console.error('Error playing song:', error);
      Alert.alert('Playback Error', error.message || 'Failed to play audio');
      setCurrentPlayingSongId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract songs from the setlist data
  const songs: SharedSong[] = setlist?.shared_setlist_songs?.map(item => item.shared_songs).filter(Boolean) || [];

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (!setlist) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Setlist Not Found',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Setlist not found
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: setlist.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Setlist Info Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{setlist.name}</Text>
          {setlist.description && (
            <Text style={[styles.headerDescription, { color: colors.textSecondary }]}>
              {setlist.description}
            </Text>
          )}
          <View style={styles.headerMeta}>
            <View style={styles.metaItem}>
              <User size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {setlist.profiles?.full_name || 'Unknown'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Music size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
              </Text>
            </View>
          </View>
        </View>

        {/* Songs List */}
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isCurrentSong = currentPlayingSongId === item.id;
            const isPlaying = isCurrentSong && playbackState.isPlaying;
            const hasAudio = !!item.audio_url;

            return (
              <TouchableOpacity
                style={[
                  styles.songCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isCurrentSong && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => handlePlaySong(item)}
                disabled={!hasAudio}
              >
                <View style={[styles.songIndex, { backgroundColor: isCurrentSong ? colors.primary : colors.background }]}>
                  {isCurrentSong ? (
                    isPlaying ? (
                      <Pause size={16} color="#FFFFFF" />
                    ) : (
                      <Play size={16} color="#FFFFFF" />
                    )
                  ) : hasAudio ? (
                    <Play size={16} color={colors.textSecondary} />
                  ) : (
                    <Text style={[styles.indexText, { color: colors.textSecondary }]}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
                <View style={styles.songMeta}>
                  <View style={styles.durationContainer}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                      {formatDuration(item.duration)}
                    </Text>
                  </View>
                  {!hasAudio && (
                    <Text style={[styles.noAudioBadge, { color: colors.textSecondary }]}>
                      No audio
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                No songs in this setlist
              </Text>
            </View>
          }
        />

        {/* Now Playing Bar */}
        {currentPlayingSongId && (
          <View style={[styles.nowPlayingBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.nowPlayingInfo}>
              <Text style={[styles.nowPlayingTitle, { color: colors.text }]} numberOfLines={1}>
                {songs.find(s => s.id === currentPlayingSongId)?.title || 'Unknown'}
              </Text>
              <Text style={[styles.nowPlayingTime, { color: colors.textSecondary }]}>
                {formatDuration(playbackState.currentTime)} / {formatDuration(playbackState.duration)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.playPauseButton, { backgroundColor: colors.primary }]}
              onPress={() => setPlaybackState({ isPlaying: !playbackState.isPlaying })}
            >
              {playbackState.isPlaying ? (
                <Pause size={24} color="#FFFFFF" />
              ) : (
                <Play size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  songIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 14,
  },
  songMeta: {
    alignItems: 'flex-end',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
  },
  noAudioBadge: {
    fontSize: 10,
    marginTop: 4,
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
  },
  nowPlayingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  nowPlayingTime: {
    fontSize: 12,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
