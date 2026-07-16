import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canAccessModule, type AdminAccess, type AdminModule } from '../lib/adminAccess';

type AdminRoute = '/admin' | '/admin-users' | '/admin-tours' | '/admin-plans';

type AdminDesktopFrameProps = {
  access: AdminAccess | null;
  activeRoute: AdminRoute;
  title: string;
  description: string;
  eyebrow?: string;
  headerAction?: ReactNode;
  children: ReactNode;
};

type AdminNavItem = {
  route: AdminRoute;
  label: string;
  module: AdminModule;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: AdminNavItem[] = [
  {
    route: '/admin',
    label: 'Overview',
    module: 'overview',
    icon: 'speedometer-outline',
    activeIcon: 'speedometer',
  },
  {
    route: '/admin-users',
    label: 'Members',
    module: 'users',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  {
    route: '/admin-tours',
    label: 'Tours',
    module: 'tours',
    icon: 'map-outline',
    activeIcon: 'map',
  },
  {
    route: '/admin-plans',
    label: 'Plans',
    module: 'plans',
    icon: 'pricetags-outline',
    activeIcon: 'pricetags',
  },
];

function roleLabel(access: AdminAccess | null) {
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

export default function AdminDesktopFrame({
  access,
  activeRoute,
  title,
  description,
  eyebrow = 'Admin',
  headerAction,
  children,
}: AdminDesktopFrameProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!access) {
      return item.route === '/admin';
    }

    return canAccessModule(access, item.module);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
          <View style={styles.brandCard}>
            <Text style={styles.brandLabel}>Deltan3D</Text>
            <Text style={styles.brandTitle}>Admin Control Center</Text>
            <Text style={styles.brandText}>
              Run members, tours, and plans from one clean browser workspace.
            </Text>
          </View>

          <Pressable onPress={() => router.push('/explore')} style={styles.workspaceButton}>
            <Ionicons name="arrow-back-circle-outline" size={18} color="#C9A84C" />
            <Text style={styles.workspaceButtonText}>Back to Workspace</Text>
          </Pressable>

          <View style={styles.navSection}>
            <Text style={styles.navLabel}>Modules</Text>

            {visibleItems.map(item => {
              const active = item.route === activeRoute;

              return (
                <Pressable
                  key={item.route}
                  onPress={() => router.push(item.route)}
                  style={[styles.navItem, active ? styles.navItemActive : null]}
                >
                  <Ionicons
                    name={active ? item.activeIcon : item.icon}
                    size={20}
                    color={active ? '#0D0407' : '#C9A84C'}
                  />
                  <Text style={[styles.navText, active ? styles.navTextActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleLabel}>Access</Text>
            <Text style={styles.roleTitle}>{roleLabel(access)}</Text>
            <Text style={styles.roleText}>
              This browser layout mirrors your permissions, so modules stay hidden unless this
              account can actually use them.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.main}>
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>{eyebrow}</Text>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerDescription}>{description}</Text>
            </View>

            {headerAction ? <View style={styles.headerActionWrap}>{headerAction}</View> : null}
          </View>

          <View style={styles.contentFrame}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070205',
  },
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#070205',
  },
  sidebar: {
    width: 300,
    backgroundColor: '#120408',
    borderRightWidth: 1,
    borderRightColor: 'rgba(201,168,76,0.16)',
  },
  sidebarContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    minHeight: '100%',
  },
  brandCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  brandLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  brandText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 19,
  },
  workspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  workspaceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  navSection: {
    marginBottom: 18,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10,
  },
  navItemActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  navTextActive: {
    color: '#0D0407',
  },
  roleCard: {
    marginTop: 'auto',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
    borderRadius: 22,
    padding: 16,
  },
  roleLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  roleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  roleText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    lineHeight: 18,
  },
  main: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -170,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(201,168,76,0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -200,
    left: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(201,168,76,0.04)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 20,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerEyebrow: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerDescription: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 720,
  },
  headerActionWrap: {
    alignItems: 'flex-end',
  },
  contentFrame: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    backgroundColor: 'rgba(13,4,7,0.78)',
    overflow: 'hidden',
  },
});
