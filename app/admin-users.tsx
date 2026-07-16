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
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminDesktopFrame from '../components/AdminDesktopFrame';
import {
  hasAdminPermission,
  type AdminAccess,
  type AdminPermission,
  type AdminRole,
} from '../lib/adminAccess';
import { getAllPlans } from '../lib/admin/getAllPlans';
import { getAllProfiles } from '../lib/admin/getAllProfiles';
import { getAdminSession } from '../lib/admin/getAdminSession';
import { saveUserSubscription } from '../lib/admin/saveUserSubscription';
import { saveAdminAccess } from '../lib/admin/toggleAdminStatus';
import type {
  AdminPlanListItem,
  AdminProfileListItem,
  AdminSubscriptionStatus,
} from '../lib/admin/types';

type MemberFilter = 'all' | 'admins' | 'members';
type AccessEditorState = { isAdmin: boolean; role: AdminRole | 'custom'; customPermissions: AdminPermission[] };
type PlanEditorState = { planId: string | null; status: AdminSubscriptionStatus };

const ROLE_OPTIONS: Array<{ value: AdminRole | 'custom'; label: string }> = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'user_admin', label: 'User Admin' },
  { value: 'subscription_admin', label: 'Subscription Admin' },
  { value: 'analytics_admin', label: 'Analytics Admin' },
  { value: 'custom', label: 'Custom Access' },
];

const CUSTOM_PERMISSION_OPTIONS: Array<{ value: AdminPermission; label: string }> = [
  { value: 'overview.read', label: 'Overview' },
  { value: 'users.read', label: 'Members' },
  { value: 'users.manage', label: 'Member Actions' },
  { value: 'tours.read', label: 'Tours' },
  { value: 'tours.manage', label: 'Tour Actions' },
  { value: 'plans.read', label: 'Plans' },
  { value: 'plans.manage', label: 'Plan Actions' },
  { value: 'analytics.read', label: 'Analytics' },
  { value: 'admins.manage', label: 'Admin Access' },
];

const STATUS_OPTIONS: Array<{ value: AdminSubscriptionStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trial' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'expired', label: 'Expired' },
];

function memberName(profile: AdminProfileListItem) {
  return profile.full_name?.trim() || `Member ${profile.id.slice(0, 6)}`;
}

function memberEmail(profile: AdminProfileListItem) {
  return profile.email?.trim() || null;
}

function roleLabel(profile: AdminProfileListItem) {
  if (!profile.is_admin) return 'Member';
  if (profile.admin_role === 'super_admin') return 'Super Admin';
  if (profile.admin_role === 'user_admin') return 'User Admin';
  if (profile.admin_role === 'subscription_admin') return 'Subscription Admin';
  if (profile.admin_role === 'analytics_admin') return 'Analytics Admin';
  if (profile.admin_role === 'custom') return 'Custom Access';
  return 'Admin';
}

function planName(profile: AdminProfileListItem) {
  return profile.current_plan_name?.trim() || null;
}

function planSourceText(profile: AdminProfileListItem) {
  if (profile.current_plan_source === 'assigned') return 'Direct plan';
  if (profile.current_plan_source === 'default') return 'Default live plan';
  return 'No live plan';
}

function subscriptionLabel(value: string | null | undefined) {
  if (value === 'trialing') return 'Trial';
  if (value === 'past_due') return 'Past Due';
  if (value === 'canceled') return 'Canceled';
  if (value === 'expired') return 'Expired';
  if (value === 'active') return 'Active';
  return null;
}

function normalizeStatus(value: string | null | undefined): AdminSubscriptionStatus {
  if (value === 'trialing') return 'trialing';
  if (value === 'past_due') return 'past_due';
  if (value === 'canceled') return 'canceled';
  if (value === 'expired') return 'expired';
  return 'active';
}

