import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MessageCircle, ListMusic, Users, Settings, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useBandStore } from '@/store/bandStore';

export default function BandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { selectBand, currentBand, members } = useBandStore();

  useEffect(() => {
    if (id) {
      selectBand(id);
    }
  }, [id]);

  if (!currentBand) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading band...
        </Text>
      </SafeAreaView>
    );
  }

  const bandMembers = members[currentBand.id] || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: currentBand.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Bands',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/bands/${id}/settings` as any)}
              style={styles.headerButton}
            >
              <Settings size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView style={styles.scrollView}>
          {/* Band Info */}
          <View style={styles.section}>
          <View style={[styles.bandHeader, { backgroundColor: colors.surface }]}>
            <View style={[styles.bandIconLarge, { backgroundColor: colors.primary }]}>
              <Users size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.bandName, { color: colors.text }]}>{currentBand.name}</Text>
            {currentBand.description && (
              <Text style={[styles.bandDescription, { color: colors.textSecondary }]}>
                {currentBand.description}
              </Text>
            )}
            {bandMembers.length > 0 && (
              <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
                {bandMembers.length} {bandMembers.length === 1 ? 'member' : 'members'}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/bands/${id}/chat` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <MessageCircle size={28} color={colors.primary} />
                <View style={[styles.chevronBadge, { backgroundColor: colors.background }]}>
                  <ChevronRight size={12} color={colors.textSecondary} />
                </View>
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Chat</Text>
              <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
                Team messaging
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/bands/${id}/setlists` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <ListMusic size={28} color={colors.primary} />
                <View style={[styles.chevronBadge, { backgroundColor: colors.background }]}>
                  <ChevronRight size={12} color={colors.textSecondary} />
                </View>
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Setlists</Text>
              <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
                Shared playlists
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/bands/${id}/members` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Users size={28} color={colors.primary} />
                <View style={[styles.chevronBadge, { backgroundColor: colors.background }]}>
                  <ChevronRight size={12} color={colors.textSecondary} />
                </View>
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Members</Text>
              <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
                {bandMembers.length} {bandMembers.length === 1 ? 'member' : 'members'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/bands/${id}/settings` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Settings size={28} color={colors.primary} />
                <View style={[styles.chevronBadge, { backgroundColor: colors.background }]}>
                  <ChevronRight size={12} color={colors.textSecondary} />
                </View>
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Settings</Text>
              <Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>
                Band options
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  bandHeader: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  bandIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bandName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  bandDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  memberCount: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionCard: {
    width: '47%',
    aspectRatio: 1,
    margin: '1.5%',
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  chevronBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  actionSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
