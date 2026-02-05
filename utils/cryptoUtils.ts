import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Hash a string using SHA-256
 * Works on both native platforms and web
 */
export async function hashString(input: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Use Web Crypto API for web platform
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } else {
    // Use expo-crypto for native platforms
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input
    );
  }
}