function createAccessEditorState(profile: AdminProfileListItem): AccessEditorState {
  return {
    isAdmin: profile.is_admin === true,
    role: profile.is_admin && profile.admin_role ? ((profile.admin_role as AdminRole | 'custom') ?? 'custom') : 'user_admin',
    customPermissions: Array.isArray(profile.admin_permissions) ? (profile.admin_permissions as AdminPermission[]) : [],
  };
}

function createPlanEditorState(profile: AdminProfileListItem): PlanEditorState {
  return { planId: profile.assigned_plan_id || profile.current_plan_id || null, status: normalizeStatus(profile.subscription_status) };
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web';
  const splitLayout = isDesktopWeb && width >= 1240;
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [profiles, setProfiles] = useState<AdminProfileListItem[]>([]);
  const [plans, setPlans] = useState<AdminPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [planErrorMessage, setPlanErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [accessEditor, setAccessEditor] = useState<AccessEditorState | null>(null);
  const [planEditor, setPlanEditor] = useState<PlanEditorState | null>(null);
  const canManageAdmins = access ? hasAdminPermission(access, 'admins.manage') : false;
  const canReadPlans = access ? hasAdminPermission(access, 'plans.read') : false;
  const canManagePlans = access ? hasAdminPermission(access, 'plans.manage') : false;
  const canOpenEditor = canManageAdmins || canReadPlans || canManagePlans;

  useEffect(() => {
    void loadScreen();
  }, []);

  const loadScreen = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');
    setPlanErrorMessage('');
    try {
      const session = await getAdminSession('users.read');
      const nextProfiles = await getAllProfiles();
      let nextPlans: AdminPlanListItem[] = [];
      if (hasAdminPermission(session.access, 'plans.read')) {
        try {
          nextPlans = await getAllPlans();
        } catch (error: any) {
          setPlanErrorMessage(error?.message || 'Could not load plans for member assignment.');
        }
      }
      setAccess(session.access);
      setCurrentUserId(session.user.id);
      setProfiles(nextProfiles);
      setPlans(nextPlans);
      if (selectedProfileId) {
        const nextSelected = nextProfiles.find(profile => profile.id === selectedProfileId);
        if (nextSelected) {
          setAccessEditor(createAccessEditorState(nextSelected));
          setPlanEditor(createPlanEditorState(nextSelected));
        }
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load members.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const selectedProfile = useMemo(() => profiles.find(profile => profile.id === selectedProfileId) || null, [profiles, selectedProfileId]);
  const availablePlans = useMemo(() => plans.filter(plan => plan.is_archived !== true && plan.is_active !== false), [plans]);
  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter(profile => {
        if (filter === 'admins') return profile.is_admin === true;
        if (filter === 'members') return profile.is_admin !== true;
        return true;
      })
      .filter(profile => {
        if (!query) return true;
        return memberName(profile).toLowerCase().includes(query) || (memberEmail(profile) || '').toLowerCase().includes(query) || profile.id.toLowerCase().includes(query) || (planName(profile) || '').toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if ((a.is_admin === true) !== (b.is_admin === true)) return a.is_admin ? -1 : 1;
        return memberName(a).localeCompare(memberName(b));
      });
  }, [filter, profiles, search]);

  const openEditor = (profile: AdminProfileListItem) => {
    setSelectedProfileId(profile.id);
    setAccessEditor(createAccessEditorState(profile));
    setPlanEditor(createPlanEditorState(profile));
    setPlanErrorMessage('');
  };

  const togglePermission = (permission: AdminPermission) => {
    setAccessEditor(current => current ? {
      ...current,
      customPermissions: current.customPermissions.includes(permission)
        ? current.customPermissions.filter(item => item !== permission)
        : [...current.customPermissions, permission],
    } : current);
  };

  const handleSaveAccess = async () => {
    if (!selectedProfile || !accessEditor) return;
    setSavingAccess(true);
    try {
      await saveAdminAccess({
        profileId: selectedProfile.id,
        isAdmin: accessEditor.isAdmin,
        role: accessEditor.role,
        customPermissions: accessEditor.customPermissions,
      });
      await loadScreen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not save admin access.');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedProfile || !planEditor?.planId) return;
    setSavingPlan(true);
    setPlanErrorMessage('');
    try {
      await saveUserSubscription({
        userId: selectedProfile.id,
        planId: planEditor.planId,
        status: planEditor.status,
      });
      await loadScreen(true);
    } catch (error: any) {
      setPlanErrorMessage(error?.message || 'Could not save this member plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleUseDefaultPlan = async () => {
    if (!selectedProfile) return;
    setSavingPlan(true);
    setPlanErrorMessage('');
    try {
      await saveUserSubscription({
        userId: selectedProfile.id,
        planId: null,
        status: 'active',
      });
      await loadScreen(true);
    } catch (error: any) {
      setPlanErrorMessage(error?.message || 'Could not switch this member back to the default plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const memberEditor = selectedProfile ? (
    <View style={styles.editorCard}>
      <Text style={styles.sectionLabel}>Member Controls</Text>
      <Text style={styles.editorTitle}>{memberName(selectedProfile)}</Text>
      <Text style={styles.editorText}>
        Use this panel to lock access and place the member on the exact plan you want to test.
      </Text>

      {canManageAdmins && accessEditor ? (
        <>
          <Text style={styles.blockLabel}>Admin Access</Text>
          <View style={styles.rowWrap}>
            <Pressable onPress={() => setAccessEditor(current => current ? { ...current, isAdmin: false } : current)} style={[styles.chip, !accessEditor.isAdmin ? styles.chipSelected : null]}>
              <Text style={[styles.chipText, !accessEditor.isAdmin ? styles.chipTextSelected : null]}>Member</Text>
            </Pressable>
            <Pressable onPress={() => setAccessEditor(current => current ? { ...current, isAdmin: true } : current)} style={[styles.chip, accessEditor.isAdmin ? styles.chipSelected : null]}>
              <Text style={[styles.chipText, accessEditor.isAdmin ? styles.chipTextSelected : null]}>Admin</Text>
            </Pressable>
          </View>

          {accessEditor.isAdmin ? (
            <>
              <View style={styles.rowWrap}>
                {ROLE_OPTIONS.map(option => (
                  <Pressable key={option.value} onPress={() => setAccessEditor(current => current ? { ...current, role: option.value } : current)} style={[styles.chip, accessEditor.role === option.value ? styles.chipSelected : null]}>
                    <Text style={[styles.chipText, accessEditor.role === option.value ? styles.chipTextSelected : null]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              {accessEditor.role === 'custom' ? (
                <View style={styles.rowWrap}>
                  {CUSTOM_PERMISSION_OPTIONS.map(option => (
                    <Pressable key={option.value} onPress={() => togglePermission(option.value)} style={[styles.chip, accessEditor.customPermissions.includes(option.value) ? styles.chipSelected : null]}>
                      <Text style={[styles.chipText, accessEditor.customPermissions.includes(option.value) ? styles.chipTextSelected : null]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {selectedProfile.id === currentUserId ? (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>Your own admin access stays locked here for safety.</Text>
            </View>
          ) : null}

          <Pressable onPress={handleSaveAccess} disabled={savingAccess || selectedProfile.id === currentUserId} style={[styles.primaryButton, savingAccess || selectedProfile.id === currentUserId ? styles.buttonDisabled : null]}>
            {savingAccess ? <ActivityIndicator color="#0D0407" /> : <Text style={styles.primaryButtonText}>Save Access</Text>}
          </Pressable>
        </>
      ) : null}

      {(canReadPlans || canManagePlans) && planEditor ? (
        <>
          <Text style={styles.blockLabel}>Member Plan</Text>
          <View style={styles.planBox}>
            <Text style={styles.planTitle}>{planName(selectedProfile) || 'No live plan'}</Text>
            <Text style={styles.planText}>{planSourceText(selectedProfile)}</Text>
            {subscriptionLabel(selectedProfile.subscription_status) ? <Text style={styles.planMeta}>Status: {subscriptionLabel(selectedProfile.subscription_status)}</Text> : null}
          </View>

          {planErrorMessage ? <View style={styles.messageCard}><Text style={styles.messageText}>{planErrorMessage}</Text></View> : null}

          {canReadPlans ? (
            <View style={styles.rowWrap}>
              {availablePlans.map(plan => (
                <Pressable key={plan.id} onPress={() => setPlanEditor(current => current ? { ...current, planId: plan.id } : current)} style={[styles.chip, planEditor.planId === plan.id ? styles.chipSelected : null]}>
                  <Text style={[styles.chipText, planEditor.planId === plan.id ? styles.chipTextSelected : null]}>{plan.name?.trim() || 'Untitled Plan'}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>This admin account needs plan reading access before plan options can be shown here.</Text>
            </View>
          )}

          {canManagePlans ? (
            <>
              <View style={styles.rowWrap}>
                {STATUS_OPTIONS.map(option => (
                  <Pressable key={option.value} onPress={() => setPlanEditor(current => current ? { ...current, status: option.value } : current)} style={[styles.chip, planEditor.status === option.value ? styles.chipSelected : null]}>
                    <Text style={[styles.chipText, planEditor.status === option.value ? styles.chipTextSelected : null]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={handleSavePlan} disabled={savingPlan || !planEditor.planId || !canReadPlans} style={[styles.primaryButton, savingPlan || !planEditor.planId || !canReadPlans ? styles.buttonDisabled : null]}>
                {savingPlan ? <ActivityIndicator color="#0D0407" /> : <Text style={styles.primaryButtonText}>Save Member Plan</Text>}
              </Pressable>

              <Pressable onPress={handleUseDefaultPlan} disabled={savingPlan || selectedProfile.assigned_plan_id == null} style={[styles.secondaryButton, savingPlan || selectedProfile.assigned_plan_id == null ? styles.buttonDisabled : null]}>
                <Text style={styles.secondaryButtonText}>Use Default Plan</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
    </View>
  ) : (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>Choose a member</Text>
      <Text style={styles.placeholderText}>Select any member from the list to manage admin access or place them on a test plan.</Text>
    </View>
  );

  const screenContent = (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktopWeb ? styles.desktopContent : null]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadScreen(true)} tintColor="#FFFFFF" />} showsVerticalScrollIndicator={false}>
      {!isDesktopWeb ? (
        <>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heading}>Members</Text>
          <Text style={styles.subheading}>Search your people, review current access, and control which plan a member uses.</Text>
        </>
      ) : null}

      {errorMessage ? <View style={styles.messageCard}><Text style={styles.messageText}>{errorMessage}</Text></View> : null}

      <TextInput placeholder="Search by name, email, member ID, or current plan" placeholderTextColor="#888" value={search} onChangeText={setSearch} style={styles.searchInput} />

      <View style={styles.rowWrap}>
        {(['all', 'admins', 'members'] as MemberFilter[]).map(value => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.chip, filter === value ? styles.chipSelected : null]}>
            <Text style={[styles.chipText, filter === value ? styles.chipTextSelected : null]}>{value === 'all' ? 'All' : value === 'admins' ? 'Admins' : 'Members'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{filteredProfiles.length} members shown</Text>
        <Text style={styles.summaryText}>{profiles.filter(profile => profile.is_admin === true).length} admin{profiles.filter(profile => profile.is_admin === true).length === 1 ? '' : 's'} across the platform.</Text>
      </View>

      <View style={[styles.pageLayout, splitLayout ? styles.pageLayoutWide : null]}>
        <View style={[styles.listColumn, splitLayout ? styles.listColumnWide : null]}>
          {filteredProfiles.map(profile => (
            <View key={profile.id} style={[styles.card, profile.id === selectedProfileId ? styles.cardSelected : null]}>
              <View style={styles.topRow}>
                <View style={styles.flexFill}>
                  <Text style={styles.cardTitle}>{memberName(profile)}</Text>
                  {memberEmail(profile) ? <Text style={styles.cardMeta}>{memberEmail(profile)}</Text> : null}
                  <Text style={styles.memberId}>{profile.id}</Text>
                </View>
                <View style={styles.badge}><Text style={styles.badgeText}>{roleLabel(profile)}</Text></View>
              </View>

              {canReadPlans ? (
                <View style={styles.planBox}>
                  <Text style={styles.planTitle}>{planName(profile) || 'No live plan'}</Text>
                  <Text style={styles.planText}>{planSourceText(profile)}</Text>
                  {subscriptionLabel(profile.subscription_status) ? <Text style={styles.planMeta}>Status: {subscriptionLabel(profile.subscription_status)}</Text> : null}
                </View>
              ) : null}

              {canOpenEditor ? (
                <Pressable onPress={() => openEditor(profile)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Manage Member</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.editorColumn, splitLayout ? styles.editorColumnWide : null]}>{memberEditor}</View>
      </View>
    </ScrollView>
  );

  if (loading) {
    if (isDesktopWeb) {
      return (
        <AdminDesktopFrame access={access} activeRoute="/admin-users" eyebrow="Members" title="Members" description="Search your people, review current access, and control which plan a member uses.">
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#C9A84C" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        </AdminDesktopFrame>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && profiles.length === 0) {
    const errorBody = (
      <View style={styles.centerWrap}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Members unavailable</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );

    if (isDesktopWeb) {
      return (
        <AdminDesktopFrame access={access} activeRoute="/admin-users" eyebrow="Members" title="Members" description="Search your people, review current access, and control which plan a member uses.">
          {errorBody}
        </AdminDesktopFrame>
      );
    }

    return <SafeAreaView style={styles.safeArea}>{errorBody}</SafeAreaView>;
  }

  if (isDesktopWeb) {
    return (
      <AdminDesktopFrame access={access} activeRoute="/admin-users" eyebrow="Members" title="Members" description="Search your people, review current access, and control which plan a member uses." headerAction={<Pressable onPress={() => loadScreen(true)} style={styles.headerActionButton}><Text style={styles.headerActionButtonText}>Refresh Members</Text></Pressable>}>
        {screenContent}
      </AdminDesktopFrame>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{screenContent}</SafeAreaView>;
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
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipSelected: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  chipTextSelected: { color: '#0D0407' },
  summaryCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 16, marginBottom: 16 },
  summaryTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summaryText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 18 },
  pageLayout: { gap: 16 },
  pageLayoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  listColumn: { gap: 12 },
  listColumnWide: { flex: 1.15 },
  editorColumn: { gap: 12 },
  editorColumnWide: { flex: 0.95 },
  card: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 16 },
  cardSelected: { borderColor: '#C9A84C', backgroundColor: '#22070B' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  flexFill: { flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  cardMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4 },
  memberId: { color: 'rgba(255,255,255,0.42)', fontSize: 11 },
  badge: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  badgeText: { color: '#C9A84C', fontSize: 11, fontWeight: '800' },
  planBox: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.16)', borderRadius: 14, padding: 12, marginBottom: 12 },
  planTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  planText: { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 18 },
  planMeta: { color: '#C9A84C', fontSize: 12, fontWeight: '700', marginTop: 6 },
  editorCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.22)', borderRadius: 20, padding: 18 },
  sectionLabel: { color: '#C9A84C', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  editorTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  editorText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  blockLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  messageCard: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, marginBottom: 14 },
  messageText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
  errorCard: { width: '100%', maxWidth: 520, backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 18 },
  errorTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  errorText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  placeholderCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.14)', borderRadius: 20, padding: 18 },
  placeholderTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  placeholderText: { color: 'rgba(255,255,255,0.58)', fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: '#C9A84C', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryButtonText: { color: '#0D0407', fontSize: 15, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  secondaryButtonText: { color: '#C9A84C', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.7 },
  headerActionButton: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14 },
  headerActionButtonText: { color: '#C9A84C', fontSize: 14, fontWeight: '800' },
});
