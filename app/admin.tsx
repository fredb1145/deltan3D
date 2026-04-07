import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function AdminScreen() {
  const router = useRouter();

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalTours, setTotalTours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    try {
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
          </>
        )}

        <TouchableOpacity
          onPress={() => router.push('/admin-users')}
          style={button}
        >
          <Text style={buttonText}>Manage Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/admin-tours')}
          style={button}
        >
          <Text style={buttonText}>Manage Tours</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={loadStats} style={refreshButton}>
          <Text style={refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
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