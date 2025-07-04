import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useThemeContext } from './ThemeContext';
import { useDeletedNotes } from './DeletedNotesProvider';

// This page will receive deletedNotes and a handler to permanently delete notes via navigation or context.
// For now, show a placeholder message.

export default function DeletedNotesPage() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const { deletedNotes, permanentlyDeleteNote } = useDeletedNotes();

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && { color: '#fff' }]}>Deleted Notes</Text>
      {deletedNotes.length === 0 ? (
        <Text style={[styles.info, isDark && { color: '#fff' }]}>No deleted notes.</Text>
      ) : (
        <FlatList
          data={deletedNotes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.note}>
              <Text style={styles.noteText}>{item.text}</Text>
              <TouchableOpacity style={styles.deleteButton} onPress={() => permanentlyDeleteNote(item.id)}>
                <Text style={styles.deleteButtonText}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  containerDark: {
    backgroundColor: '#181a20',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: '#888',
    alignSelf: 'center',
    marginTop: 40,
  },
  note: {
    backgroundColor: '#fffbe7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#ff5252',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
}); 