import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }

    router.replace('/(protected)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0407', padding: 20, justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginBottom: 10 }}>
        Welcome Back
      </Text>

      <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 25 }}>
        Sign in to continue.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: '#1A0509',
          color: '#FFFFFF',
          padding: 15,
          borderRadius: 12,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          backgroundColor: '#1A0509',
          color: '#FFFFFF',
          padding: 15,
          borderRadius: 12,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#C9A84C',
          padding: 15,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 20,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: '#0D0407', fontWeight: '800' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#FFFFFF' }}>Forgot password? </Text>
        <Link href="/forgot-password" style={{ color: '#C9A84C' }}>
          Reset
        </Link>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF' }}>Don’t have an account? </Text>
        <Link href="/signup" style={{ color: '#C9A84C' }}>
          Sign up
        </Link>
      </View>
    </View>
  );
}