import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDesktopFrame from '../components/AdminDesktopFrame';
import { hasAdminPermission, type AdminAccess } from '../lib/adminAccess';
import { getAllPlans } from '../lib/admin/getAllPlans';
import { getAdminSession } from '../lib/admin/getAdminSession';
import { savePlan } from '../lib/admin/savePlan';
import { setPlanArchived } from '../lib/admin/togglePlanArchive';
import type { AdminPlanBillingInterval, AdminPlanListItem } from '../lib/admin/types';

type PlanFilter = 'all' | 'live' | 'recommended' | 'archived';
type EditorMode = 'create' | 'edit' | null;
type PlanFormState = {
  name: string;
  description: string;
  priceAmount: string;
  currencyCode: string;
  billingInterval: AdminPlanBillingInterval;
  featureText: string;
  tourLimit: string;
  sceneLimit: string;
  storageLimitMb: string;
  shareLinkLimit: string;
  embedLimit: string;
  sortOrder: string;
  isActive: boolean;
  isVisible: boolean;
  isRecommended: boolean;
};

const BILLING_OPTIONS: AdminPlanBillingInterval[] = ['monthly', 'quarterly', 'yearly', 'one_time', 'custom'];

function createEmptyFormState(): PlanFormState {
  return {
    name: '',
    description: '',
    priceAmount: '0',
    currencyCode: 'USD',
    billingInterval: 'monthly',
    featureText: '',
    tourLimit: '',
    sceneLimit: '',
    storageLimitMb: '',
    shareLinkLimit: '',
    embedLimit: '',
    sortOrder: '0',
    isActive: true,
    isVisible: true,
    isRecommended: false,
  };
}

function featuresOf(plan: AdminPlanListItem) {
  return Array.isArray(plan.feature_list) ? plan.feature_list.filter(feature => typeof feature === 'string' && feature.trim()) : [];
}

function formFromPlan(plan: AdminPlanListItem): PlanFormState {
  return {
    name: plan.name?.trim() || '',
    description: plan.description?.trim() || '',
    priceAmount: typeof plan.price_amount === 'number' && Number.isFinite(plan.price_amount) ? String(plan.price_amount) : '0',
    currencyCode: plan.currency_code?.trim().toUpperCase() || 'USD',
    billingInterval: (plan.billing_interval as AdminPlanBillingInterval) || 'monthly',
    featureText: featuresOf(plan).join('\n'),
    tourLimit: typeof plan.tour_limit === 'number' ? String(plan.tour_limit) : '',
    sceneLimit: typeof plan.scene_limit === 'number' ? String(plan.scene_limit) : '',
    storageLimitMb: typeof plan.storage_limit_mb === 'number' ? String(plan.storage_limit_mb) : '',
    shareLinkLimit: typeof plan.share_link_limit === 'number' ? String(plan.share_link_limit) : '',
    embedLimit: typeof plan.embed_limit === 'number' ? String(plan.embed_limit) : '',
    sortOrder: typeof plan.sort_order === 'number' ? String(plan.sort_order) : '0',
    isActive: plan.is_active !== false,
    isVisible: plan.is_visible !== false,
    isRecommended: plan.is_recommended === true,
  };
}

function planName(plan: AdminPlanListItem, index: number) {
  return plan.name?.trim() || `Plan ${index + 1}`;
}

function intervalLabel(value: AdminPlanBillingInterval | string | null | undefined) {
  if (value === 'monthly') return 'Monthly';
  if (value === 'quarterly') return 'Quarterly';
  if (value === 'yearly') return 'Yearly';
  if (value === 'one_time') return 'One-Time';
  return 'Custom';
}

