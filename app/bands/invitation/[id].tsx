import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Users, Mail, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBandStore } from '@/store/bandStore';

export default function InvitationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { invitations, acceptInvitation, declineInvitation } = useBandStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const invitation = invitations.find(inv => inv.id === id);

  if (!invitation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Invitation not found
          </Text>
        </View>
      </View>
    );
  }

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const success = await acceptInvitation(invitation.id);

      if (success) {
        Alert.alert('Success', 'You have joined the band!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/bands' as any);
            }
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const success = await declineInvitation(invitation.id);

              if (success) {
                Alert.alert('Invitation Declined', 'You have declined the invitation.', [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]);
              } else {
                Alert.alert('Error', 'Failed to decline invitation.');
              }
            } catch (error) {
              console.error('Error declining invitation:', error);
              Alert.alert('Error', 'Failed to decline invitation.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Band Invitation',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackVisible: true,
          headerBackTitle: 'Back',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Users size={48} color="#FFFFFF" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            You're Invited!
          </Text>

          <View style={[styles.invitationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.invitationRow}>
              <Mail size={20} color={colors.textSecondary} />
              <Text style={[styles.invitationLabel, { color: colors.textSecondary }]}>Band:</Text>
              <Text style={[styles.invitationValue, { color: colors.text }]}>
                {invitation.bands?.name}
              </Text>
            </View>

            <View style={styles.invitationRow}>
              <Users size={20} color={colors.textSecondary} />
              <Text style={[styles.invitationLabel, { color: colors.textSecondary }]}>From:</Text>
              <Text style={[styles.invitationValue, { color: colors.text }]}>
                {invitation.profiles?.full_name || 'Unknown'}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Accept this invitation to join the band and start collaborating with your bandmates!
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.primary, opacity: isProcessing ? 0.5 : 1 }]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept Invitation</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineButton, { borderColor: colors.border, opacity: isProcessing ? 0.5 : 1 }]}
              onPress={handleDecline}
              disabled={isProcessing}
            >
              <XCircle size={20} color={colors.error} />
              <Text style={[styles.declineButtonText, { color: colors.error }]}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  invitationCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  invitationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  invitationLabel: {
    fontSize: 16,
    width: 60,
  },
  invitationValue: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
