import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://lrscbsjslyoauyuwmvrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2Nic2pzbHlvYXV5dXdtdnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTc4MDksImV4cCI6MjA5MDM3MzgwOX0.JjRcMtIbwQQzbrlr4dnMOV3qkMNLmmUm4S9ZUHmongA';

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const emptyStorage: AuthStorage = {
  async getItem() {
    return null;
  },
  async setItem() {},
  async removeItem() {},
};

const browserStorage: AuthStorage = {
  async getItem(key) {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  },
};

const authStorage: AuthStorage =
  Platform.OS === 'web'
    ? typeof window === 'undefined'
      ? emptyStorage
      : browserStorage
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
