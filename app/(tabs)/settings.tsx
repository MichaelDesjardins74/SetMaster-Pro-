import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Moon, Sun, Info, Clock, Smartphone, LogOut, User, Camera } from 'lucide-react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

// Helper function to decode base64 to ArrayBuffer for upload
const decode = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, updateProfile } = useAuthStore();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const uploadProfilePicture = async (uri: string) => {
    try {
      if (!user) {
        console.error('❌ No user found, cannot upload');
        return null;
      }

      console.log('📸 Starting profile picture upload for user:', user.id);

      // Generate unique file name - use folder structure for RLS policies
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('📁 Upload path:', filePath);

      // Read file as base64
      console.log('📖 Reading file from:', uri);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✓ File read successfully, size:', base64.length, 'chars');

      // Convert base64 to blob
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      console.log('☁️  Uploading to Supabase Storage (avatars bucket)...');
      console.log('   Content-Type:', contentType);

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('❌ Upload error:', error);
        console.error('   Error message:', error.message);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✓ Upload successful!', data);

      // Get public URL
      console.log('🔗 Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('✓ Public URL:', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('❌ Critical error in uploadProfilePicture:', error);
      if (error instanceof Error) {
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
      }
      throw error;
    }
  };

  const handleProfilePictureUpdate = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      setIsUploadingImage(true);

      // Upload image
      const imageUrl = await uploadProfilePicture(result.assets[0].uri);

      if (imageUrl) {
        // Update profile in database
        const success = await updateProfile({ avatar_url: imageUrl });

        if (success) {
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          Alert.alert('Error', 'Failed to update profile picture. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const toggleAutoScroll = () => {
    updateSettings({ autoScroll: !settings.autoScroll });
  };

  const toggleKeepScreenAwake = () => {
    updateSettings({ keepScreenAwake: !settings.keepScreenAwake });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Profile Section */}
      {user && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>

          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.profileInfo}>
              <View style={styles.profilePictureContainer}>
                {user.profilePicture ? (
                  <Image
                    source={{ uri: user.profilePicture }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={[styles.profileIconContainer, { backgroundColor: colors.primary }]}>
                    <User size={32} color="#FFFFFF" />
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.cameraButton, { backgroundColor: colors.primary }]}
                  onPress={handleProfilePictureUpdate}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.profileDetails}>
                {user.name && (
                  <Text style={[styles.profileName, { color: colors.text }]}>{user.name}</Text>
                )}
                {user.email && (
                  <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user.email}</Text>
                )}
                <View style={styles.providerBadge}>
                  <Text style={[styles.providerText, { color: colors.textSecondary }]}>
                    Signed in with {user.authProvider === 'email' ? 'Email' : 'Apple'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.error }]}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              {isDark ? (
                <Moon size={24} color={colors.primary} />
              ) : (
                <Sun size={24} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Font Size</Text>
          </View>
          <View style={styles.fontSizeControls}>
            <Pressable
              style={[styles.fontSizeButton, { 
                opacity: settings.fontScale <= 0.8 ? 0.5 : 1,
                backgroundColor: colors.surface 
              }]}
              onPress={() => updateSettings({ fontScale: Math.max(0.8, settings.fontScale - 0.1) })}
              disabled={settings.fontScale <= 0.8}
            >
              <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>A-</Text>
            </Pressable>
            <Text style={[styles.fontSizeValue, { color: colors.text }]}>{Math.round(settings.fontScale * 100)}%</Text>
            <Pressable
              style={[styles.fontSizeButton, { 
                opacity: settings.fontScale >= 1.5 ? 0.5 : 1,
                backgroundColor: colors.surface 
              }]}
              onPress={() => updateSettings({ fontScale: Math.min(1.5, settings.fontScale + 0.1) })}
              disabled={settings.fontScale >= 1.5}
            >
              <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>A+</Text>
            </Pressable>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Clock size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto-Scroll</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Automatically scroll lyrics during playback
              </Text>
            </View>
          </View>
          <Switch
            value={settings.autoScroll}
            onValueChange={toggleAutoScroll}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
        
        {settings.autoScroll && (
          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Scroll Speed</Text>
            </View>
            <View style={styles.fontSizeControls}>
              <Pressable
                style={[styles.fontSizeButton, { 
                  opacity: settings.scrollSpeed <= 0.5 ? 0.5 : 1,
                  backgroundColor: colors.surface 
                }]}
                onPress={() => updateSettings({ scrollSpeed: Math.max(0.5, settings.scrollSpeed - 0.1) })}
                disabled={settings.scrollSpeed <= 0.5}
              >
                <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>-</Text>
              </Pressable>
              <Text style={[styles.fontSizeValue, { color: colors.text }]}>{Math.round(settings.scrollSpeed * 100)}%</Text>
              <Pressable
                style={[styles.fontSizeButton, { 
                  opacity: settings.scrollSpeed >= 1.5 ? 0.5 : 1,
                  backgroundColor: colors.surface 
                }]}
                onPress={() => updateSettings({ scrollSpeed: Math.min(1.5, settings.scrollSpeed + 0.1) })}
                disabled={settings.scrollSpeed >= 1.5}
              >
                <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Smartphone size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Keep Screen Awake</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Prevent screen from turning off during performance
              </Text>
            </View>
          </View>
          <Switch
            value={settings.keepScreenAwake}
            onValueChange={toggleKeepScreenAwake}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        
        <Pressable 
          style={styles.aboutItem}
          onPress={() => router.push('/modal')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Info size={24} color={colors.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>About SetMaster Pro</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  providerBadge: {
    alignSelf: 'flex-start',
  },
  providerText: {
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontSizeValue: {
    fontSize: 14,
    marginHorizontal: 8,
    width: 40,
    textAlign: 'center',
  },
  aboutItem: {
    paddingVertical: 12,
  },
});