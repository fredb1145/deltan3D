import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import PublicWebFrame from '../../components/PublicWebFrame';
import { supabase } from '../../lib/supabase';
import MotionCard from '../../components/ui/MotionCard';
import MotionButton from '../../components/ui/MotionButton';

type TourRow = {
  id: string;
  title: string | null;
  location: string | null;
  scenes: number | null;
  nodes: unknown;
  created_at: string | null;
};

const WEBSITE_SHOWCASE_SCENES = [
  {
    source: require('../../assets/panoramas/node1.jpg'),
    title: 'Arrival scene',
    text: 'Lead visitors in with a polished first look.',
  },
  {
    source: require('../../assets/panoramas/node2.jpg'),
    title: 'Connected walkthroughs',
    text: 'Move people naturally between spaces.',
  },
  {
    source: require('../../assets/panoramas/node3.jpg'),
    title: 'Layout-aware editing',
    text: 'Keep scenes organized and easy to manage.',
  },
];

const WEBSITE_FEATURES = [
  {
    title: 'Immersive 360 virtual tours',
    text: 'Present spaces with smooth look-around viewing, scene-to-scene movement, highlights, and cleaner browser presentation.',
  },
  {
    title: 'Walkthrough navigation',
    text: 'Connect scenes, guide movement direction, and keep the full tour flow feeling intentional from one space to the next.',
  },
  {
    title: 'Builder and layout workflow',
    text: 'Upload real panoramas, organize scenes, refine layout maps, and keep editing inside one connected tour-building flow.',
  },
  {
    title: 'Plans, members, and admin control',
    text: 'Manage pricing, member access, and platform operations from the same product instead of relying on a hidden back-office panel.',
  },
];

const WEBSITE_STEPS = [
  'Create a tour and upload real 360 scenes.',
  'Arrange the walkthrough order and place scenes on the layout map.',
  'Share, manage, and grow the platform from plans, profile, and admin tools.',
];

const WEBSITE_PAGES: Array<{ title: string; route: string; text: string }> = [
  {
    title: 'Pricing',
    route: '/pricing',
    text: 'Compare plans, limits, and account options.',
  },
  {
    title: 'Sign In',
    route: '/login',
    text: 'Open your account and continue working.',
  },
  {
    title: 'Create Account',
    route: '/signup',
    text: 'Start a new account and move into the platform cleanly.',
  },
  {
    title: 'Explore',
    route: '/explore',
    text: 'Browse tours, open work quickly, and manage the library.',
  },
  {
    title: 'Create Tour',
    route: '/create-tour',
    text: 'Start a new tour with real 360 scenes and builder tools.',
  },
  {
    title: 'Profile',
    route: '/profile',
    text: 'Open account details, plans, and session tools.',
  },
  {
    title: 'Admin',
    route: '/admin',
    text: 'Run members, tours, plans, and platform controls from the frontend.',
  },
  {
    title: 'Password Help',
    route: '/forgot-password',
    text: 'Recover access if you need to reset a password.',
  },
];

function getSceneCount(tour: TourRow) {
  if (Array.isArray(tour.nodes) && tour.nodes.length > 0) {
    return tour.nodes.length;
  }

  if (typeof tour.scenes === 'number' && Number.isFinite(tour.scenes)) {
    return tour.scenes;
  }

  return 0;
}

function formatTourTitle(tour: TourRow, index: number) {
  if (typeof tour.title === 'string' && tour.title.trim()) {
    return tour.title.trim();
  }

  return `Untitled Tour ${index + 1}`;
}

