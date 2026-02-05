import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LogOut, Trash2, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useBandStore } from '@/store/bandStore';
import { useAuthStore } from '@/store/authStore';

export default function BandSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentBand, members, leaveBand, deleteBand } = useBandStore();

  if (!currentBand || !id) {
    return null;
  }

  const bandMembers = members[id] || [];
  const currentUserMember = bandMembers.find(m => m.user_id === user?.id);
  const isOwner = currentUserMember?.role === 'owner';

  const handleLeaveBand = () => {
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'As the band owner, you must transfer ownership or delete the band before leaving.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Leave Band',
      `Are you sure you want to leave ${currentBand.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const success = await leaveBand(id);
            if (success) {
              Alert.alert('Left Band', `You have left ${currentBand.name}`, [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/bands' as any)
                }
              ]);
            } else {
              Alert.alert('Error', 'Failed to leave band');
            }
          },
        },
      ]
    );
  };

  const handleDeleteBand = () => {
    if (!isOwner) {
      Alert.alert('Error', 'Only the band owner can delete the band.');
      return;
    }

    Alert.alert(
      'Delete Band',
      `Are you sure you want to permanently delete ${currentBand.name}? This action cannot be undone and will remove all shared setlists and messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteBand(id);
            if (success) {
              Alert.alert('Band Deleted', 'The band has been deleted', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/bands' as any)
                }
              ]);
            } else {
              Alert.alert('Error', 'Failed to delete band');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Band Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView style={styles.scrollView}>
        {/* Band Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Band Information</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{currentBand.name}</Text>
            </View>
            {currentBand.description && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Description:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{currentBand.description}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Members:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{bandMembers.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Your Role:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {currentUserMember?.role || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>

          {!isOwner && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleLeaveBand}
            >
              <LogOut size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Leave Band</Text>
            </TouchableOpacity>
          )}

          {isOwner && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.error }]}
              onPress={handleDeleteBand}
            >
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete Band</Text>
            </TouchableOpacity>
          )}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
