import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, PanResponder, Dimensions, Modal } from 'react-native';
import { useThemeContext } from '../ThemeContext';
import Svg, { Line } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
}

export default function WebSlidePage() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState('');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [links, setLinks] = useState<{ from: string; to: string }[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editText, setEditText] = useState('');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);
  const LONG_PRESS_DURATION = 400; // ms
  const MOVE_THRESHOLD = 10; // px

  const handleAddNote = () => {
    if (!input.trim()) return;
    setNotes([
      ...notes,
      {
        id: Date.now().toString(),
        text: input,
        x: width / 2 - 75,
        y: 150,
      },
    ]);
    setInput('');
  };

  const createPanResponder = (note: Note) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        setLongPressActive(true);
        const timer = setTimeout(() => {
          setLongPressActive(false);
          setEditingNote(note);
          setEditText(note.text);
        }, LONG_PRESS_DURATION);
        setLongPressTimer(timer);
        setDraggedNoteId(note.id);
        setDragOffset({
          x: gestureState.x0 - note.x,
          y: gestureState.y0 - note.y,
        });
      },
      onPanResponderMove: (e, gestureState) => {
        if (!longPressActive) {
          if (draggedNoteId === note.id) {
            setNotes((prevNotes) =>
              prevNotes.map((n) =>
                n.id === note.id
                  ? {
                      ...n,
                      x: gestureState.moveX - dragOffset.x,
                      y: gestureState.moveY - dragOffset.y,
                    }
                  : n
              )
            );
          }
        } else {
          // If user moves more than threshold, cancel long press
          if (
            Math.abs(gestureState.dx) > MOVE_THRESHOLD ||
            Math.abs(gestureState.dy) > MOVE_THRESHOLD
          ) {
            setLongPressActive(false);
            if (longPressTimer) clearTimeout(longPressTimer);
          }
        }
      },
      onPanResponderRelease: () => {
        setDraggedNoteId(null);
        setLongPressActive(false);
        if (longPressTimer) clearTimeout(longPressTimer);
      },
      onPanResponderTerminate: () => {
        setDraggedNoteId(null);
        setLongPressActive(false);
        if (longPressTimer) clearTimeout(longPressTimer);
      },
    });

  // Helper to check if two notes are linked
  const isLinked = (id1: string, id2: string) =>
    links.some(
      l => (l.from === id1 && l.to === id2) || (l.from === id2 && l.to === id1)
    );

  // Find the nearest note to a given note
  const findNearestNoteId = (note: Note) => {
    let minDist = Infinity;
    let nearestId: string | null = null;
    for (const n of notes) {
      if (n.id === note.id) continue;
      const dist = Math.hypot(n.x - note.x, n.y - note.y);
      if (dist < minDist) {
        minDist = dist;
        nearestId = n.id;
      }
    }
    return nearestId;
  };

  // Open edit modal
  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditText(note.text);
  };

  // Save edited note text
  const handleSaveEdit = () => {
    if (editingNote) {
      setNotes(notes.map(n => n.id === editingNote.id ? { ...n, text: editText } : n));
      setEditingNote(null);
    }
  };

  // Link to nearest note
  const handleLinkNearest = () => {
    if (!editingNote) return;
    const nearestId = findNearestNoteId(editingNote);
    if (!nearestId) return;
    if (!isLinked(editingNote.id, nearestId)) {
      setLinks([...links, { from: editingNote.id, to: nearestId }]);
    }
    setEditingNote(null);
  };

  // Unlink from all notes
  const handleUnlinkAll = () => {
    if (!editingNote) return;
    setLinks(links.filter(l => l.from !== editingNote.id && l.to !== editingNote.id));
    setEditingNote(null);
  };

  // Only draw lines for linked notes
  const lines = links.map((l, idx) => {
    const from = notes.find(n => n.id === l.from);
    const to = notes.find(n => n.id === l.to);
    if (!from || !to) return null;
    return {
      from,
      to,
      key: `${l.from}-${l.to}`,
    };
  }).filter(Boolean);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Spider web SVG lines */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {(lines.filter(Boolean) as { from: Note; to: Note; key: string }[]).map(({ from, to, key }) => (
          <Line
            key={key}
            x1={from.x + 60}
            y1={from.y + 25}
            x2={to.x + 60}
            y2={to.y + 25}
            stroke={isDark ? '#888' : '#333'}
            strokeWidth={2}
            strokeDasharray="6 6"
            opacity={0.5}
          />
        ))}
      </Svg>
      {/* UI for notes and input */}
      <Text style={[styles.title, isDark && styles.textDark]}>Web Slide Notes</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          placeholder="Type your note..."
          placeholderTextColor={isDark ? '#aaa' : '#888'}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleAddNote}
        />
        <TouchableOpacity style={[styles.addButton, isDark && styles.addButtonDark]} onPress={handleAddNote}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      {notes.map((note) => {
        const panResponder = createPanResponder(note);
        return (
          <View
            key={note.id}
            style={{ position: 'absolute', left: note.x, top: note.y, zIndex: draggedNoteId === note.id ? 2 : 1 }}
            {...panResponder.panHandlers}
          >
            <View style={[styles.note, isDark && styles.noteDark]}>
              <Text style={[styles.noteText, isDark && styles.textDark]}>{note.text}</Text>
            </View>
          </View>
        );
      })}
      {/* Edit Modal */}
      <Modal
        visible={!!editingNote}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingNote(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, isDark && styles.editModalDark]}>
            <Text style={[styles.editModalTitle, isDark && styles.textDark]}>Edit Note</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark, { marginBottom: 16 }]}
              value={editText}
              onChangeText={setEditText}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.linkButton, isDark && styles.linkButtonDark]} onPress={handleLinkNearest}>
                <Text style={styles.linkButtonText}>Link to Nearest</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkButton, isDark && styles.linkButtonDark]} onPress={handleUnlinkAll}>
                <Text style={styles.linkButtonText}>Unlink All</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.addButton, isDark && styles.addButtonDark, { marginTop: 16 }]} onPress={handleSaveEdit}>
              <Text style={styles.addButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setEditingNote(null)}>
              <Text style={[styles.linkButtonText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
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
  textDark: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  inputDark: {
    backgroundColor: '#222',
    color: '#fff',
    borderColor: '#444',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  addButtonDark: {
    backgroundColor: '#333',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  note: {
    position: 'absolute',
    minWidth: 120,
    minHeight: 50,
    backgroundColor: '#fffbe7',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  noteDark: {
    backgroundColor: '#23242a',
  },
  noteText: {
    fontSize: 16,
    color: '#333',
  },
  noteSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  linkButton: {
    alignSelf: 'center',
    backgroundColor: '#ffd600',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
  },
  linkButtonDark: {
    backgroundColor: '#333',
  },
  linkButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    backgroundColor: '#fffde7',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    elevation: 5,
  },
  editModalDark: {
    backgroundColor: '#23242a',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
}); 