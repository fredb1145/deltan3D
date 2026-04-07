import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('User');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data.user;
      if (!user) return;

      setEmail(user.email || '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.log('PROFILE ERROR:', profileError.message);
        Alert.alert('Profile Error', profileError.message);
        return;
      }

      if (profile) {
        setFullName(profile.full_name || 'User');
        setIsAdmin(profile.is_admin === true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }

    router.replace('/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0407' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: '800',
            marginBottom: 20,
          }}
        >
          Profile
        </Text>

        <View
          style={{
            backgroundColor: '#1A0509',
            borderWidth: 1,
            borderColor: 'rgba(201,168,76,0.18)',
            borderRadius: 18,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: '#C9A84C',
              fontSize: 14,
              fontWeight: '700',
              marginBottom: 8,
            }}
          >
            Account
          </Text>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: '800',
              marginBottom: 4,
            }}
          >
            {loading ? 'Loading...' : fullName}
          </Text>

          <Text
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {loading ? 'Please wait...' : email}
          </Text>

          {isAdmin && (
            <>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#C9A84C',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: '#0D0407',
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  ADMIN
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/admin')}
                style={{
                  backgroundColor: '#C9A84C',
                  padding: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    color: '#0D0407',
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  Open Admin Dashboard
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: '#C9A84C',
            padding: 16,
            borderRadius: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#0D0407',
              fontSize: 16,
              fontWeight: '800',
            }}
          >
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}