function formatTourLocation(tour: TourRow) {
  if (typeof tour.location === 'string' && tour.location.trim()) {
    return tour.location.trim();
  }

  return 'No location';
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return 'No recent activity';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'No recent activity';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function openTour(tourId: string) {
  router.push({
    pathname: '/tour/[id]',
    params: { id: tourId },
  });
}

function editTour(tourId: string) {
  router.push({
    pathname: '/edit-tour/[id]',
    params: { id: tourId },
  });
}

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const isWebsiteHome = Platform.OS === 'web';
  const isDesktop = Platform.OS === 'web' && width >= 1100;
  const isTwoColumn = Platform.OS === 'web' && width >= 860;
  const wideWebsite = Platform.OS === 'web' && width >= 1180;
  const compactWebsite = Platform.OS === 'web' && width < 860;
  const phoneWebsite = Platform.OS === 'web' && width < 560;

  const [tours, setTours] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const getTours = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    const { data, error: fetchError } = await supabase
      .from('tours')
      .select('id, title, location, scenes, nodes, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setTours([]);
      setError(fetchError.message || 'Could not load tours.');
    } else {
      setTours((data as TourRow[]) || []);
    }

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isWebsiteHome) {
        return () => {};
      }

      getTours();
      return () => {};
    }, [getTours, isWebsiteHome]),
  );

  const dashboardStats = useMemo(() => {
    const totalTours = tours.length;
    const totalScenes = tours.reduce((count, tour) => count + getSceneCount(tour), 0);
    const mostRecentTour = tours[0] || null;

    return {
      totalTours,
      totalScenes,
      recentDate: formatCreatedAt(mostRecentTour?.created_at || null),
      recentTitle: mostRecentTour ? formatTourTitle(mostRecentTour, 0) : 'No tours yet',
    };
  }, [tours]);

  const recentTours = tours.slice(0, 4);

  if (isWebsiteHome) {
    return (
      <PublicWebFrame
        activeRoute="/"
        eyebrow="Deltan3D Platform"
        title="Create and share immersive virtual tours with a cleaner platform workflow"
        description="Deltan3D brings together 360 tour building, walkthrough navigation, layout planning, pricing control, and member management in one connected product."
        asideTitle="Built for the full workflow"
        asideText="Move from account setup to tour building, pricing, profile tools, and admin control without leaving the main product flow behind."
        asideItems={[
          'Tour creation, viewing, and management in one place',
          'Direct routes into pricing, account access, profile, and admin',
          'The same product rules across web, iPhone, and Android',
        ]}
      >
        <View style={styles.websiteContent}>
          <View
            style={[
              styles.websiteShowcaseSection,
              wideWebsite ? styles.websiteShowcaseSectionWide : null,
            ]}
          >
            <View style={styles.websiteShowcaseCopy}>
              <Text style={styles.websiteSectionLabel}>See The Product</Text>
              <Text
                style={[
                  styles.websiteSectionTitle,
                  compactWebsite ? styles.websiteSectionTitleCompact : null,
                  phoneWebsite ? styles.websiteSectionTitlePhone : null,
                ]}
              >
                Explore how tours, scenes, and walkthroughs come together
              </Text>
              <Text style={styles.websiteSectionText}>
                Use the homepage to introduce the product clearly, show the visual quality of the tours, and lead people into the parts of the platform they need next.
              </Text>

              <View style={styles.websiteStepListCard}>
                <View style={styles.websiteStepRow}>
                  <View style={styles.websiteStepDot} />
                  <Text style={styles.websiteStepText}>Use 360 scenes to present spaces with depth and direction.</Text>
                </View>
                <View style={styles.websiteStepRow}>
                  <View style={styles.websiteStepDot} />
                  <Text style={styles.websiteStepText}>Guide movement from one scene to the next with a cleaner walkthrough flow.</Text>
                </View>
                <View style={styles.websiteStepRow}>
                  <View style={styles.websiteStepDot} />
                  <Text style={styles.websiteStepText}>Manage tours, plans, and members from the same product environment.</Text>
                </View>
              </View>
            </View>

            <View style={styles.websiteShowcaseVisuals}>
              <View style={styles.websiteVisualMainCard}>
                <Image
                  source={WEBSITE_SHOWCASE_SCENES[0].source}
                  style={styles.websiteVisualMainImage}
                  resizeMode="cover"
                />

                <View style={styles.websiteVisualOverlayCard}>
                  <Text style={styles.websiteVisualOverlayLabel}>Featured Scene</Text>
                  <Text style={styles.websiteVisualOverlayTitle}>{WEBSITE_SHOWCASE_SCENES[0].title}</Text>
                  <Text style={styles.websiteVisualOverlayText}>{WEBSITE_SHOWCASE_SCENES[0].text}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.websiteVisualThumbGrid,
                  compactWebsite ? styles.websiteVisualThumbGridCompact : null,
                ]}
              >
                {WEBSITE_SHOWCASE_SCENES.slice(1).map(scene => (
                  <View key={scene.title} style={styles.websiteVisualThumbCard}>
                    <Image source={scene.source} style={styles.websiteVisualThumbImage} resizeMode="cover" />
                    <View style={styles.websiteVisualThumbBody}>
                      <Text style={styles.websiteVisualThumbTitle}>{scene.title}</Text>
                      <Text style={styles.websiteVisualThumbText}>{scene.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.websiteFeatureGrid, wideWebsite ? styles.websiteFeatureGridWide : null]}>
            {WEBSITE_FEATURES.map(feature => (
              <View
                key={feature.title}
                style={[styles.websiteFeatureCard, wideWebsite ? styles.websiteFeatureCardWide : null]}
              >
                <Text style={styles.websiteFeatureTitle}>{feature.title}</Text>
                <Text style={styles.websiteFeatureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.websiteSplitSection, wideWebsite ? styles.websiteSplitSectionWide : null]}>
            <View style={styles.websiteStoryCard}>
              <Text style={styles.websiteSectionLabel}>How It Works</Text>
              <Text
                style={[
                  styles.websiteSectionTitle,
                  compactWebsite ? styles.websiteSectionTitleCompact : null,
                  phoneWebsite ? styles.websiteSectionTitlePhone : null,
                ]}
              >
                A complete tour platform for creation, navigation, and control
              </Text>
              <Text style={styles.websiteSectionText}>
                The product is structured so teams can move from building tours to managing plans and admin access without leaving the main experience behind.
              </Text>

              {WEBSITE_STEPS.map(step => (
                <View key={step} style={styles.websiteStepRow}>
                  <View style={styles.websiteStepDot} />
                  <Text style={styles.websiteStepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.websiteStoryCard}>
              <Text style={styles.websiteSectionLabel}>Why Teams Use It</Text>
              <Text
                style={[
                  styles.websiteSectionTitle,
                  compactWebsite ? styles.websiteSectionTitleCompact : null,
                  phoneWebsite ? styles.websiteSectionTitlePhone : null,
                ]}
              >
                One place for tours, plans, members, and daily operations
              </Text>
              <Text style={styles.websiteSectionText}>
                Deltan3D is built for teams that want to create polished tours, organize scenes clearly, and keep member and plan control close to the work itself.
              </Text>

              <View style={styles.websiteMetricsRow}>
                <View style={styles.websiteMetricCard}>
                  <Text style={styles.websiteMetricValue}>360</Text>
                  <Text style={styles.websiteMetricLabel}>Tour workflows</Text>
                </View>
                <View style={styles.websiteMetricCard}>
                  <Text style={styles.websiteMetricValue}>Plans</Text>
                  <Text style={styles.websiteMetricLabel}>Limits and pricing</Text>
                </View>
                <View style={styles.websiteMetricCard}>
                  <Text style={styles.websiteMetricValue}>Admin</Text>
                  <Text style={styles.websiteMetricLabel}>Frontend control</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.websitePagesSection}>
            <Text style={styles.websiteSectionLabel}>Open Pages</Text>
            <Text
              style={[
                styles.websiteSectionTitle,
                compactWebsite ? styles.websiteSectionTitleCompact : null,
                phoneWebsite ? styles.websiteSectionTitlePhone : null,
              ]}
            >
              Jump straight into the main areas of the platform
            </Text>
            <Text style={styles.websiteSectionText}>
              Use these links to move quickly into pricing, sign in, tour creation, profile tools, and admin controls.
            </Text>

            <View style={[styles.websitePagesGrid, wideWebsite ? styles.websitePagesGridWide : null]}>
              {WEBSITE_PAGES.map(page => (
                <Pressable
                  key={page.route}
                  onPress={() => router.push(page.route as any)}
                  style={[styles.websitePageCard, wideWebsite ? styles.websitePageCardWide : null]}
                >
                  <Text style={styles.websitePageTitle}>{page.title}</Text>
                  <Text style={styles.websitePageText}>{page.text}</Text>
                  <Text style={styles.websitePageLink}>Open Page</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.websiteFooterCard}>
            <Text style={styles.websiteFooterTitle}>Start with the part of the platform you need most</Text>
            <Text style={styles.websiteFooterText}>
              Compare plans, create an account, or jump straight into building and managing tours.
            </Text>
            <View style={styles.websiteFooterActions}>
              <Pressable onPress={() => router.push('/pricing')} style={styles.websitePrimaryButton}>
                <Text style={styles.websitePrimaryButtonText}>View Pricing</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/create-tour')} style={styles.websiteSecondaryButton}>
                <Text style={styles.websiteSecondaryButtonText}>Create Tour</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </PublicWebFrame>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, isDesktop ? styles.contentDesktop : null]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => getTours(true)}
            tintColor="#FFFFFF"
          />
        }
      >
        <Text style={styles.heading}>Welcome back</Text>

        <Text style={[styles.subheading, isDesktop ? styles.subheadingDesktop : null]}>
          Keep your tours moving. Create new walkthroughs, open recent work fast, and head to
          Explore when you want the full library.
        </Text>

        <View style={[styles.heroLayout, isDesktop ? styles.heroLayoutDesktop : null]}>
          <MotionCard style={[styles.heroCard, isDesktop ? styles.heroCardDesktop : null]}>
            <Text style={styles.heroLabel}>Dashboard</Text>

            <Text style={styles.heroTitle}>
              {dashboardStats.totalTours > 0
                ? `${dashboardStats.totalTours} tour${dashboardStats.totalTours === 1 ? '' : 's'} ready`
                : 'Build your first tour'}
            </Text>

            <Text style={styles.heroText}>
              {dashboardStats.totalTours > 0
                ? `Your latest activity was ${dashboardStats.recentTitle} on ${dashboardStats.recentDate}.`
                : 'Start with a new 360 tour, then use Explore to manage the full collection.'}
            </Text>

            <View style={[styles.actionRow, isDesktop ? styles.actionRowDesktop : null]}>
              <MotionButton
                onPress={() => router.push('/create-tour')}
                variant="primary"
                style={isDesktop ? styles.linkDesktop : null}
              >
                Create Tour
              </MotionButton>

              <MotionButton
                onPress={() => router.push('/explore')}
                variant="secondary"
                style={isDesktop ? styles.linkDesktop : null}
              >
                Open Explore
              </MotionButton>
            </View>
          </MotionCard>

          <View style={[styles.statsGrid, isDesktop ? styles.statsGridDesktop : null]}>
            <MotionCard style={[styles.statCard, isDesktop ? styles.statCardDesktop : null]}>
              <Text style={styles.statLabel}>Tours</Text>
              <Text style={styles.statValue}>{dashboardStats.totalTours}</Text>
            </MotionCard>

            <MotionCard style={[styles.statCard, isDesktop ? styles.statCardDesktop : null]}>
              <Text style={styles.statLabel}>Scenes</Text>
              <Text style={styles.statValue}>{dashboardStats.totalScenes}</Text>
            </MotionCard>

            <MotionCard
              style={[
                styles.statCard,
                styles.latestCard,
                isDesktop ? styles.latestCardDesktop : null,
              ]}
            >
              <Text style={styles.statLabel}>Latest</Text>
              <Text style={styles.latestValue}>{dashboardStats.recentDate}</Text>
              <Text style={styles.latestText}>{dashboardStats.recentTitle}</Text>
            </MotionCard>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Recent Tours</Text>
            <Text style={styles.sectionText}>
              Home keeps the latest few ready. Explore holds the full library and cleanup tools.
            </Text>
          </View>

          {tours.length > 0 ? (
            <Link href="/explore" style={styles.viewAllLink}>
              View All
            </Link>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.stateText}>Loading dashboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.statePanel}>
            <Text style={styles.stateTitle}>Could not load the dashboard</Text>
            <Text style={styles.stateBody}>{error}</Text>

            <MotionButton onPress={() => getTours()} variant="primary">
              Try Again
            </MotionButton>
          </View>
        ) : recentTours.length === 0 ? (
          <View style={styles.statePanel}>
            <Text style={styles.stateTitle}>No tours yet</Text>
            <Text style={styles.stateBody}>
              Create your first tour here, then use Explore later when you want the full list,
              editing tools, and cleanup actions.
            </Text>

            <MotionButton onPress={() => router.push('/create-tour')} variant="primary">
              Create Your First Tour
            </MotionButton>
          </View>
        ) : (
          <View style={[styles.recentGrid, isTwoColumn ? styles.recentGridDesktop : null]}>
            {recentTours.map((tour, index) => {
              const sceneCount = getSceneCount(tour);

              return (
                <MotionCard
                  key={tour.id}
                  style={[styles.recentCard, isTwoColumn ? styles.recentCardDesktop : null]}
                >
                  <Pressable
                    onPress={() => openTour(tour.id)}
                    style={styles.recentCardTop}
                  >
                    <Text style={styles.recentTitle}>{formatTourTitle(tour, index)}</Text>

                    <Text style={styles.recentMeta}>
                      {formatTourLocation(tour)} - {sceneCount} scene{sceneCount === 1 ? '' : 's'}
                    </Text>

                    <Text style={styles.recentDate}>Added {formatCreatedAt(tour.created_at)}</Text>
                  </Pressable>

                  <View style={styles.recentActions}>
                    <MotionButton
                      onPress={() => openTour(tour.id)}
                      variant="primary"
                      style={{ flex: 1 }}
                    >
                      Open
                    </MotionButton>

                    <MotionButton
                      onPress={() => editTour(tour.id)}
                      variant="secondary"
                      style={{ flex: 1 }}
                    >
                      Edit
                    </MotionButton>
                  </View>
                </MotionCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  websiteContent: {
    gap: 18,
  },
  websiteShowcaseSection: {
    gap: 18,
    marginBottom: 6,
  },
  websiteShowcaseSectionWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  websiteShowcaseCopy: {
    flex: 0.9,
    backgroundColor: '#130408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 28,
    padding: 24,
  },
  websiteShowcaseVisuals: {
    flex: 1.1,
    gap: 14,
  },
  websiteVisualMainCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    backgroundColor: '#120408',
    minHeight: 320,
  },
  websiteVisualMainImage: {
    width: '100%',
    height: 320,
  },
  websiteVisualOverlayCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    backgroundColor: 'rgba(13,4,7,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 22,
    padding: 18,
  },
  websiteVisualOverlayLabel: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  websiteVisualOverlayTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  websiteVisualOverlayText: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 13,
    lineHeight: 20,
  },
  websiteVisualThumbGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  websiteVisualThumbGridCompact: {
    flexDirection: 'column',
  },
  websiteVisualThumbCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1A0509',
  },
  websiteVisualThumbImage: {
    width: '100%',
    height: 140,
  },
  websiteVisualThumbBody: {
    padding: 16,
  },
  websiteVisualThumbTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  websiteVisualThumbText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 20,
  },
  websiteStepListCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 18,
  },
  websiteFeatureGrid: {
    gap: 16,
    marginBottom: 18,
  },
  websiteFeatureGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  websiteFeatureCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 26,
    padding: 22,
  },
  websiteFeatureCardWide: {
    width: '48.9%',
  },
  websiteFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  websiteFeatureText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 22,
  },
  websiteSplitSection: {
    gap: 16,
    marginBottom: 18,
  },
  websiteSplitSectionWide: {
    flexDirection: 'row',
  },
  websiteStoryCard: {
    flex: 1,
    backgroundColor: '#130408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
    borderRadius: 28,
    padding: 24,
  },
  websiteSectionLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  websiteSectionTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: 10,
    maxWidth: 620,
  },
  websiteSectionTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
    maxWidth: '100%',
  },
  websiteSectionTitlePhone: {
    fontSize: 21,
    lineHeight: 27,
  },
  websiteSectionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },
  websiteStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  websiteStepDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#C9A84C',
    marginTop: 7,
  },
  websiteStepText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
  },
  websiteMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  websiteMetricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 16,
  },
  websiteMetricValue: {
    color: '#C9A84C',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  websiteMetricLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  websitePagesSection: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  websitePagesGrid: {
    gap: 14,
  },
  websitePagesGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  websitePageCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
  },
  websitePageCardWide: {
    width: '48.9%',
  },
  websitePageTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  websitePageText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  websitePageLink: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
  },
  websiteFooterCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 28,
    padding: 26,
  },
  websiteFooterTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
  },
  websiteFooterText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
    maxWidth: 760,
  },
  websiteFooterActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  websitePrimaryButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  websitePrimaryButtonText: {
    color: '#0D0407',
    fontSize: 14,
    fontWeight: '900',
  },
  websiteSecondaryButton: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.26)',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  websiteSecondaryButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
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
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  subheadingDesktop: {
    maxWidth: 720,
    marginBottom: 28,
  },
  heroLayout: {
    gap: 16,
    marginBottom: 28,
  },
  heroLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 20,
  },
  heroCardDesktop: {
    flex: 1.35,
    minHeight: 260,
  },
  heroLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  actionRow: {
    gap: 10,
  },
  actionRowDesktop: {
    flexDirection: 'row',
  },
  primaryLink: {
    color: '#0D0407',
    backgroundColor: '#C9A84C',
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryLink: {
    color: '#C9A84C',
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    paddingVertical: 14,
    borderRadius: 14,
    overflow: 'hidden',
    fontWeight: '800',
    textAlign: 'center',
  },
  linkDesktop: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statsGridDesktop: {
    flex: 1,
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 16,
  },
  statCardDesktop: {
    minWidth: '47%',
  },
  latestCard: {
    flex: 1,
  },
  latestCardDesktop: {
    width: '100%',
    minWidth: '100%',
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
    fontSize: 26,
    fontWeight: '800',
  },
  latestValue: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  latestText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 680,
  },
  viewAllLink: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  stateCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  statePanel: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 18,
  },
  stateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  stateBody: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#0D0407',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyLink: {
    color: '#0D0407',
    backgroundColor: '#C9A84C',
    paddingVertical: 14,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '800',
    textAlign: 'center',
  },
  recentGrid: {
    gap: 16,
  },
  recentGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recentCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  recentCardDesktop: {
    width: '48.9%',
  },
  recentCardTop: {
    padding: 20,
  },
  recentTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 6,
  },
  recentMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginBottom: 10,
  },
  recentDate: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
  },
  recentActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  openButton: {
    flex: 1,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  openButtonText: {
    color: '#0D0407',
    fontWeight: '800',
    fontSize: 14,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  editButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
  },
});
