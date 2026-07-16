import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PublicRoute =
  | '/'
  | '/pricing'
  | '/login'
  | '/signup'
  | '/explore'
  | '/create-tour'
  | '/profile'
  | '/admin';

type PublicWebFrameProps = {
  activeRoute: PublicRoute;
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideText: string;
  asideItems: string[];
  children: ReactNode;
};

type NavItem = {
  href: PublicRoute;
  label: string;
};

type CtaButton = {
  href: PublicRoute;
  label: string;
  tone: 'primary' | 'secondary';
};

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/explore', label: 'Explore' },
  { href: '/create-tour', label: 'Create Tour' },
  { href: '/profile', label: 'Profile' },
  { href: '/admin', label: 'Admin' },
];

const ACCOUNT_NAV_ITEMS: NavItem[] = [
  { href: '/login', label: 'Sign In' },
  { href: '/signup', label: 'Create Account' },
];

function getHeroActions(activeRoute: PublicRoute): CtaButton[] {
  if (activeRoute === '/') {
    return [
      { href: '/signup', label: 'Create Account', tone: 'primary' },
      { href: '/pricing', label: 'View Pricing', tone: 'secondary' },
    ];
  }

  if (activeRoute === '/pricing') {
    return [
      { href: '/signup', label: 'Start Now', tone: 'primary' },
      { href: '/login', label: 'Sign In', tone: 'secondary' },
    ];
  }

  if (activeRoute === '/login') {
    return [
      { href: '/signup', label: 'Create Account', tone: 'primary' },
      { href: '/pricing', label: 'Compare Plans', tone: 'secondary' },
    ];
  }

  return [
    { href: '/pricing', label: 'Compare Plans', tone: 'primary' },
    { href: '/login', label: 'Sign In', tone: 'secondary' },
  ];
}

