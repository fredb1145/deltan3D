import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicWebFrame from '../components/PublicWebFrame';
import {
  getCurrentMemberPlan,
  getVisiblePlans,
  selectMemberPlan,
  type MemberCurrentPlanOverview,
  type VisiblePlanListItem,
} from '../lib/memberPlans';
import { supabase } from '../lib/supabase';
import MotionCard from '../components/ui/MotionCard';
import MotionButton from '../components/ui/MotionButton';

function formatMoney(plan: VisiblePlanListItem) {
  const amount = typeof plan.price_amount === 'number' ? plan.price_amount : 0;
  const currency = plan.currency_code?.trim().toUpperCase() || 'USD';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function intervalLabel(value: string | null | undefined) {
  if (value === 'monthly') return 'Monthly';
  if (value === 'quarterly') return 'Quarterly';
  if (value === 'yearly') return 'Yearly';
  if (value === 'one_time') return 'One-Time';
  return 'Custom';
}

function limitLabel(value: number | null | undefined, suffix: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value} ${suffix}`;
  }

  return 'Flexible';
}

function sourceLabel(value: string | null | undefined) {
  if (value === 'assigned') return 'Selected plan';
  if (value === 'default') return 'Default live plan';
  return 'No live plan';
}

function statusLabel(value: string | null | undefined) {
  if (value === 'trialing') return 'Trial';
  if (value === 'past_due') return 'Past Due';
  if (value === 'canceled') return 'Canceled';
  if (value === 'expired') return 'Expired';
  if (value === 'active') return 'Active';
  return null;
}

function planFeatures(plan: VisiblePlanListItem) {
  return Array.isArray(plan.feature_list)
    ? plan.feature_list.filter(feature => typeof feature === 'string' && feature.trim())
    : [];
}

export default function PricingScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = Platform.OS === 'web' && width >= 980;
  const threeColumn = Platform.OS === 'web' && width >= 1400;

  const [plans, setPlans] = useState<VisiblePlanListItem[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MemberCurrentPlanOverview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [clearingPlan, setClearingPlan] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadScreen();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadScreen(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadScreen = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const [{ data: sessionData }, nextPlans] = await Promise.all([
        supabase.auth.getSession(),
        getVisiblePlans(),
      ]);

      const hasSession = Boolean(sessionData.session);
      setSignedIn(hasSession);
      setPlans(nextPlans);

      if (hasSession) {
        setCurrentPlan(await getCurrentMemberPlan());
      } else {
        setCurrentPlan(null);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'We could not load plans right now.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if ((a.is_recommended === true) !== (b.is_recommended === true)) {
          return a.is_recommended ? -1 : 1;
        }

        const orderA = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const orderB = typeof b.sort_order === 'number' ? b.sort_order : 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        const priceA = typeof a.price_amount === 'number' ? a.price_amount : 0;
        const priceB = typeof b.price_amount === 'number' ? b.price_amount : 0;

        return priceA - priceB;
      }),
    [plans],
  );

  const handleChoosePlan = (plan: VisiblePlanListItem) => {
    if (!signedIn) {
      router.push('/signup');
      return;
    }

    Alert.alert(
      'Choose Plan',
      `Switch your account to "${plan.name?.trim() || 'this plan'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose Plan',
          onPress: async () => {
            try {
              setSavingPlanId(plan.id);
              await selectMemberPlan(plan.id);
              await loadScreen(true);
              Alert.alert('Plan Updated', 'Your account is now using the new plan.');
            } catch (error: any) {
              Alert.alert('Could not update plan', error?.message || 'Please try again.');
            } finally {
              setSavingPlanId(null);
            }
          },
        },
      ],
    );
  };

  const handleUseDefaultPlan = () => {
    Alert.alert(
      'Use Default Plan',
      'Switch back to the default live plan for this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Default Plan',
          onPress: async () => {
            try {
              setClearingPlan(true);
              await selectMemberPlan(null);
              await loadScreen(true);
              Alert.alert('Plan Updated', 'Your account is now using the default live plan.');
            } catch (error: any) {
              Alert.alert('Could not update plan', error?.message || 'Please try again.');
            } finally {
              setClearingPlan(false);
            }
          },
        },
      ],
    );
  };

  const contentBody = (
    <>
      {Platform.OS !== 'web' ? (
        <>
          <View style={styles.topRow}>
            <MotionButton
              onPress={() => router.push(signedIn ? '/profile' : '/login')}
              variant="secondary"
              hapticStyle="light"
            >
              {signedIn ? 'Back to Profile' : 'Back to Sign In'}
            </MotionButton>

            {signedIn ? (
              <MotionButton
                onPress={() => loadScreen(true)}
                variant="secondary"
                hapticStyle="light"
              >
                Refresh
              </MotionButton>
            ) : null}
          </View>

          <MotionCard style={styles.heroCard}>
            <Text style={styles.heroLabel}>Plans</Text>
            <Text style={styles.heroTitle}>Choose the right fit for your tours</Text>
            <Text style={styles.heroText}>
              Plans control how many tours, scenes, 360 photos, share links, and embeds an account
              can use. The same flow works across web, iPhone, and Android.
            </Text>
          </MotionCard>
        </>
      ) : null}

      {isDesktop ? (
        <View style={styles.desktopInfoRow}>
          {signedIn ? (
            <View style={[styles.desktopInfoCard, styles.desktopInfoCardWide]}>
              <Text style={styles.currentPlanLabel}>Current Plan</Text>
              <Text style={styles.currentPlanTitle}>
                {currentPlan?.current_plan_name?.trim() || 'No live plan'}
              </Text>
              <Text style={styles.currentPlanText}>
                {sourceLabel(currentPlan?.current_plan_source)}
              </Text>
              {statusLabel(currentPlan?.subscription_status) ? (
                <Text style={styles.currentPlanMeta}>
                  Status: {statusLabel(currentPlan?.subscription_status)}
                </Text>
              ) : null}
              {currentPlan?.current_plan_source === 'assigned' ? (
                <MotionButton
                  onPress={handleUseDefaultPlan}
                  disabled={clearingPlan}
                  loading={clearingPlan}
                  variant="secondary"
                >
                  Use Default Plan
                </MotionButton>
              ) : null}
            </View>
          ) : (
            <View style={[styles.desktopInfoCard, styles.desktopInfoCardWide]}>
              <Text style={styles.currentPlanLabel}>Get Started</Text>
              <Text style={styles.currentPlanTitle}>Create an account</Text>
              <Text style={styles.currentPlanText}>
                Compare plans first, then create your account and choose the one you want.
              </Text>
              <View style={styles.heroActions}>
                <MotionButton onPress={() => router.push('/signup')} variant="primary">
                  Create Account
                </MotionButton>
                <MotionButton onPress={() => router.push('/login')} variant="secondary">
                  Sign In
                </MotionButton>
              </View>
            </View>
          )}

          <View style={styles.desktopInfoCard}>
            <Text style={styles.currentPlanLabel}>What You Can Compare</Text>
            <Text style={styles.desktopInfoTitle}>Every important limit is visible here</Text>
            <Text style={styles.desktopInfoText}>
              Compare tours, scenes, storage, share links, and embeds before picking the plan that
              fits your workflow.
            </Text>
          </View>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {sortedPlans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No live plans yet</Text>
          <Text style={styles.emptyText}>
            Create at least one visible live plan from the admin area before opening pricing.
          </Text>
        </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Compare Plans</Text>
              <Text style={styles.sectionTitle}>Pick the offer that matches your work</Text>
              <Text style={styles.sectionText}>
                These cards are the same plans your account will use after selection.
              </Text>
            </View>

            <View style={[styles.planGrid, isDesktop ? styles.planGridDesktop : null]}>
            {sortedPlans.map(plan => {
              const isCurrentPlan = currentPlan?.current_plan_id === plan.id;
              const featureList = planFeatures(plan);

            return (
              <MotionCard
                key={plan.id}
                style={[
                  styles.planCard,
                  isDesktop ? styles.planCardDesktop : null,
                  threeColumn ? styles.planCardDesktopThree : null,
                  plan.is_recommended ? styles.planCardRecommended : null,
                ]}
              >
                {plan.is_recommended ? (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Recommended</Text>
                  </View>
                ) : null}

                <Text style={styles.planName}>{plan.name?.trim() || 'Untitled Plan'}</Text>
                <Text style={styles.planPrice}>
                  {formatMoney(plan)} / {intervalLabel(plan.billing_interval)}
                </Text>
                <Text style={styles.planDescription}>
                  {plan.description?.trim() || 'A flexible plan for growing tour work.'}
                </Text>

                <View style={styles.limitGrid}>
                  <View style={styles.limitPill}>
                    <Text style={styles.limitPillText}>{limitLabel(plan.tour_limit, 'tours')}</Text>
                  </View>
                  <View style={styles.limitPill}>
                    <Text style={styles.limitPillText}>{limitLabel(plan.scene_limit, 'scenes')}</Text>
                  </View>
                  <View style={styles.limitPill}>
                    <Text style={styles.limitPillText}>
                      {typeof plan.storage_limit_mb === 'number'
                        ? `${plan.storage_limit_mb} MB storage`
                        : 'Flexible storage'}
                    </Text>
                  </View>
                  <View style={styles.limitPill}>
                    <Text style={styles.limitPillText}>
                      {typeof plan.share_link_limit === 'number'
                        ? `${plan.share_link_limit} share links`
                        : 'Flexible share links'}
                    </Text>
                  </View>
                  <View style={styles.limitPill}>
                    <Text style={styles.limitPillText}>
                      {typeof plan.embed_limit === 'number'
                        ? `${plan.embed_limit} embeds`
                        : 'Flexible embeds'}
                    </Text>
                  </View>
                </View>

                {featureList.length > 0 ? (
                  <View style={styles.featureList}>
                    {featureList.slice(0, 6).map(feature => (
                      <Text key={`${plan.id}-${feature}`} style={styles.featureText}>
                        {`\u2022 ${feature}`}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {signedIn ? (
                  <MotionButton
                    onPress={() => handleChoosePlan(plan)}
                    disabled={isCurrentPlan || savingPlanId === plan.id || clearingPlan}
                    loading={savingPlanId === plan.id}
                    variant={isCurrentPlan ? 'secondary' : 'primary'}
                  >
                    {isCurrentPlan
                      ? currentPlan?.current_plan_source === 'default'
                        ? 'Current Default Plan'
                        : 'Current Plan'
                      : 'Choose Plan'}
                  </MotionButton>
                ) : (
                  <MotionButton
                    onPress={() => router.push('/signup')}
                    variant="primary"
                  >
                    Create Account
                  </MotionButton>
                )}
              </MotionCard>
              );
            })}
            </View>
          </>
        )}

      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          Tour limits, scene limits, storage limits, share links, and embeds are enforced when
          account actions happen, not just shown here.
        </Text>
      </View>
    </>
  );

  const content = isWeb ? (
    <View style={[styles.content, isDesktop ? styles.contentDesktop : null]}>{contentBody}</View>
  ) : (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadScreen(true)}
          tintColor="#FFFFFF"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {contentBody}
    </ScrollView>
  );

  if (loading) {
    if (isWeb) {
      return (
        <PublicWebFrame
          activeRoute="/pricing"
          eyebrow="Pricing"
          title="Choose the right fit for your tours"
          description="Compare plans, review limits, and choose the one that matches your tour workflow."
          asideTitle="What you can compare"
          asideText="Review tours, scenes, storage, share links, and embeds before choosing a plan."
          asideItems={[
            'Shared plan selection on web, iPhone, and Android',
            'Visible live plans only',
            'The same limits apply when the account is in use',
          ]}
        >
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#C9A84C" />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        </PublicWebFrame>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isWeb) {
    return (
      <PublicWebFrame
        activeRoute="/pricing"
        eyebrow="Pricing"
        title="Choose the right fit for your tours"
        description="Compare plans, review limits, and choose the one that matches your tour workflow."
        asideTitle="What you can compare"
        asideText="Review tours, scenes, storage, share links, and embeds before choosing a plan."
        asideItems={[
          'Shared plan selection on web, iPhone, and Android',
          'Visible live plans only',
          'The same limits apply when the account is in use',
        ]}
      >
        {content}
      </PublicWebFrame>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryTopButton: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryTopButtonText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 18,
  },
  heroLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 22,
  },
  desktopInfoRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },
  desktopInfoCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 20,
    flex: 1,
  },
  desktopInfoCardWide: {
    flex: 1.35,
  },
  currentPlanCard: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
    borderRadius: 20,
    padding: 18,
  },
  currentPlanLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  currentPlanTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  currentPlanText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  currentPlanMeta: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
  },
  desktopInfoTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  desktopInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 21,
  },
  heroActions: {
    gap: 10,
  },
  errorCard: {
    backgroundColor: '#2A0A10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 20,
    padding: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 20,
  },
  planGrid: {
    gap: 14,
  },
  planGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 760,
  },
  planCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 24,
    padding: 18,
  },
  planCardDesktop: {
    width: '48.9%',
  },
  planCardDesktopThree: {
    width: '32.4%',
  },
  planCardRecommended: {
    borderColor: 'rgba(201,168,76,0.55)',
    backgroundColor: '#21090D',
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C9A84C',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  recommendedBadgeText: {
    color: '#0D0407',
    fontSize: 12,
    fontWeight: '800',
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  planPrice: {
    color: '#C9A84C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  planDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  limitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  limitPill: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  limitPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  featureList: {
    marginBottom: 16,
  },
  featureText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  footerNote: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
  },
  footerNoteText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0D0407',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
