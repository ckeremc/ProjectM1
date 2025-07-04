import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../ThemeContext';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { theme, setTheme } = useThemeContext();
  const isDark = theme === 'dark';
  const router = useRouter();

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.title, isDark && styles.textDark]}>Settings</Text>
      <View style={styles.row}>
        <Text style={[styles.label, isDark && styles.textDark]}>Dark Mode</Text>
        <Switch value={isDark} onValueChange={val => setTheme(val ? 'dark' : 'light')} />
      </View>
      <Text style={[styles.info, isDark && styles.textDark]}>
        (This toggle now changes the theme globally.)
      </Text>
      <TouchableOpacity
        style={{ marginTop: 24, backgroundColor: '#ffd600', borderRadius: 8, padding: 12, alignItems: 'center' }}
        onPress={() => router.push('/deleted-notes')}
      >
        <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 16 }}>Deleted Notes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fffde7',
  },
  containerDark: {
    backgroundColor: '#181a20',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#222',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    color: '#222',
  },
  info: {
    marginTop: 24,
    color: '#888',
    fontSize: 14,
  },
  textDark: {
    color: '#fff',
  },
}); 