export default function PublicWebFrame({
  activeRoute,
  eyebrow,
  title,
  description,
  asideTitle,
  asideText,
  asideItems,
  children,
}: PublicWebFrameProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const isCompact = width < 920;
  const isPhone = width < 560;
  const heroActions = getHeroActions(activeRoute);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.navOuter, isPhone ? styles.navOuterPhone : null]}>
            <View style={[styles.navInner, isCompact ? styles.navInnerCompact : null]}>
              <Pressable onPress={() => router.push('/')} style={styles.brandWrap}>
                <Text style={styles.brand}>Deltan3D</Text>
                <Text style={styles.brandSub}>Virtual Tour Platform</Text>
              </Pressable>

              <View style={[styles.navGroups, isCompact ? styles.navGroupsCompact : null]}>
                <View style={[styles.primaryNav, isCompact ? styles.primaryNavCompact : null]}>
                  {PRIMARY_NAV_ITEMS.map(item => {
                    const active = item.href === activeRoute;

                    return (
                      <Pressable
                        key={item.href}
                        onPress={() => router.push(item.href)}
                        style={[
                          styles.primaryNavItem,
                          isPhone ? styles.primaryNavItemPhone : null,
                          active ? styles.primaryNavItemActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.primaryNavText,
                            isPhone ? styles.primaryNavTextPhone : null,
                            active ? styles.primaryNavTextActive : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                  );
                })}
              </View>

                <View style={[styles.accountNav, isCompact ? styles.accountNavCompact : null]}>
                  {ACCOUNT_NAV_ITEMS.map(item => {
                    const active = item.href === activeRoute;
                    const isPrimary = item.href === '/signup';

                    return (
                      <Pressable
                        key={item.href}
                        onPress={() => router.push(item.href)}
                        style={[
                          styles.accountButton,
                          isPhone ? styles.accountButtonPhone : null,
                          isPrimary ? styles.accountButtonPrimary : styles.accountButtonSecondary,
                          active && !isPrimary ? styles.accountButtonActiveSecondary : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.accountButtonText,
                            isPhone ? styles.accountButtonTextPhone : null,
                            isPrimary
                              ? styles.accountButtonTextPrimary
                              : styles.accountButtonTextSecondary,
                            active && !isPrimary ? styles.accountButtonTextActiveSecondary : null,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.heroOuter, isPhone ? styles.heroOuterPhone : null]}>
            <View style={[styles.heroInner, isCompact ? styles.heroInnerCompact : null]}>
              <View style={[styles.heroCopy, isCompact ? styles.heroCopyCompact : null]}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={[styles.title, isCompact ? styles.titleCompact : null, isPhone ? styles.titlePhone : null]}>
                  {title}
                </Text>
                <Text
                  style={[
                    styles.description,
                    isCompact ? styles.descriptionCompact : null,
                    isPhone ? styles.descriptionPhone : null,
                  ]}
                >
                  {description}
                </Text>

                <View style={[styles.heroActions, isPhone ? styles.heroActionsPhone : null]}>
                  {heroActions.map(action => (
                    <Pressable
                      key={action.href}
                      onPress={() => router.push(action.href)}
                      style={[
                        styles.heroButton,
                        isPhone ? styles.heroButtonPhone : null,
                        action.tone === 'primary'
                          ? styles.heroButtonPrimary
                          : styles.heroButtonSecondary,
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroButtonText,
                          isPhone ? styles.heroButtonTextPhone : null,
                          action.tone === 'primary'
                            ? styles.heroButtonTextPrimary
                            : styles.heroButtonTextSecondary,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </View>

              <View style={[styles.supportPanel, isCompact ? styles.supportPanelCompact : null]}>
                <Text style={styles.supportLabel}>Inside This Experience</Text>
                <Text
                  style={[
                    styles.supportTitle,
                    isCompact ? styles.supportTitleCompact : null,
                    isPhone ? styles.supportTitlePhone : null,
                  ]}
                >
                  {asideTitle}
                </Text>
                <Text
                  style={[
                    styles.supportText,
                    isPhone ? styles.supportTextPhone : null,
                  ]}
                >
                  {asideText}
                </Text>

                <View style={styles.supportList}>
                  {asideItems.map(item => (
                    <View key={item} style={styles.supportItem}>
                      <View style={styles.supportDot} />
                      <Text style={styles.supportItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.contentOuter, isPhone ? styles.contentOuterPhone : null]}>
            <View style={styles.contentInner}>{children}</View>
          </View>
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  glowTop: {
    position: 'absolute',
    top: -220,
    right: -140,
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -260,
    left: -150,
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: 'rgba(201,168,76,0.04)',
  },
  navOuter: {
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(7,2,5,0.72)',
  },
  navOuterPhone: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  navInner: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 22,
  },
  navInnerCompact: {
    alignItems: 'flex-start',
  },
  brandWrap: {
    gap: 4,
    paddingRight: 10,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  brandSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  navGroups: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  navGroupsCompact: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  primaryNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  primaryNavCompact: {
    width: '100%',
  },
  primaryNavItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryNavItemPhone: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryNavItemActive: {
    backgroundColor: 'rgba(201,168,76,0.14)',
  },
  primaryNavText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryNavTextPhone: {
    fontSize: 12,
  },
  primaryNavTextActive: {
    color: '#C9A84C',
  },
  accountNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  accountNavCompact: {
    width: '100%',
  },
  accountButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountButtonPhone: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accountButtonPrimary: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  accountButtonSecondary: {
    backgroundColor: 'rgba(26,5,9,0.74)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  accountButtonActiveSecondary: {
    borderColor: 'rgba(201,168,76,0.45)',
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  accountButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  accountButtonTextPhone: {
    fontSize: 12,
  },
  accountButtonTextPrimary: {
    color: '#0D0407',
  },
  accountButtonTextSecondary: {
    color: '#FFFFFF',
  },
  accountButtonTextActiveSecondary: {
    color: '#C9A84C',
  },
  heroOuter: {
    paddingHorizontal: 36,
    paddingTop: 34,
    paddingBottom: 18,
  },
  heroOuterPhone: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
  },
  heroInner: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 26,
  },
  heroInnerCompact: {
    flexDirection: 'column',
    gap: 18,
  },
  heroCopy: {
    flex: 1,
    minWidth: 620,
    paddingTop: 4,
  },
  heroCopyCompact: {
    minWidth: 0,
    width: '100%',
  },
  eyebrow: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 68,
    lineHeight: 74,
    fontWeight: '900',
    maxWidth: 860,
    marginBottom: 16,
  },
  titleCompact: {
    fontSize: 50,
    lineHeight: 56,
    maxWidth: '100%',
  },
  titlePhone: {
    fontSize: 36,
    lineHeight: 41,
    marginBottom: 12,
  },
  description: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 18,
    lineHeight: 29,
    maxWidth: 820,
  },
  descriptionCompact: {
    maxWidth: '100%',
    fontSize: 16,
    lineHeight: 26,
  },
  descriptionPhone: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 28,
  },
  heroActionsPhone: {
    marginTop: 20,
    gap: 10,
  },
  heroButton: {
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonPhone: {
    flexGrow: 1,
    minWidth: 138,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  heroButtonPrimary: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  heroButtonSecondary: {
    backgroundColor: 'rgba(26,5,9,0.76)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  heroButtonTextPhone: {
    fontSize: 13,
  },
  heroButtonTextPrimary: {
    color: '#0D0407',
  },
  heroButtonTextSecondary: {
    color: '#FFFFFF',
  },
  supportPanel: {
    width: 370,
    backgroundColor: 'rgba(19,6,9,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 32,
    padding: 26,
  },
  supportPanelCompact: {
    width: '100%',
    padding: 22,
    borderRadius: 24,
  },
  supportLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  supportTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: 10,
  },
  supportTitleCompact: {
    fontSize: 24,
    lineHeight: 29,
  },
  supportTitlePhone: {
    fontSize: 20,
    lineHeight: 25,
  },
  supportText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 22,
  },
  supportTextPhone: {
    fontSize: 13,
    lineHeight: 20,
  },
  supportList: {
    marginTop: 18,
    gap: 12,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  supportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: '#C9A84C',
  },
  supportItemText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
  },
  contentOuter: {
    paddingHorizontal: 36,
  },
  contentOuterPhone: {
    paddingHorizontal: 18,
  },
  contentInner: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
});
