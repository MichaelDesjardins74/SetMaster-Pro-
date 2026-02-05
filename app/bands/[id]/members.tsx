import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { User, Mail, UserPlus, Crown, Shield } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useBandStore } from '@/store/bandStore';
import { useAuthStore } from '@/store/authStore';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { currentBand, members, loadBandMembers, inviteMember, removeMember } = useBandStore();
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const bandMembers = members[id] || [];
  const currentUserMember = bandMembers.find(m => m.user_id === user?.id);
  const isOwnerOrAdmin = currentUserMember && ['owner', 'admin'].includes(currentUserMember.role);

  useEffect(() => {
    if (id) {
      loadBandMembers(id);
    }
  }, [id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !id) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      const success = await inviteMember(id, inviteEmail.trim().toLowerCase());

      if (success) {
        Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setShowInviteInput(false);
      } else {
        Alert.alert('Error', 'Failed to send invitation. Please try again.');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = (memberId: string, memberName: string) => {
    if (!id) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the band?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removeMember(id, memberId);
            if (success) {
              Alert.alert('Success', 'Member removed from band');
            } else {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={colors.primary} />;
      case 'admin':
        return <Shield size={16} color={colors.primary} />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    return (
      <View style={[styles.roleBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {getRoleIcon(role)}
        <Text style={[styles.roleText, { color: colors.text }]}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Members',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Invite Section */}
        {isOwnerOrAdmin && (
          <View style={[styles.inviteSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {showInviteInput ? (
              <View style={styles.inviteInputContainer}>
                <TextInput
                  style={[styles.inviteInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isInviting}
                />
                <View style={styles.inviteButtons}>
                  <TouchableOpacity
                    style={[styles.inviteButton, { backgroundColor: colors.primary, opacity: isInviting || !inviteEmail.trim() ? 0.5 : 1 }]}
                    onPress={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    <Text style={styles.inviteButtonText}>
                      {isInviting ? 'Sending...' : 'Send Invite'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowInviteInput(false);
                      setInviteEmail('');
                    }}
                    disabled={isInviting}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.invitePrompt}
                onPress={() => setShowInviteInput(true)}
              >
                <UserPlus size={20} color={colors.primary} />
                <Text style={[styles.invitePromptText, { color: colors.text }]}>
                  Invite New Member
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Members List */}
        <FlatList
          data={bandMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isCurrentUser = item.user_id === user?.id;
            const canRemove = isOwnerOrAdmin && !isCurrentUser && item.role !== 'owner';

            return (
              <View style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
                  <User size={24} color="#FFFFFF" />
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {item.profiles?.full_name || 'Unknown'}
                      {isCurrentUser && <Text style={[styles.youBadge, { color: colors.textSecondary }]}> (You)</Text>}
                    </Text>
                  </View>
                  {item.profiles?.email && (
                    <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                      {item.profiles.email}
                    </Text>
                  )}
                  {getRoleBadge(item.role)}
                </View>
                {canRemove && (
                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: colors.error }]}
                    onPress={() => handleRemove(item.user_id, item.profiles?.full_name || 'Unknown')}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inviteSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  invitePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invitePromptText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteInputContainer: {
    gap: 12,
  },
  inviteInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  youBadge: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  memberEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
