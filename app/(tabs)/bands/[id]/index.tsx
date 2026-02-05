import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, ListMusic, Users, Settings, ChevronRight, ChevronLeft } from 'lucide-react-native';
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
  }, [id, selectBand]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Back Button */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.customHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={28} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Bands</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/bands/${id}/settings` as any)}
            style={styles.settingsButton}
          >
            <Settings size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
              onPress={() => router.push(`/(tabs)/bands/${id}/chat` as any)}
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
              onPress={() => router.push(`/(tabs)/bands/${id}/setlists` as any)}
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
              onPress={() => router.push(`/(tabs)/bands/${id}/members` as any)}
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
              onPress={() => router.push(`/(tabs)/bands/${id}/settings` as any)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 17,
    marginLeft: 4,
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
