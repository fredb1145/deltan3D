import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canAccessModule, type AdminAccess } from '../lib/adminAccess';

type AdminPageFrameProps = {
  title: string;
  description: string;
  access?: AdminAccess | null;
  children: React.ReactNode;
};

type NavItem = {
  href: '/admin' | '/admin-users' | '/admin-tours' | '/admin-plans';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  matches: string[];
  visible: (access?: AdminAccess | null) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: 'speedometer-outline',
    activeIcon: 'speedometer',
    matches: ['/admin'],
    visible: access => !!access?.isAdmin,
  },
  {
    href: '/admin-users',
    label: 'Members',
    icon: 'people-outline',
    activeIcon: 'people',
    matches: ['/admin-users'],
    visible: access => !!access && canAccessModule(access, 'users'),
  },
  {
    href: '/admin-tours',
    label: 'Tours',
    icon: 'layers-outline',
    activeIcon: 'layers',
    matches: ['/admin-tours'],
    visible: access => !!access && canAccessModule(access, 'tours'),
  },
  {
    href: '/admin-plans',
    label: 'Plans',
    icon: 'pricetags-outline',
    activeIcon: 'pricetags',
    matches: ['/admin-plans'],
    visible: access => !!access && canAccessModule(access, 'plans'),
  },
];

function isActivePath(pathname: string, matches: string[]) {
  return matches.some(match => pathname === match || pathname.startsWith(`${match}/`));
}

export default function AdminPageFrame({
  title,
  description,
  access,
  children,
}: AdminPageFrameProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1180;

  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.mobileContent}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  const visibleItems = NAV_ITEMS.filter(item => item.visible(access));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.desktopRoot}>
        <View style={styles.sidebar}>
          <View style={styles.brandCard}>
            <Text style={styles.brandLabel}>Admin</Text>
            <Text style={styles.brandTitle}>Control Center</Text>
            <Text style={styles.brandText}>
              Manage members, plans, tours, and day-to-day platform work from one browser workspace.
            </Text>
          </View>

          <Pressable onPress={() => router.push('/profile')} style={styles.workspaceButton}>
            <Ionicons name="arrow-back" size={18} color="#C9A84C" />
            <Text style={styles.workspaceButtonText}>Back to Workspace</Text>
          </Pressable>

          <View style={styles.navSection}>
            <Text style={styles.navLabel}>Modules</Text>

            {visibleItems.map(item => {
              const active = isActivePath(pathname, item.matches);

              return (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href)}
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

          <View style={styles.sidebarFoot}>
            <Text style={styles.sidebarFootTitle}>Desktop Admin</Text>
            <Text style={styles.sidebarFootText}>
              This web layout spreads dense admin tools out so platform work feels clearer and faster.
            </Text>
          </View>
        </View>

        <View style={styles.main}>
          <View style={styles.glowOne} />
          <View style={styles.glowTwo} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Admin Area</Text>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerText}>{description}</Text>
            </View>

            <Pressable onPress={() => router.push('/admin')} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Dashboard</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.desktopContent}>{children}</ScrollView>
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
  mobileContent: {
    paddingBottom: 120,
  },
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#070205',
  },
  sidebar: {
    width: 300,
    backgroundColor: '#120408',
    borderRightWidth: 1,
    borderRightColor: 'rgba(201,168,76,0.14)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
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
    marginBottom: 8,
    letterSpacing: 1,
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
    gap: 10,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  workspaceButtonText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
  },
  navSection: {
    marginBottom: 20,
  },
  navLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 1,
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
  sidebarFoot: {
    marginTop: 'auto',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.12)',
    borderRadius: 20,
    padding: 16,
  },
  sidebarFootTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  sidebarFootText: {
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
  glowOne: {
    position: 'absolute',
    top: -160,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(201,168,76,0.06)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: -180,
    left: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(201,168,76,0.04)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 700,
  },
  headerButton: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
  },
  desktopContent: {
    paddingBottom: 40,
  },
});
