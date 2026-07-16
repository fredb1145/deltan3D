import { Slot, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavItem = {
  href: '/' | '/explore' | '/profile';
  label: string;
  matches: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    matches: ['/'],
  },
  {
    href: '/explore',
    label: 'Explore',
    matches: ['/explore'],
  },
  {
    href: '/profile',
    label: 'Profile',
    matches: ['/profile'],
  },
];

function isActivePath(pathname: string, matches: string[]) {
  return matches.some(match => pathname === match || pathname.startsWith(`${match}/`));
}

export default function WebDesktopShell() {
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.navOuter}>
          <View style={styles.navInner}>
            <Pressable onPress={() => router.push('/')} style={styles.brandWrap}>
              <Text style={styles.brand}>Deltan3D</Text>
              <Text style={styles.brandSub}>Workspace</Text>
            </Pressable>

            <View style={styles.navLinks}>
              {NAV_ITEMS.map(item => {
                const active = isActivePath(pathname, item.matches);

                return (
                  <Pressable
                    key={item.href}
                    onPress={() => router.push(item.href)}
                    style={[styles.navButton, active ? styles.navButtonActive : null]}
                  >
                    <Text style={[styles.navButtonText, active ? styles.navButtonTextActive : null]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={() => router.push('/pricing')} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Plans</Text>
              </Pressable>

              <Pressable onPress={() => router.push('/create-tour')} style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>New Tour</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.contentOuter}>
          <View style={styles.contentInner}>
            <Slot />
          </View>
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
  page: {
    flex: 1,
    backgroundColor: '#070205',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -220,
    right: -120,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(201,168,76,0.07)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -260,
    left: -120,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(201,168,76,0.05)',
  },
  navOuter: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 14,
  },
  navInner: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  brandWrap: {
    gap: 4,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  brandSub: {
    color: 'rgba(255,255,255,0.54)',
    fontSize: 12,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(26,5,9,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navButtonActive: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  navButtonTextActive: {
    color: '#0D0407',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryAction: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    backgroundColor: 'rgba(18,4,8,0.74)',
  },
  secondaryActionText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryAction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#C9A84C',
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  primaryActionText: {
    color: '#0D0407',
    fontSize: 13,
    fontWeight: '900',
  },
  contentOuter: {
    flex: 1,
    paddingBottom: 18,
  },
  contentInner: {
    flex: 1,
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
});