function countOf(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function formatMoney(plan: AdminPlanListItem) {
  const amount = typeof plan.price_amount === 'number' ? plan.price_amount : 0;
  const currency = plan.currency_code?.trim().toUpperCase() || 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function AdminPlansScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web';
  const splitLayout = isDesktopWeb && width >= 1280;
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [plans, setPlans] = useState<AdminPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlanFilter>('all');
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PlanFormState>(createEmptyFormState());
  const canManagePlans = access ? hasAdminPermission(access, 'plans.manage') : false;
  const selectedPlan = useMemo(() => plans.find(plan => plan.id === selectedPlanId) || null, [plans, selectedPlanId]);

  useEffect(() => {
    void loadPlans();
  }, []);

  const loadPlans = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');
    try {
      const session = await getAdminSession('plans.read');
      const nextPlans = await getAllPlans();
      setAccess(session.access);
      setPlans(nextPlans);
      if (selectedPlanId) {
        const current = nextPlans.find(plan => plan.id === selectedPlanId);
        if (current) setFormState(formFromPlan(current));
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load plans.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan, index) => {
      if (filter === 'live' && (plan.is_archived === true || plan.is_active === false || plan.is_visible === false)) return false;
      if (filter === 'recommended' && (plan.is_archived === true || plan.is_recommended !== true)) return false;
      if (filter === 'archived' && plan.is_archived !== true) return false;
      if (!query) return true;
      const haystack = [planName(plan, index), plan.description || '', plan.currency_code || '', featuresOf(plan).join(' ')].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [filter, plans, search]);

  const openCreateEditor = () => {
    setEditorMode('create');
    setSelectedPlanId(null);
    setFormState(createEmptyFormState());
  };

  const openEditEditor = (plan: AdminPlanListItem) => {
    setEditorMode('edit');
    setSelectedPlanId(plan.id);
    setFormState(formFromPlan(plan));
  };

  const closeEditor = () => {
    setEditorMode(null);
    setSelectedPlanId(null);
    setFormState(createEmptyFormState());
  };

  const handleSave = async () => {
    const priceAmount = Number(formState.priceAmount.trim());
    const sortOrder = Number(formState.sortOrder.trim() || '0');
    if (!formState.name.trim()) {
      setErrorMessage('Please enter a plan name.');
      return;
    }
    if (!Number.isFinite(priceAmount) || priceAmount < 0) {
      setErrorMessage('Please enter a valid price.');
      return;
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setErrorMessage('Please enter a valid display order.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    try {
      const planId = await savePlan({
        planId: editorMode === 'edit' ? selectedPlanId : null,
        name: formState.name,
        description: formState.description,
        priceAmount,
        currencyCode: formState.currencyCode,
        billingInterval: formState.billingInterval,
        featureList: formState.featureText.split('\n'),
        tourLimit: parseOptionalNumber(formState.tourLimit),
        sceneLimit: parseOptionalNumber(formState.sceneLimit),
        storageLimitMb: parseOptionalNumber(formState.storageLimitMb),
        shareLinkLimit: parseOptionalNumber(formState.shareLinkLimit),
        embedLimit: parseOptionalNumber(formState.embedLimit),
        isActive: formState.isActive,
        isVisible: formState.isVisible,
        isRecommended: formState.isRecommended,
        sortOrder: Math.round(sortOrder),
      });
      await loadPlans(true);
      setEditorMode('edit');
      setSelectedPlanId(planId);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not save this plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = (plan: AdminPlanListItem, index: number) => {
    const nextArchived = plan.is_archived !== true;
    Alert.alert(nextArchived ? 'Archive Plan' : 'Restore Plan', nextArchived ? `Archive "${planName(plan, index)}"? It will be hidden until you restore it.` : `Restore "${planName(plan, index)}" so you can use it again?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: nextArchived ? 'Archive' : 'Restore',
        style: nextArchived ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setArchivingId(plan.id);
            await setPlanArchived({ planId: plan.id, nextArchived });
            await loadPlans(true);
          } catch (error: any) {
            setErrorMessage(error?.message || 'Could not update this plan.');
          } finally {
            setArchivingId(null);
          }
        },
      },
    ]);
  };

  const editorCard = canManagePlans ? (
    editorMode ? (
      <View style={styles.editorCard}>
        <Text style={styles.editorLabel}>Plan Editor</Text>
        <Text style={styles.editorTitle}>{editorMode === 'create' ? 'Create a New Plan' : selectedPlan?.name || 'Edit Plan'}</Text>
        <Text style={styles.editorText}>Keep plan details clear here so pricing, limits, and visibility stay easy to manage.</Text>

        <Text style={styles.fieldLabel}>Plan Name</Text>
        <TextInput value={formState.name} onChangeText={value => setFormState(current => ({ ...current, name: value }))} placeholder="Starter" placeholderTextColor="#888" style={styles.input} />

        <Text style={styles.fieldLabel}>Plan Summary</Text>
        <TextInput value={formState.description} onChangeText={value => setFormState(current => ({ ...current, description: value }))} placeholder="A clear short summary of who this plan fits." placeholderTextColor="#888" multiline textAlignVertical="top" style={[styles.input, styles.textArea]} />

        <View style={styles.fieldGrid}>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput value={formState.priceAmount} onChangeText={value => setFormState(current => ({ ...current, priceAmount: value }))} placeholder="29" placeholderTextColor="#888" keyboardType="decimal-pad" style={styles.input} />
          </View>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Currency</Text>
            <TextInput value={formState.currencyCode} onChangeText={value => setFormState(current => ({ ...current, currencyCode: value }))} placeholder="USD" autoCapitalize="characters" placeholderTextColor="#888" style={styles.input} />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Billing</Text>
        <View style={styles.optionRow}>
          {BILLING_OPTIONS.map(option => (
            <Pressable key={option} onPress={() => setFormState(current => ({ ...current, billingInterval: option }))} style={[styles.optionChip, formState.billingInterval === option ? styles.optionChipSelected : null]}>
              <Text style={[styles.optionChipText, formState.billingInterval === option ? styles.optionChipTextSelected : null]}>{intervalLabel(option)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Included Features</Text>
        <TextInput value={formState.featureText} onChangeText={value => setFormState(current => ({ ...current, featureText: value }))} placeholder={'Add one feature per line\nExample:\nUnlimited tour views\nPriority support'} placeholderTextColor="#888" multiline textAlignVertical="top" style={[styles.input, styles.textAreaLarge]} />

        <View style={styles.fieldGrid}>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Tour Limit</Text>
            <TextInput value={formState.tourLimit} onChangeText={value => setFormState(current => ({ ...current, tourLimit: value }))} placeholder="Leave blank for unlimited" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Scene Limit</Text>
            <TextInput value={formState.sceneLimit} onChangeText={value => setFormState(current => ({ ...current, sceneLimit: value }))} placeholder="Leave blank for unlimited" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Storage Limit (MB)</Text>
            <TextInput value={formState.storageLimitMb} onChangeText={value => setFormState(current => ({ ...current, storageLimitMb: value }))} placeholder="Leave blank if flexible" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Display Order</Text>
            <TextInput value={formState.sortOrder} onChangeText={value => setFormState(current => ({ ...current, sortOrder: value }))} placeholder="0" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Shareable Links</Text>
            <TextInput value={formState.shareLinkLimit} onChangeText={value => setFormState(current => ({ ...current, shareLinkLimit: value }))} placeholder="Leave blank if flexible" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
          <View style={styles.fieldGridItem}>
            <Text style={styles.fieldLabel}>Embeds</Text>
            <TextInput value={formState.embedLimit} onChangeText={value => setFormState(current => ({ ...current, embedLimit: value }))} placeholder="Leave blank if flexible" placeholderTextColor="#888" keyboardType="number-pad" style={styles.input} />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Plan Status</Text>
        <View style={styles.optionRow}>
          {[
            { key: 'isActive', label: 'Live' },
            { key: 'isVisible', label: 'Visible' },
            { key: 'isRecommended', label: 'Recommended' },
          ].map(option => {
            const selected = formState[option.key as keyof Pick<PlanFormState, 'isActive' | 'isVisible' | 'isRecommended'>];
            return (
              <Pressable key={option.key} onPress={() => setFormState(current => ({ ...current, [option.key]: !selected }))} style={[styles.optionChip, selected ? styles.optionChipSelected : null]}>
                <Text style={[styles.optionChipText, selected ? styles.optionChipTextSelected : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={handleSave} disabled={saving} style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}>
          {saving ? <ActivityIndicator color="#0D0407" /> : <Text style={styles.primaryButtonText}>{editorMode === 'create' ? 'Create Plan' : 'Save Plan'}</Text>}
        </Pressable>
      </View>
    ) : (
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>Open the editor</Text>
        <Text style={styles.placeholderText}>Create a new plan or choose any existing plan from the list to manage pricing, limits, and visibility.</Text>
      </View>
    )
  ) : null;

  const body = (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktopWeb ? styles.desktopContent : null]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPlans(true)} tintColor="#FFFFFF" />} showsVerticalScrollIndicator={false}>
      {!isDesktopWeb ? (
        <>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heading}>Plans</Text>
          <Text style={styles.subheading}>Create your offers, adjust pricing, and control which plans stay live for members.</Text>
        </>
      ) : null}

      {errorMessage ? <View style={styles.inlineErrorCard}><Text style={styles.inlineErrorText}>{errorMessage}</Text></View> : null}

      <TextInput placeholder="Search by plan name, summary, feature, or currency" placeholderTextColor="#888" value={search} onChangeText={setSearch} style={styles.searchInput} />

      <View style={styles.filterRow}>
        {(['all', 'live', 'recommended', 'archived'] as PlanFilter[]).map(value => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value ? styles.filterChipSelected : null]}>
            <Text style={[styles.filterChipText, filter === value ? styles.filterChipTextSelected : null]}>{value === 'all' ? 'All Plans' : value === 'live' ? 'Live' : value === 'recommended' ? 'Recommended' : 'Archived'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{filteredPlans.length} plans shown</Text>
        <Text style={styles.summaryText}>{plans.filter(plan => plan.is_archived !== true && plan.is_active !== false && plan.is_visible !== false).length} live plans and {plans.filter(plan => plan.is_archived !== true && plan.is_recommended === true).length} recommended offers across the platform.</Text>
      </View>

      {canManagePlans ? (
        <View style={styles.actionRow}>
          <Pressable onPress={openCreateEditor} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create New Plan</Text>
          </Pressable>
          {editorMode ? (
            <Pressable onPress={closeEditor} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Close Editor</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.pageLayout, splitLayout ? styles.pageLayoutWide : null]}>
        <View style={[styles.listColumn, splitLayout ? styles.listColumnWide : null]}>
          {filteredPlans.map((plan, index) => (
            <View key={plan.id} style={styles.card}>
              <Text style={styles.cardTitle}>{planName(plan, index)}</Text>
              <Text style={styles.priceText}>{formatMoney(plan)} / {intervalLabel(plan.billing_interval)}</Text>
              <Text style={styles.cardText}>{plan.description?.trim() || 'No plan summary yet.'}</Text>
              <Text style={styles.metaText}>{countOf(plan.member_count)} members on this plan</Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}><Text style={styles.pillText}>Tours: {typeof plan.tour_limit === 'number' ? plan.tour_limit : 'Unlimited'}</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Scenes: {typeof plan.scene_limit === 'number' ? plan.scene_limit : 'Unlimited'}</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Storage: {typeof plan.storage_limit_mb === 'number' ? `${plan.storage_limit_mb} MB` : 'Flexible'}</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Share Links: {typeof plan.share_link_limit === 'number' ? plan.share_link_limit : 'Flexible'}</Text></View>
                <View style={styles.pill}><Text style={styles.pillText}>Embeds: {typeof plan.embed_limit === 'number' ? plan.embed_limit : 'Flexible'}</Text></View>
              </View>
              <View style={styles.pillRow}>
                {plan.is_recommended ? <View style={[styles.pill, styles.goldPill]}><Text style={styles.goldPillText}>Recommended</Text></View> : null}
                {plan.is_archived ? <View style={styles.pill}><Text style={styles.pillText}>Archived</Text></View> : null}
                {!plan.is_archived && plan.is_active === false ? <View style={styles.pill}><Text style={styles.pillText}>Paused</Text></View> : null}
                {!plan.is_archived && plan.is_visible === false ? <View style={styles.pill}><Text style={styles.pillText}>Hidden</Text></View> : null}
              </View>
              {featuresOf(plan).length > 0 ? (
                <View style={styles.featureRow}>
                  {featuresOf(plan).slice(0, 5).map(feature => (
                    <View key={`${plan.id}-${feature}`} style={styles.featurePill}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {canManagePlans ? (
                <View style={styles.actionRow}>
                  <Pressable onPress={() => openEditEditor(plan)} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Manage Plan</Text>
                  </Pressable>
                  <Pressable onPress={() => handleArchiveToggle(plan, index)} disabled={archivingId === plan.id} style={[styles.secondaryButton, archivingId === plan.id ? styles.buttonDisabled : null]}>
                    {archivingId === plan.id ? <ActivityIndicator color="#C9A84C" /> : <Text style={styles.secondaryButtonText}>{plan.is_archived ? 'Restore' : 'Archive'}</Text>}
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {splitLayout && editorCard ? <View style={[styles.editorColumn, styles.editorColumnWide]}>{editorCard}</View> : null}
      </View>

      {!splitLayout && editorCard ? <View style={styles.editorStack}>{editorCard}</View> : null}
    </ScrollView>
  );

  if (loading) {
    if (isDesktopWeb) {
      return <AdminDesktopFrame access={access} activeRoute="/admin-plans" eyebrow="Plans" title="Plans" description="Create your offers, adjust pricing, and control which plans stay live for members."><View style={styles.centerWrap}><ActivityIndicator size="large" color="#C9A84C" /><Text style={styles.loadingText}>Loading plans...</Text></View></AdminDesktopFrame>;
    }
    return <SafeAreaView style={styles.safeArea}><View style={styles.centerWrap}><ActivityIndicator size="large" color="#C9A84C" /><Text style={styles.loadingText}>Loading plans...</Text></View></SafeAreaView>;
  }

  if (errorMessage && plans.length === 0) {
    const errorBody = <View style={styles.centerWrap}><View style={styles.messageCard}><Text style={styles.messageTitle}>Plans unavailable</Text><Text style={styles.messageText}>{errorMessage}</Text><Pressable onPress={() => router.back()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Go Back</Text></Pressable></View></View>;
    if (isDesktopWeb) {
      return <AdminDesktopFrame access={access} activeRoute="/admin-plans" eyebrow="Plans" title="Plans" description="Create your offers, adjust pricing, and control which plans stay live for members.">{errorBody}</AdminDesktopFrame>;
    }
    return <SafeAreaView style={styles.safeArea}>{errorBody}</SafeAreaView>;
  }

  if (isDesktopWeb) {
    return <AdminDesktopFrame access={access} activeRoute="/admin-plans" eyebrow="Plans" title="Plans" description="Create your offers, adjust pricing, and control which plans stay live for members." headerAction={<Pressable onPress={() => loadPlans(true)} style={styles.headerActionButton}><Text style={styles.headerActionButtonText}>Refresh Plans</Text></Pressable>}>{body}</AdminDesktopFrame>;
  }

  return <SafeAreaView style={styles.safeArea}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D0407' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  desktopContent: { paddingHorizontal: 28, paddingVertical: 28 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.16)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 18 },
  backButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heading: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginBottom: 8 },
  subheading: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  searchInput: { backgroundColor: '#1A0509', color: '#FFFFFF', padding: 15, borderRadius: 14, marginBottom: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  filterChip: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  filterChipSelected: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  filterChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  filterChipTextSelected: { color: '#0D0407' },
  summaryCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 16, marginBottom: 16 },
  summaryTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summaryText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 18 },
  messageCard: { width: '100%', maxWidth: 520, backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 18 },
  messageTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  messageText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  inlineErrorCard: { backgroundColor: '#2A0A10', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, marginBottom: 14 },
  inlineErrorText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18 },
  pageLayout: { gap: 16 },
  pageLayoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  listColumn: { gap: 12 },
  listColumnWide: { flex: 1.04 },
  editorColumn: { gap: 12 },
  editorColumnWide: { flex: 0.96 },
  card: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  priceText: { color: '#C9A84C', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  cardText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  metaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  goldPill: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  goldPillText: { color: '#0D0407', fontSize: 12, fontWeight: '800' },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  featurePill: { backgroundColor: '#2A0A10', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  featureText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  editorStack: { marginTop: 10 },
  editorCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.22)', borderRadius: 20, padding: 18 },
  editorLabel: { color: '#C9A84C', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  editorTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  editorText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  fieldLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, color: '#FFFFFF', marginBottom: 14 },
  textArea: { minHeight: 96 },
  textAreaLarge: { minHeight: 130 },
  fieldGrid: { flexDirection: 'row', gap: 12 },
  fieldGridItem: { flex: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  optionChipSelected: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  optionChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  optionChipTextSelected: { color: '#0D0407' },
  placeholderCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.14)', borderRadius: 20, padding: 18 },
  placeholderTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  placeholderText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 19 },
  primaryButton: { flex: 1, backgroundColor: '#C9A84C', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#0D0407', fontSize: 15, fontWeight: '800' },
  secondaryButton: { flex: 1, backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#C9A84C', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.7 },
  headerActionButton: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14 },
  headerActionButtonText: { color: '#C9A84C', fontSize: 14, fontWeight: '800' },
});
