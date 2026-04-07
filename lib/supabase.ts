import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://lrscbsjslyoauyuwmvrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc2Nic2pzbHlvYXV5dXdtdnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTc4MDksImV4cCI6MjA5MDM3MzgwOX0.JjRcMtIbwQQzbrlr4dnMOV3qkMNLmmUm4S9ZUHmongA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});