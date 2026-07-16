import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminAccess, resolveAdminAccess } from '../../lib/adminAccess';
import { ensureProfile } from '../../lib/getProfile';
import { signOutUser } from '../../lib/signOutUser';
import { supabase } from '../../lib/supabase';

function getFallbackName(email: string) {
  if (email.includes('@')) {
    return email.split('@')[0];
  }

  return 'User';
}

function getAdminRoleLabel(access: AdminAccess | null) {
  if (!access?.isAdmin) {
    return 'Member';
  }

  if (access.role === 'super_admin') {
    return 'Super Admin';
  }

  if (access.role === 'user_admin') {
    return 'User Admin';
  }

  if (access.role === 'subscription_admin') {
    return 'Subscription Admin';
  }

  if (access.role === 'analytics_admin') {
    return 'Analytics Admin';
  }

  return 'Custom Admin';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1080;

  const [fullName, setFullName] = useState('User');
  const [email, setEmail] = useState('');
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user = data.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const nextEmail = user.email || '';
      setEmail(nextEmail);
      setFullName(getFallbackName(nextEmail));

      const profile = await ensureProfile(user);

      setFullName(profile.full_name?.trim() || getFallbackName(nextEmail));
      setAdminAccess(resolveAdminAccess(profile));
    } catch (error: any) {
      Alert.alert(
        'Account unavailable',
        error?.message || 'We could not open your account right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const result = await signOutUser();

      if (result.error) {
        Alert.alert('Could not log out', result.error.message);
        return;
      }

      if (result.mode === 'local_fallback') {
        Alert.alert(
          'Logged out',
          'You have been logged out on this device. If the connection is weak, your other devices may catch up a little later.',
        );
      }

      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, isDesktop ? styles.contentDesktop : null]}>
        <Text style={styles.heading}>Profile</Text>
        <Text style={[styles.subheading, isDesktop ? styles.subheadingDesktop : null]}>
          Keep your account details nearby, jump into admin tools when available, and manage your session cleanly.
        </Text>

        <View style={[styles.grid, isDesktop ? styles.gridDesktop : null]}>
          <View style={[styles.accountCard, isDesktop ? styles.accountCardDesktop : null]}>
            <Text style={styles.cardLabel}>Account</Text>

            <Text style={styles.nameText}>{loading ? 'Loading...' : fullName}</Text>
            <Text style={styles.emailText}>{loading ? 'Please wait...' : email}</Text>

            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{getAdminRoleLabel(adminAccess)}</Text>
            </View>

            <Text style={styles.accountText}>
              {adminAccess?.isAdmin
                ? 'This account can open the admin workspace from the frontend.'
                : 'This account has member access to tours and profile tools.'}
            </Text>
          </View>

          <View style={[styles.sideColumn, isDesktop ? styles.sideColumnDesktop : null]}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Plans and Limits</Text>
              <Text style={styles.cardText}>
                Review plan options, compare limits, and switch this account to a different plan.
              </Text>

              <Pressable onPress={() => router.push('/pricing')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open Pricing</Text>
              </Pressable>
            </View>

            {adminAccess?.isAdmin ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Admin Workspace</Text>
                <Text style={styles.cardText}>
                  Open the full admin dashboard for members, tours, plans, and platform controls.
                </Text>

                <Pressable onPress={() => router.push('/admin')} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Open Admin Dashboard</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Session</Text>
              <Text style={styles.cardText}>
                Sign out cleanly from this device whenever you want to switch accounts.
              </Text>

              <Pressable
                onPress={handleLogout}
                disabled={loggingOut}
                style={[styles.primaryButton, loggingOut ? styles.buttonDisabled : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {loggingOut ? 'Logging Out...' : 'Log Out'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  contentDesktop: {
    padding: 28,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  subheadingDesktop: {
    maxWidth: 720,
    marginBottom: 28,
  },
  grid: {
    gap: 16,
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accountCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 22,
  },
  accountCardDesktop: {
    flex: 1.2,
    minHeight: 320,
  },
  sideColumn: {
    gap: 16,
  },
  sideColumnDesktop: {
    flex: 0.9,
  },
  card: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 20,
    padding: 20,
  },
  cardLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 1,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  emailText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    marginBottom: 14,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#C9A84C',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  rolePillText: {
    color: '#0D0407',
    fontSize: 12,
    fontWeight: '800',
  },
  accountText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0D0407',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
