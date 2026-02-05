import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Users, Mail } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBandStore } from '@/store/bandStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BandsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bands, invitations, isLoading, loadBands, loadInvitations } = useBandStore();

  useEffect(() => {
    loadBands();
    loadInvitations();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([loadBands(), loadInvitations()]);
  };

  const handleBandPress = (bandId: string) => {
    router.push(`/(tabs)/bands/${bandId}` as any);
  };

  const handleCreateBand = () => {
    router.push('/bands/new' as any);
  };

  const handleInvitationPress = (invitationId: string) => {
    router.push(`/bands/invitation/${invitationId}` as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Invitations Section */}
      {invitations.length > 0 && (
        <View style={[styles.invitationsSection, { borderBottomColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Mail size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pending Invitations ({invitations.length})
            </Text>
          </View>
          {invitations.map((invitation) => (
            <TouchableOpacity
              key={invitation.id}
              style={[styles.invitationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleInvitationPress(invitation.id)}
            >
              <View style={styles.invitationContent}>
                <Text style={[styles.invitationText, { color: colors.text }]}>
                  {invitation.bands?.name}
                </Text>
                <Text style={[styles.invitationSubtext, { color: colors.textSecondary }]}>
                  from {invitation.profiles?.full_name || 'Unknown'}
                </Text>
              </View>
              <View style={[styles.invitationBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.invitationBadgeText}>New</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bands List */}
      <FlatList
        data={bands}
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
            <Users size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Bands Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first band to start collaborating with your bandmates!
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateBand}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create Band</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.bandCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleBandPress(item.id)}
          >
            <View style={[styles.bandIcon, { backgroundColor: colors.primary }]}>
              <Users size={24} color="#FFFFFF" />
            </View>
            <View style={styles.bandInfo}>
              <Text style={[styles.bandName, { color: colors.text }]}>{item.name}</Text>
              {item.description && (
                <Text style={[styles.bandDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Band FAB */}
      {bands.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleCreateBand}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  invitationsSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  invitationContent: {
    flex: 1,
  },
  invitationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  invitationSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  invitationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invitationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  bandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bandIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bandInfo: {
    flex: 1,
  },
  bandName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bandDescription: {
    fontSize: 14,
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
