import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      Alert.alert('Signup failed', error.message);
      setLoading(false);
      return;
    }

    Alert.alert('Success', 'Account created. Check your email to confirm your account.');
    setFullName('');
    setEmail('');
    setPassword('');
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0407', padding: 20, justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginBottom: 10 }}>
        Create Account
      </Text>

      <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 25 }}>
        Start building immersive tours.
      </Text>

      <TextInput
        placeholder="Full name"
        placeholderTextColor="#888"
        value={fullName}
        onChangeText={setFullName}
        style={{
          backgroundColor: '#1A0509',
          color: '#FFFFFF',
          padding: 15,
          borderRadius: 12,
          marginBottom: 12,
        }}
      />

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
        onPress={handleSignup}
        disabled={loading}
        style={{
          backgroundColor: '#C9A84C',
          padding: 15,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: '#0D0407', fontWeight: '800' }}>
          {loading ? 'Creating...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF' }}>Already have an account? </Text>
        <Link href="/login" style={{ color: '#C9A84C' }}>
          Sign in
        </Link>
      </View>
    </View>
  );
}