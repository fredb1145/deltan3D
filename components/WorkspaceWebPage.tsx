import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type WorkspaceRoute = '/' | '/explore' | '/profile';

type WorkspaceWebPageProps = {
  activeRoute?: WorkspaceRoute;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  headerAction?: ReactNode;
};

const NAV_ITEMS: Array<{ href: WorkspaceRoute; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/profile', label: 'Profile' },
];

export default function WorkspaceWebPage({
  activeRoute,
  eyebrow,
  title,
  description,
  children,
  headerAction,
}: WorkspaceWebPageProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

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
                const active = activeRoute === item.href;

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

        <View style={styles.headerOuter}>
          <View style={styles.headerInner}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>

            {headerAction ? <View style={styles.headerActionWrap}>{headerAction}</View> : null}
          </View>
        </View>

        <View style={styles.contentOuter}>
          <View style={styles.contentInner}>{children}</View>
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
  headerOuter: {
    paddingHorizontal: 32,
    paddingBottom: 18,
  },
  headerInner: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 24,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    marginBottom: 10,
    maxWidth: 820,
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 840,
  },
  headerActionWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  contentOuter: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 26,
  },
  contentInner: {
    flex: 1,
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
});
