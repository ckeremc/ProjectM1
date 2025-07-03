import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Button, Alert, Platform, Switch } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Picker } from '@react-native-picker/picker';
import { useThemeContext } from '../ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define a type for notes
type ReminderOption = 'timeup' | '1hour' | '1day' | 'specificleft';
type ChecklistItem = { id: string; text: string; checked: boolean };
type Note = {
  id: string;
  text: string;
  done: boolean;
  type: string;
  folderId: string;
  hasCounter: boolean;
  counter: number;
  hasCountdown: boolean;
  countdown: number;
  countdownEnd: number | null;
  reminder: ReminderOption;
  hasChecklist: boolean;
  checklist: ChecklistItem[];
  reminderDate: number | null; // timestamp in ms
};

export default function HomeScreen() {
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';

  const noteTypes = [
    { label: 'Reminder', value: 'reminder', color: '#fff59d' },
    { label: 'To-Do', value: 'todo', color: '#b9f6ca' },
    { label: 'Idea', value: 'idea', color: '#b3e5fc' },
    { label: 'Personal', value: 'personal', color: '#f8bbd0' },
  ];

  const [folders, setFolders] = useState([
    { id: 'default', name: 'Default' },
  ]);
  const [selectedFolder, setSelectedFolder] = useState('default');
  const [newFolderName, setNewFolderName] = useState('');

  const [notes, setNotes] = useState<Note[]>([
    { id: '1', text: 'Welcome to your first note!', done: false, type: 'reminder', folderId: 'default', hasCounter: false, counter: 0, hasCountdown: false, countdown: 0, countdownEnd: null, reminder: 'timeup', hasChecklist: false, checklist: [], reminderDate: null },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note>({ id: '', text: '', done: false, type: 'reminder', folderId: 'default', hasCounter: false, counter: 0, hasCountdown: false, countdown: 0, countdownEnd: null, reminder: 'timeup', hasChecklist: false, checklist: [], reminderDate: null });
  const [isEditing, setIsEditing] = useState(false);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      // Android: set notification channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })();
  }, []);

  // Helper to schedule a notification
  async function scheduleCountdownNotification(note: Note, seconds: number, title: string) {
    if (!note.text) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: note.text,
        sound: true,
      },
      trigger: { seconds },
    });
  }

  // Helper to cancel all notifications (for simplicity, or you can use IDs for per-note cancel)
  async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // For countdown input fields
  const [countdownDays, setCountdownDays] = useState('0');
  const [countdownHours, setCountdownHours] = useState('0');
  const [countdownMinutes, setCountdownMinutes] = useState('0');
  const [countdownSeconds, setCountdownSeconds] = useState('0');

  // Checklist modal state
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [specificLeftDays, setSpecificLeftDays] = useState('0');
  const [specificLeftHours, setSpecificLeftHours] = useState('0');
  const [specificLeftMinutes, setSpecificLeftMinutes] = useState('0');
  const [specificLeftSeconds, setSpecificLeftSeconds] = useState('0');

  const openAddModal = () => {
    setCurrentNote({ id: '', text: '', done: false, type: 'reminder', folderId: selectedFolder, hasCounter: false, counter: 0, hasCountdown: false, countdown: 0, countdownEnd: null, reminder: 'timeup', hasChecklist: false, checklist: [], reminderDate: null });
    setCountdownDays('0');
    setCountdownHours('0');
    setCountdownMinutes('0');
    setCountdownSeconds('0');
    setNewChecklistItem('');
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (note: Note) => {
    setCurrentNote(note);
    // Parse countdown into days/hours/minutes/seconds for editing
    let total = note.countdown || 0;
    setCountdownDays(String(Math.floor(total / 86400)));
    total %= 86400;
    setCountdownHours(String(Math.floor(total / 3600)));
    total %= 3600;
    setCountdownMinutes(String(Math.floor(total / 60)));
    setCountdownSeconds(String(total % 60));
    setNewChecklistItem('');
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!currentNote.text.trim()) {
      Alert.alert('Note cannot be empty');
      return;
    }
    // Calculate total countdown in seconds
    const totalSeconds =
      Number(countdownDays) * 86400 +
      Number(countdownHours) * 3600 +
      Number(countdownMinutes) * 60 +
      Number(countdownSeconds);
    let countdownEnd = null;
    if (currentNote.hasCountdown && totalSeconds > 0) {
      countdownEnd = Date.now() + totalSeconds * 1000;
    }
    await cancelAllNotifications();
    if (isEditing) {
      setNotes(notes.map(n => n.id === currentNote.id ? { ...currentNote, done: n.done, countdown: totalSeconds, countdownEnd: countdownEnd || null, reminderDate: currentNote.reminderDate, hasCountdown: currentNote.hasCountdown, hasCounter: currentNote.hasCounter, hasChecklist: currentNote.hasChecklist, checklist: currentNote.checklist } : n));
    } else {
      setNotes([
        ...notes,
        { ...currentNote, id: Date.now().toString(), done: false, countdown: totalSeconds, countdownEnd, reminderDate: currentNote.reminderDate, hasCountdown: currentNote.hasCountdown, hasCounter: currentNote.hasCounter, hasChecklist: currentNote.hasChecklist, checklist: currentNote.checklist },
      ]);
    }
    // Schedule notifications for both 'Remind me when' and 'Time is up!'
    const notesToSchedule = isEditing
      ? notes.map(n => n.id === currentNote.id ? { ...currentNote, done: n.done, countdown: totalSeconds, countdownEnd: countdownEnd || null, reminderDate: currentNote.reminderDate, hasCountdown: currentNote.hasCountdown, hasCounter: currentNote.hasCounter, hasChecklist: currentNote.hasChecklist, checklist: currentNote.checklist } : n)
      : [...notes, { ...currentNote, id: Date.now().toString(), done: false, countdown: totalSeconds, countdownEnd, reminderDate: currentNote.reminderDate, hasCountdown: currentNote.hasCountdown, hasCounter: currentNote.hasCounter, hasChecklist: currentNote.hasChecklist, checklist: currentNote.checklist }];
    notesToSchedule.forEach(note => {
      // Always schedule 'Time is up!' if countdown is enabled
      if (note.hasCountdown && note.countdownEnd && note.countdownEnd > Date.now()) {
        const secondsToEnd = Math.floor((note.countdownEnd - Date.now()) / 1000);
        scheduleCountdownNotification(note, secondsToEnd, 'Time is up!');
      }
      // Schedule the 'Remind me when' notification if it is before countdownEnd
      if (note.reminder === 'specificleft' && note.hasCountdown && note.countdownEnd && note.countdownEnd > Date.now()) {
        const leftSeconds =
          Number(specificLeftDays) * 86400 +
          Number(specificLeftHours) * 3600 +
          Number(specificLeftMinutes) * 60 +
          Number(specificLeftSeconds);
        const seconds = Math.floor((note.countdownEnd - Date.now()) / 1000) - leftSeconds;
        if (seconds > 0 && leftSeconds > 0 && seconds < Math.floor((note.countdownEnd - Date.now()) / 1000)) {
          scheduleCountdownNotification(note, seconds, 'Custom time left!');
        }
      } else if (note.reminder === '1hour' && note.hasCountdown && note.countdownEnd && note.countdownEnd > Date.now()) {
        const seconds = Math.floor((note.countdownEnd - Date.now()) / 1000) - 3600;
        if (seconds > 0 && seconds < Math.floor((note.countdownEnd - Date.now()) / 1000)) scheduleCountdownNotification(note, seconds, '1 hour left!');
      } else if (note.reminder === '1day' && note.hasCountdown && note.countdownEnd && note.countdownEnd > Date.now()) {
        const seconds = Math.floor((note.countdownEnd - Date.now()) / 1000) - 86400;
        if (seconds > 0 && seconds < Math.floor((note.countdownEnd - Date.now()) / 1000)) scheduleCountdownNotification(note, seconds, '1 day left!');
      } else if (note.reminder === 'specificleft' && note.reminderDate && note.reminderDate > Date.now()) {
        const seconds = Math.floor((note.reminderDate - Date.now()) / 1000);
        if (seconds > 0) scheduleCountdownNotification(note, seconds, 'Reminder!');
      }
    });
    setModalVisible(false);
  };

  const handleDelete = async (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    await cancelAllNotifications();
    // Reschedule notifications for remaining notes
    const notesToSchedule = notes.filter(n => n.id !== id);
    notesToSchedule.forEach(note => {
      if (note.countdown && note.countdown > 0 && note.countdownEnd && note.countdownEnd > Date.now()) {
        const seconds = Math.floor((note.countdownEnd - Date.now()) / 1000);
        scheduleCountdownNotification(note, seconds, 'Time is up!');
      }
    });
  };

  const toggleDone = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newId = Date.now().toString();
    setFolders([...folders, { id: newId, name: newFolderName.trim() }]);
    setNewFolderName('');
  };

  const incrementCounter = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, counter: (n.counter || 0) + 1 } : n));
  };
  const decrementCounter = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, counter: Math.max(0, (n.counter || 0) - 1) } : n));
  };

  // Checklist handlers
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setCurrentNote({
      ...currentNote,
      checklist: [
        ...currentNote.checklist,
        { id: Date.now().toString(), text: newChecklistItem.trim(), checked: false },
      ],
    });
    setNewChecklistItem('');
  };
  const toggleChecklistItem = (itemId: string) => {
    setCurrentNote({
      ...currentNote,
      checklist: currentNote.checklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    });
  };
  const removeChecklistItem = (itemId: string) => {
    setCurrentNote({
      ...currentNote,
      checklist: currentNote.checklist.filter(item => item.id !== itemId),
    });
  };
  const updateChecklistItemText = (itemId: string, text: string) => {
    setCurrentNote({
      ...currentNote,
      checklist: currentNote.checklist.map(item =>
        item.id === itemId ? { ...item, text } : item
      ),
    });
  };

  // Add a handler to toggle checklist item on the note card
  const toggleChecklistItemOnCard = (noteId: string, itemId: string) => {
    setNotes(notes => notes.map(note =>
      note.id === noteId
        ? { ...note, checklist: note.checklist.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item) }
        : note
    ));
  };

  const renderItem = ({ item }: { item: Note }) => {
    if (item.folderId !== selectedFolder) return null;
    const typeObj = noteTypes.find(t => t.value === item.type) || noteTypes[0];
    let countdownDisplay = '';
    let countdownDone = false;
    if (item.hasCountdown && item.countdownEnd) {
      const secondsLeft = Math.max(0, Math.floor((item.countdownEnd - now) / 1000));
      countdownDisplay = `${Math.floor(secondsLeft / 60)}:${('0' + (secondsLeft % 60)).slice(-2)}`;
      countdownDone = secondsLeft === 0;
    }
    return (
      <View style={[styles.note, { backgroundColor: typeObj.color }, item.done && styles.noteDone, countdownDone && styles.countdownDone]}>
        <TouchableOpacity style={styles.checkButton} onPress={() => toggleDone(item.id)}>
          <Text style={styles.checkButtonText}>{item.done ? '✔️' : '⬜️'}</Text>
        </TouchableOpacity>
        <View style={styles.noteTextContainer}>
          <Text style={[styles.noteTypeLabel, { color: typeObj.color, backgroundColor: '#3332', borderRadius: 4, paddingHorizontal: 6, marginBottom: 4 }]}>{typeObj.label}</Text>
          <Text style={[styles.noteText, item.done && styles.noteTextDone]}>{item.text}</Text>
          {item.hasChecklist && item.checklist.length > 0 && (
            <View style={{ marginTop: 6, marginBottom: 2 }}>
              {item.checklist.map(check => (
                <TouchableOpacity
                  key={check.id}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
                  onPress={() => toggleChecklistItemOnCard(item.id, check.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{check.checked ? '☑️' : '⬜️'}</Text>
                  <Text style={{ textDecorationLine: check.checked ? 'line-through' : 'none', color: check.checked ? '#888' : '#222', fontSize: 15 }}>{check.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {item.hasCounter && (
            <View style={styles.counterRow}>
              <TouchableOpacity onPress={() => decrementCounter(item.id)} style={styles.counterButton}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
              <Text style={styles.counterValue}>{item.counter || 0}</Text>
              <TouchableOpacity onPress={() => incrementCounter(item.id)} style={styles.counterButton}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
            </View>
          )}
          {item.hasCountdown && item.countdownEnd && (
            <Text style={[styles.countdownText, countdownDone && styles.countdownTextDone]}>
              {countdownDone ? '⏰ Time is up!' : `⏳ ${countdownDisplay}`}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Text style={styles.penIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.trashIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.folderRow}>
        <FlatList
          data={folders}
          horizontal
          keyExtractor={f => f.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.folderButton, selectedFolder === item.id && styles.folderButtonSelected, isDark && styles.folderButtonDark]}
              onPress={() => setSelectedFolder(item.id)}
            >
              <Text style={[styles.folderButtonText, isDark && styles.textDark]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
        <TextInput
          style={[styles.folderInput, isDark && styles.inputDark]}
          placeholder="New folder"
          placeholderTextColor={isDark ? '#aaa' : '#888'}
          value={newFolderName}
          onChangeText={setNewFolderName}
          onSubmitEditing={handleCreateFolder}
        />
        <TouchableOpacity style={[styles.addFolderButton, isDark && styles.addFolderButtonDark]} onPress={handleCreateFolder}>
          <Text style={{ fontSize: 20, color: isDark ? '#222' : '#000' }}>＋</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={notes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        extraData={now}
      />
      <TouchableOpacity style={[styles.addButton, isDark && styles.addButtonDark]} onPress={openAddModal}>
        <Text style={[styles.addButtonText, isDark && styles.textDark]}>+ Add Note</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textDark]}>Which type would you like to create?</Text>
            <View style={styles.typeSelector}>
              {noteTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeButton, currentNote.type === type.value && { borderColor: '#333', borderWidth: 2 }, isDark && styles.typeButtonDark]}
                  onPress={() => setCurrentNote({ ...currentNote, type: type.value })}
                >
                  <View style={[styles.typeColor, { backgroundColor: type.color }]} />
                  <Text style={isDark && styles.textDark}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[{ marginBottom: 4, fontWeight: 'bold' }, isDark && styles.textDark]}>Folder:</Text>
            <View style={styles.typeSelector}>
              {folders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.typeButton, currentNote.folderId === folder.id && { borderColor: '#333', borderWidth: 2 }, isDark && styles.typeButtonDark]}
                  onPress={() => setCurrentNote({ ...currentNote, folderId: folder.id })}
                >
                  <Text style={isDark && styles.textDark}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              placeholder="Type your note..."
              placeholderTextColor={isDark ? '#aaa' : '#888'}
              value={currentNote.text}
              onChangeText={text => setCurrentNote({ ...currentNote, text })}
              multiline
            />
            {/* Counter toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Add a counter to this note?</Text>
              <Switch
                value={currentNote.hasCounter}
                onValueChange={val => setCurrentNote({ ...currentNote, hasCounter: val })}
              />
            </View>
            {/* Counter input (optional, can be edited after creation) */}
            {currentNote.hasCounter && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Counter:</Text>
                <TouchableOpacity onPress={() => setCurrentNote({ ...currentNote, counter: Math.max(0, (currentNote.counter || 0) - 1) })} style={styles.counterButton}><Text style={styles.counterButtonText}>-</Text></TouchableOpacity>
                <Text style={styles.counterValue}>{currentNote.counter || 0}</Text>
                <TouchableOpacity onPress={() => setCurrentNote({ ...currentNote, counter: (currentNote.counter || 0) + 1 })} style={styles.counterButton}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
              </View>
            )}
            {/* Countdown toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Add a countdown to this note?</Text>
              <Switch
                value={currentNote.hasCountdown}
                onValueChange={val => setCurrentNote({ ...currentNote, hasCountdown: val })}
              />
            </View>
            {/* Countdown timer input (days/hours/minutes/seconds) */}
            {currentNote.hasCountdown && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Countdown:</Text>
                  <TextInput
                    style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                    keyboardType="numeric"
                    value={countdownDays}
                    onChangeText={setCountdownDays}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                  />
                  <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>d</Text>
                  <TextInput
                    style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                    keyboardType="numeric"
                    value={countdownHours}
                    onChangeText={setCountdownHours}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                  />
                  <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>h</Text>
                  <TextInput
                    style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                    keyboardType="numeric"
                    value={countdownMinutes}
                    onChangeText={setCountdownMinutes}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                  />
                  <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>m</Text>
                  <TextInput
                    style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                    keyboardType="numeric"
                    value={countdownSeconds}
                    onChangeText={setCountdownSeconds}
                    placeholder="0"
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                  />
                  <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>s</Text>
                </View>
                {/* Reminder selector as dropdown, with 'Specific time left' option */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Remind me when:</Text>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: isDark ? '#222' : '#fff' }}>
                    <Picker
                      selectedValue={currentNote.reminder}
                      onValueChange={(itemValue) => setCurrentNote({ ...currentNote, reminder: itemValue as ReminderOption })}
                      style={{ height: 40, color: isDark ? '#fff' : '#000' }}
                      dropdownIconColor={isDark ? '#fff' : '#333'}
                    >
                      <Picker.Item label="Time is up" value="timeup" />
                      <Picker.Item label="1 hour left" value="1hour" />
                      <Picker.Item label="1 day left" value="1day" />
                      <Picker.Item label="Specific time left" value="specificleft" />
                    </Picker>
                  </View>
                </View>
              </>
            )}
            {/* If 'specificleft' is selected, show time left input */}
            {currentNote.reminder === 'specificleft' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                  keyboardType="numeric"
                  value={specificLeftDays}
                  onChangeText={setSpecificLeftDays}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#aaa' : '#888'}
                />
                <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>d</Text>
                <TextInput
                  style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                  keyboardType="numeric"
                  value={specificLeftHours}
                  onChangeText={setSpecificLeftHours}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#aaa' : '#888'}
                />
                <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>h</Text>
                <TextInput
                  style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                  keyboardType="numeric"
                  value={specificLeftMinutes}
                  onChangeText={setSpecificLeftMinutes}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#aaa' : '#888'}
                />
                <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>m</Text>
                <TextInput
                  style={[styles.input, { flex: 0.7, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                  keyboardType="numeric"
                  value={specificLeftSeconds}
                  onChangeText={setSpecificLeftSeconds}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#aaa' : '#888'}
                />
                <Text style={[{ marginHorizontal: 2 }, isDark && styles.textDark]}>s</Text>
              </View>
            )}
            {/* Checklist toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[{ marginRight: 8 }, isDark && styles.textDark]}>Add a checklist to this note?</Text>
              <Switch
                value={currentNote.hasChecklist}
                onValueChange={val => setCurrentNote({ ...currentNote, hasChecklist: val })}
              />
            </View>
            {currentNote.hasChecklist && (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, minHeight: 0, marginBottom: 0 }, isDark && styles.inputDark]}
                    placeholder="Add checklist item"
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                    value={newChecklistItem}
                    onChangeText={setNewChecklistItem}
                  />
                  <TouchableOpacity onPress={addChecklistItem} style={{ marginLeft: 8, backgroundColor: '#ffd600', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: isDark ? '#222' : '#000' }}>＋</Text>
                  </TouchableOpacity>
                </View>
                {currentNote.checklist.map(item => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <TouchableOpacity onPress={() => toggleChecklistItem(item.id)} style={{ marginRight: 8 }}>
                      <Text style={{ fontSize: 20 }}>{item.checked ? '☑️' : '⬜️'}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { flex: 1, minHeight: 0, marginBottom: 0, textDecorationLine: item.checked ? 'line-through' : 'none', color: item.checked ? '#888' : (isDark ? '#fff' : '#222') }, isDark && styles.inputDark]}
                      value={item.text}
                      onChangeText={text => updateChecklistItemText(item.id, text)}
                    />
                    <TouchableOpacity onPress={() => removeChecklistItem(item.id)} style={{ marginLeft: 8 }}>
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title={isEditing ? 'Save' : 'Add'} onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7b6',
    padding: 16,
  },
  containerDark: {
    backgroundColor: '#181a20',
  },
  list: {
    paddingBottom: 80,
  },
  note: {
    backgroundColor: '#fff59d',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  noteDone: {
    backgroundColor: '#e0e0e0',
  },
  checkButton: {
    marginRight: 12,
    padding: 4,
  },
  checkButtonText: {
    fontSize: 22,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteText: {
    fontSize: 16,
  },
  noteTextDone: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  trashIcon: {
    fontSize: 22,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ffd600',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  addButtonDark: {
    backgroundColor: '#333',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  textDark: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fffde7',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    elevation: 5,
  },
  modalContentDark: {
    backgroundColor: '#23242a',
  },
  input: {
    minHeight: 60,
    fontSize: 16,
    backgroundColor: '#fffde7',
    borderColor: '#ffd600',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inputDark: {
    backgroundColor: '#222',
    color: '#fff',
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteTypeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeButton: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 6,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
    minWidth: 60,
  },
  typeButtonDark: {
    backgroundColor: '#23242a',
    borderColor: '#444',
  },
  typeColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#aaa',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 6,
  },
  folderButtonSelected: {
    backgroundColor: '#ffd600',
  },
  folderButtonDark: {
    backgroundColor: '#222',
  },
  folderButtonText: {
    fontWeight: 'bold',
  },
  folderInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    marginRight: 4,
    backgroundColor: '#fff',
  },
  addFolderButton: {
    backgroundColor: '#ffd600',
    borderRadius: 16,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFolderButtonDark: {
    backgroundColor: '#333',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  counterButton: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterValue: {
    fontSize: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  countdownText: {
    marginTop: 4,
    fontSize: 14,
    color: '#333',
  },
  countdownTextDone: {
    color: '#ff5252',
    fontWeight: 'bold',
  },
  countdownDone: {
    borderWidth: 2,
    borderColor: '#ff5252',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  penIcon: {
    fontSize: 22,
  },
});
