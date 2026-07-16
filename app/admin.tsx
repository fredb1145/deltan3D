import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDesktopFrame from '../components/AdminDesktopFrame';
import { canAccessModule, type AdminAccess } from '../lib/adminAccess';
import { getAdminSession } from '../lib/admin/getAdminSession';
import { getAdminStats } from '../lib/admin/getAdminStats';

type DashboardStats = {
  totalUsers: number;
  totalAdmins: number;
  totalTours: number;
};

function getRoleLabel(access: AdminAccess | null) {
  if (!access?.isAdmin) {
    return 'Member';
  }

  switch (access.role) {
    case 'super_admin':
      return 'Super Admin';
    case 'user_admin':
      return 'User Admin';
    case 'subscription_admin':
      return 'Subscription Admin';
    case 'analytics_admin':
      return 'Analytics Admin';
    default:
      return 'Custom Admin';
  }
}

export default function AdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web';
  const wideDesktop = isDesktopWeb && width >= 1180;

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalTours: 0,
  });
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadDashboard();
  }, []);

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const session = await getAdminSession();
      setAccess(session.access);

      const nextStats = await getAdminStats();
      setStats(nextStats);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load the admin dashboard.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const moduleCards = useMemo(
    () =>
      [
        {
          key: 'users',
          title: 'Members',
          description: 'Search people, review access, and manage admin roles.',
          cta: 'Open Members',
          route: '/admin-users',
          enabled: access ? canAccessModule(access, 'users') : false,
        },
        {
          key: 'tours',
          title: 'Tours',
          description: 'Review tours across the platform and remove the ones that need cleanup.',
          cta: 'Open Tours',
          route: '/admin-tours',
          enabled: access ? canAccessModule(access, 'tours') : false,
        },
        {
          key: 'plans',
          title: 'Plans',
          description: 'Create plans, adjust pricing, and control which offers stay visible.',
          cta: 'Open Plans',
          route: '/admin-plans',
          enabled: access ? canAccessModule(access, 'plans') : false,
        },
      ].filter(card => card.enabled),
    [access],
  );

  const refreshButton = (
    <Pressable onPress={() => loadDashboard(true)} style={styles.headerActionButton}>
      <Text style={styles.headerActionButtonText}>Refresh Dashboard</Text>
    </Pressable>
  );

  const dashboardContent = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        isDesktopWeb ? styles.desktopContent : null,
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboard(true)}
          tintColor="#FFFFFF"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {!isDesktopWeb ? (
        <>
          <Text style={styles.heading}>Admin Dashboard</Text>
          <Text style={styles.subheading}>
            Run the platform from here. What you see is based on your admin access.
          </Text>
        </>
      ) : null}

      <View style={[styles.heroCard, wideDesktop ? styles.heroCardWide : null]}>
        <View style={styles.heroMain}>
          <Text style={styles.heroLabel}>Access</Text>
          <Text style={styles.heroTitle}>{getRoleLabel(access)}</Text>
          <Text style={styles.heroText}>
            Members, tours, plans, and role controls stay in one frontend workspace so day-to-day
            management does not depend on a hidden dashboard.
          </Text>
        </View>

        <View style={[styles.heroStats, wideDesktop ? styles.heroStatsWide : null]}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Members</Text>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Admins</Text>
            <Text style={styles.statValue}>{stats.totalAdmins}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tours</Text>
            <Text style={styles.statValue}>{stats.totalTours}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Modules</Text>
          <Text style={styles.sectionText}>
            Open the areas this admin account can operate from the browser.
          </Text>
        </View>
      </View>

      <View style={[styles.moduleGrid, wideDesktop ? styles.moduleGridWide : null]}>
        {moduleCards.map(card => (
          <View key={card.key} style={[styles.moduleCard, wideDesktop ? styles.moduleCardWide : null]}>
            <Text style={styles.moduleTitle}>{card.title}</Text>
            <Text style={styles.moduleText}>{card.description}</Text>

            <Pressable onPress={() => router.push(card.route as any)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{card.cta}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  if (loading) {
    if (isDesktopWeb) {
      return (
        <AdminDesktopFrame
          access={access}
          activeRoute="/admin"
          eyebrow="Admin"
          title="Control Center"
          description="Run the platform from a cleaner browser workspace."
        >
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#C9A84C" />
            <Text style={styles.loadingText}>Loading admin dashboard...</Text>
          </View>
        </AdminDesktopFrame>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    if (isDesktopWeb) {
      return (
        <AdminDesktopFrame
          access={access}
          activeRoute="/admin"
          eyebrow="Admin"
          title="Control Center"
          description="Run the platform from a cleaner browser workspace."
        >
          <View style={styles.centerWrap}>
            <View style={styles.messageCard}>
              <Text style={styles.messageTitle}>Admin access unavailable</Text>
              <Text style={styles.messageText}>{errorMessage}</Text>

              <Pressable
                onPress={() => router.replace('/profile')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Go Back</Text>
              </Pressable>
            </View>
          </View>
        </AdminDesktopFrame>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Admin access unavailable</Text>
            <Text style={styles.messageText}>{errorMessage}</Text>

            <Pressable onPress={() => router.replace('/profile')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isDesktopWeb) {
    return (
      <AdminDesktopFrame
        access={access}
        activeRoute="/admin"
        eyebrow="Admin"
        title="Control Center"
        description="Run the platform from here. What you see is based on your admin access."
        headerAction={refreshButton}
      >
        {dashboardContent}
      </AdminDesktopFrame>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{dashboardContent}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  desktopContent: {
    paddingHorizontal: 28,
    paddingVertical: 28,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheading: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
  },
  heroCardWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 18,
  },
  heroMain: {
    flex: 1,
  },
  heroLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
  },
  heroStats: {
    marginTop: 18,
    gap: 12,
  },
  heroStatsWide: {
    width: 360,
    marginTop: 0,
  },
  statCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
    borderRadius: 18,
    padding: 16,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  sectionRow: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 18,
  },
  moduleGrid: {
    gap: 14,
  },
  moduleGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 18,
  },
  moduleCardWide: {
    width: '48.8%',
  },
  moduleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  moduleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  messageCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 18,
  },
  messageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  messageText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0D0407',
    fontSize: 15,
    fontWeight: '800',
  },
  headerActionButton: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerActionButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
  },
});
