import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminAccess, canAccessModule, resolveAdminAccess } from '../lib/adminAccess';
import { supabase } from '../lib/supabase';

export default function AdminScreen() {
  const router = useRouter();

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalTours, setTotalTours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setAccessMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        setAccess(resolveAdminAccess(null));
        setAccessMessage('Please sign in again.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        setAccess(resolveAdminAccess(null));
        setAccessMessage('We could not load your admin access.');
        return;
      }

      const accessState = resolveAdminAccess(profile);
      setAccess(accessState);

      if (!accessState.isAdmin) {
        setAccessMessage('You do not have access to the admin tools.');
        return;
      }

      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      const { count: adminsCount, error: adminsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true);

      if (adminsError) throw adminsError;

      const { count: toursCount, error: toursError } = await supabase
        .from('tours')
        .select('*', { count: 'exact', head: true });

      if (toursError) throw toursError;

      setTotalUsers(usersCount || 0);
      setTotalAdmins(adminsCount || 0);
      setTotalTours(toursCount || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={scrollContent}>
        <Text style={title}>Admin Dashboard</Text>

        {loading ? (
          <Text style={loadingText}>Loading...</Text>
        ) : access && !access.isAdmin ? (
          <View style={messageCard}>
            <Text style={messageText}>
              {accessMessage || 'You do not have access to the admin tools.'}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(protected)')}
              style={button}
            >
              <Text style={buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={card}>
              <Text style={label}>Total Users</Text>
              <Text style={value}>{totalUsers}</Text>
            </View>

            <View style={card}>
              <Text style={label}>Total Admins</Text>
              <Text style={value}>{totalAdmins}</Text>
            </View>

            <View style={card}>
              <Text style={label}>Total Tours</Text>
              <Text style={value}>{totalTours}</Text>
            </View>

            {access && canAccessModule(access, 'users') ? (
              <TouchableOpacity
                onPress={() => router.push('/admin-users')}
                style={button}
              >
                <Text style={buttonText}>Manage Users</Text>
              </TouchableOpacity>
            ) : null}

            {access && canAccessModule(access, 'tours') ? (
              <TouchableOpacity
                onPress={() => router.push('/admin-tours')}
                style={button}
              >
                <Text style={buttonText}>Manage Tours</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={loadStats} style={refreshButton}>
              <Text style={refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const container = {
  flex: 1,
  backgroundColor: '#0D0407',
} as const;

const scrollContent = {
  padding: 20,
  paddingBottom: 120,
} as const;

const title = {
  color: '#FFFFFF',
  fontSize: 28,
  fontWeight: '800',
  marginBottom: 20,
} as const;

const loadingText = {
  color: '#FFFFFF',
} as const;

const card = {
  backgroundColor: '#1A0509',
  borderWidth: 1,
  borderColor: 'rgba(201,168,76,0.18)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 15,
} as const;

const label = {
  color: '#C9A84C',
  fontSize: 14,
  marginBottom: 5,
  fontWeight: '700',
} as const;

const value = {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: '800',
} as const;

const button = {
  backgroundColor: '#C9A84C',
  padding: 16,
  borderRadius: 14,
  alignItems: 'center',
  marginTop: 10,
} as const;

const refreshButton = {
  backgroundColor: '#2A0A10',
  borderWidth: 1,
  borderColor: 'rgba(201,168,76,0.18)',
  padding: 16,
  borderRadius: 14,
  alignItems: 'center',
  marginTop: 10,
} as const;

const buttonText = {
  color: '#0D0407',
  fontSize: 16,
  fontWeight: '800',
} as const;

const refreshButtonText = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '800',
} as const;

const messageCard = {
  backgroundColor: '#1A0509',
  borderWidth: 1,
  borderColor: 'rgba(201,168,76,0.18)',
  borderRadius: 16,
  padding: 18,
  marginTop: 10,
} as const;

const messageText = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 16,
  lineHeight: 22,
} as const;
