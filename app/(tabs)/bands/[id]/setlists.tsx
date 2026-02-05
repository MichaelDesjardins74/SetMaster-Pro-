import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Plus, Music, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useSharedSetlistStore } from '@/store/sharedSetlistStore';
import { useBandStore } from '@/store/bandStore';

export default function BandSetlistsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { currentBand } = useBandStore();
  const { sharedSetlists, isLoading, loadBandSetlists } = useSharedSetlistStore();

  const bandSetlists = sharedSetlists[id] || [];

  useEffect(() => {
    if (id) {
      loadBandSetlists(id);
    }
  }, [id]);

  const handleRefresh = async () => {
    if (id) {
      await loadBandSetlists(id);
    }
  };

  const handleSetlistPress = (setlistId: string) => {
    router.push(`/(tabs)/bands/${id}/setlists/${setlistId}` as any);
  };

  const handleShareSetlist = () => {
    router.push(`/(tabs)/bands/${id}/share-setlist` as any);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shared Setlists',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <FlatList
          data={bandSetlists}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Music size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Shared Setlists
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Share a setlist with your band to get started!
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleShareSetlist}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Share Setlist</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.setlistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSetlistPress(item.id)}
            >
              <View style={[styles.setlistIcon, { backgroundColor: colors.primary }]}>
                <Music size={24} color="#FFFFFF" />
              </View>
              <View style={styles.setlistInfo}>
                <Text style={[styles.setlistName, { color: colors.text }]}>{item.name}</Text>
                {item.description && (
                  <Text style={[styles.setlistDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                <View style={styles.setlistMeta}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Shared by {item.profiles?.full_name || 'Unknown'}
                  </Text>
                  {item.metadata?.song_count && (
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      • {item.metadata.song_count} {item.metadata.song_count === 1 ? 'song' : 'songs'}
                    </Text>
                  )}
                  {item.metadata?.duration && (
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      • {formatDuration(item.metadata.duration)}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />

        {bandSetlists.length > 0 && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handleShareSetlist}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 4,
  },
  setlistDescription: {
    fontSize: 14,
    marginBottom: 6,
  },
  setlistMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
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
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
