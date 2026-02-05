import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, User, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { UserSearchResult } from '@/types';

interface UserSearchInputProps {
  onSelectUser: (user: UserSearchResult) => void;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  onSearch: (term: string) => void;
  onClear: () => void;
  placeholder?: string;
  excludeUserIds?: string[];
}

export default function UserSearchInput({
  onSelectUser,
  searchResults,
  isSearching,
  onSearch,
  onClear,
  placeholder = 'Search by name or email...',
  excludeUserIds = [],
}: UserSearchInputProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setShowResults(true);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(text);
    }, 300);
  }, [onSearch]);

  const handleSelectUser = (user: UserSearchResult) => {
    onSelectUser(user);
    setQuery('');
    setShowResults(false);
    onClear();
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    onClear();
  };

  const filteredResults = searchResults.filter(
    (user) => !excludeUserIds.includes(user.id)
  );

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {showResults && query.length >= 2 && (
        <View style={[styles.resultsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredResults.length > 0 ? (
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.resultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectUser(item)}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <User size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.text }]}>
                      {item.full_name || 'Unknown User'}
                    </Text>
                    {item.email_hint && (
                      <Text style={[styles.resultEmail, { color: colors.textSecondary }]}>
                        {item.email_hint}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                {isSearching ? 'Searching...' : 'No users found'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 250,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
  },
});
