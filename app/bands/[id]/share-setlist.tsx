import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Music } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSetlistStore } from '@/store/setlistStore';
import { useSongStore } from '@/store/songStore';
import { useSharedSetlistStore } from '@/store/sharedSetlistStore';
import { useChatStore } from '@/store/chatStore';

export default function ShareSetlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { setlists } = useSetlistStore();
  const { songs } = useSongStore();
  const { shareSetlist, isSharing } = useSharedSetlistStore();
  const { shareSetlistInChat } = useChatStore();

  const handleShare = async (setlistId: string) => {
    if (!id) return;

    const setlist = setlists[setlistId];
    if (!setlist) return;

    const setlistSongs = setlist.songs.map((songId) => songs[songId]).filter(Boolean);

    if (setlistSongs.length === 0) {
      Alert.alert('Error', 'This setlist has no songs to share.');
      return;
    }

    const audioCount = setlistSongs.filter(s => s.audioUri).length;
    const message = audioCount > 0
      ? `Share "${setlist.name}" to this band?\n\n${setlistSongs.length} songs will be shared, including ${audioCount} audio files. This may take a few moments.`
      : `Share "${setlist.name}" to this band?\n\n${setlistSongs.length} songs will be shared (no audio files).`;

    Alert.alert(
      'Share Setlist',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            try {
              const sharedSetlist = await shareSetlist(id, setlist, setlistSongs);

              if (sharedSetlist) {
                // Post to chat
                await shareSetlistInChat(id, sharedSetlist.id, setlist.name);

                Alert.alert('Success', 'Setlist shared successfully!', [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]);
              } else {
                Alert.alert('Error', 'Failed to share setlist. Please try again.');
              }
            } catch (error) {
              console.error('Error sharing setlist:', error);
              Alert.alert('Error', 'Failed to share setlist. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const setlistsArray = Object.values(setlists);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Share Setlist',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isSharing && (
          <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
              Sharing setlist and uploading audio files...
            </Text>
            <Text style={[styles.loadingSubtext, { color: '#CCCCCC' }]}>
              This may take a few moments
            </Text>
          </View>
        )}

        {setlistsArray.length === 0 ? (
          <View style={styles.emptyState}>
            <Music size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Setlists
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create a setlist first to share it with your band.
            </Text>
          </View>
        ) : (
          <FlatList
            data={setlistsArray}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const songCount = item.songs.length;
              const setlistSongs = item.songs.map((songId) => songs[songId]).filter(Boolean);
              const audioCount = setlistSongs.filter(s => s.audioUri).length;

              return (
                <TouchableOpacity
                  style={[styles.setlistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleShare(item.id)}
                  disabled={isSharing}
                >
                  <View style={[styles.setlistIcon, { backgroundColor: colors.primary }]}>
                    <Music size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.setlistInfo}>
                    <Text style={[styles.setlistName, { color: colors.text }]}>{item.name}</Text>
                    <View style={styles.setlistMeta}>
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {songCount} {songCount === 1 ? 'song' : 'songs'}
                      </Text>
                      {audioCount > 0 && (
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          • {audioCount} with audio
                        </Text>
                      )}
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        • {formatDuration(item.duration)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  setlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  setlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  setlistInfo: {
    flex: 1,
  },
  setlistName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  setlistMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 14,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
