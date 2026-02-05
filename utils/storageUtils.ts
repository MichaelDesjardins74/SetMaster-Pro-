/**
 * Utility functions for user-specific storage
 */

export const getUserStorageKey = (userId: string, baseKey: string): string => {
  return `${baseKey}_user_${userId}`;
};

export const getDefaultStorageKey = (baseKey: string): string => {
  return baseKey;
};
