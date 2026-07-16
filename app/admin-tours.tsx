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
import { deleteAdminTour } from '../lib/admin/deleteTour';
import { getAdminSession } from '../lib/admin/getAdminSession';
import { getAllTours } from '../lib/admin/getAllTours';
import type { AdminTourListItem } from '../lib/admin/types';

type TourFilter = 'all' | 'recent' | 'multi';

function formatTourTitle(tour: AdminTourListItem, index: number) {
  return tour.title?.trim() || `Untitled Tour ${index + 1}`;
}

function formatTourLocation(tour: AdminTourListItem) {
  return tour.location?.trim() || 'No location';
}

function formatOwnerName(tour: AdminTourListItem) {
  return tour.owner_full_name?.trim() || null;
}

function formatOwnerEmail(tour: AdminTourListItem) {
  return tour.owner_email?.trim() || null;
}

function getSceneCount(tour: AdminTourListItem) {
  if (Array.isArray(tour.nodes) && tour.nodes.length > 0) {
    return tour.nodes.length;
  }
  if (typeof tour.scenes === 'number' && Number.isFinite(tour.scenes)) {
    return tour.scenes;
  }
  return 0;
}

function formatCreatedAt(value: string | null) {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export default function AdminToursScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web';
  const twoColumnGrid = isDesktopWeb && width >= 1220;

  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [tours, setTours] = useState<AdminTourListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TourFilter>('all');

  useEffect(() => {
    void loadTours();
  }, []);

  const loadTours = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage('');
    try {
      const session = await getAdminSession('tours.read');
      const nextTours = await getAllTours();
      setAccess(session.access);
      setTours(nextTours);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not load tours.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const filteredTours = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tours.filter((tour, index) => {
      const sceneCount = getSceneCount(tour);
      if (filter === 'recent' && index > 9) return false;
      if (filter === 'multi' && sceneCount < 2) return false;
      if (!query) return true;
      return (
        formatTourTitle(tour, index).toLowerCase().includes(query) ||
        formatTourLocation(tour).toLowerCase().includes(query) ||
        (formatOwnerName(tour) || '').toLowerCase().includes(query) ||
        (formatOwnerEmail(tour) || '').toLowerCase().includes(query) ||
        (tour.user_id || '').toLowerCase().includes(query)
      );
    });
  }, [filter, search, tours]);

  const canManageTours = access ? hasAdminPermission(access, 'tours.manage') : false;

  const handleDeleteTour = (tour: AdminTourListItem, index: number) => {
    const tourTitle = formatTourTitle(tour, index);
    Alert.alert('Delete Tour', `Are you sure you want to delete "${tourTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(tour.id);
            await deleteAdminTour({ tourId: tour.id, nodes: tour.nodes });
            setTours(prev => prev.filter(item => item.id !== tour.id));
          } catch (error: any) {
            setErrorMessage(error?.message || 'Could not delete this tour.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const body = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktopWeb ? styles.desktopContent : null]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTours(true)} tintColor="#FFFFFF" />}
      showsVerticalScrollIndicator={false}
    >
      {!isDesktopWeb ? (
        <>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heading}>Tours</Text>
          <Text style={styles.subheading}>Review tours across the platform, open them quickly, edit them, or remove the ones that need cleanup.</Text>
        </>
      ) : null}

      {errorMessage ? <View style={styles.inlineErrorCard}><Text style={styles.inlineErrorText}>{errorMessage}</Text></View> : null}

      <TextInput placeholder="Search by title, location, name, email, or owner ID" placeholderTextColor="#888" value={search} onChangeText={setSearch} style={styles.searchInput} />

      <View style={styles.filterRow}>
        {(['all', 'recent', 'multi'] as TourFilter[]).map(value => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filterChip, filter === value ? styles.filterChipSelected : null]}>
            <Text style={[styles.filterChipText, filter === value ? styles.filterChipTextSelected : null]}>{value === 'all' ? 'All Tours' : value === 'recent' ? 'Recent' : '2+ Scenes'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{filteredTours.length} tours shown</Text>
        <Text style={styles.summaryText}>{tours.length} total tour{tours.length === 1 ? '' : 's'} currently in the platform.</Text>
      </View>

      <View style={[styles.grid, twoColumnGrid ? styles.gridWide : null]}>
        {filteredTours.map((tour, index) => {
          const isDeleting = deletingId === tour.id;
          const sceneCount = getSceneCount(tour);
          const ownerName = formatOwnerName(tour);
          const ownerEmail = formatOwnerEmail(tour);
          return (
            <View key={tour.id} style={[styles.tourCard, twoColumnGrid ? styles.tourCardWide : null]}>
              <Text style={styles.tourTitle}>{formatTourTitle(tour, index)}</Text>
              <Text style={styles.tourMeta}>{formatTourLocation(tour)} - {sceneCount} scene{sceneCount === 1 ? '' : 's'}</Text>
              {ownerName ? <Text style={styles.tourOwnerName}>{ownerName}</Text> : null}
              {ownerEmail ? <Text style={styles.tourOwnerEmail}>{ownerEmail}</Text> : null}
              <Text style={styles.tourOwner}>Owner ID: {tour.user_id || 'Unknown'}</Text>
              <Text style={styles.tourDate}>Created {formatCreatedAt(tour.created_at)}</Text>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => router.push({ pathname: '/tour/[id]', params: { id: tour.id } })} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Open</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/edit-tour/[id]', params: { id: tour.id } })} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
              </View>

              {canManageTours ? (
                <Pressable onPress={() => handleDeleteTour(tour, index)} disabled={isDeleting} style={[styles.deleteButton, isDeleting ? styles.buttonDisabled : null]}>
                  {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteButtonText}>Delete Tour</Text>}
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  if (loading) {
    if (isDesktopWeb) {
      return (
        <AdminDesktopFrame access={access} activeRoute="/admin-tours" eyebrow="Tours" title="Tours" description="Review tours across the platform, open them quickly, edit them, or remove the ones that need cleanup.">
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#C9A84C" />
            <Text style={styles.loadingText}>Loading tours...</Text>
          </View>
        </AdminDesktopFrame>
      );
    }
    return <SafeAreaView style={styles.safeArea}><View style={styles.centerWrap}><ActivityIndicator size="large" color="#C9A84C" /><Text style={styles.loadingText}>Loading tours...</Text></View></SafeAreaView>;
  }

  if (errorMessage && tours.length === 0) {
    const errorBody = (
      <View style={styles.centerWrap}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Tours unavailable</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
    if (isDesktopWeb) {
      return <AdminDesktopFrame access={access} activeRoute="/admin-tours" eyebrow="Tours" title="Tours" description="Review tours across the platform, open them quickly, edit them, or remove the ones that need cleanup.">{errorBody}</AdminDesktopFrame>;
    }
    return <SafeAreaView style={styles.safeArea}>{errorBody}</SafeAreaView>;
  }

  if (isDesktopWeb) {
    return (
      <AdminDesktopFrame access={access} activeRoute="/admin-tours" eyebrow="Tours" title="Tours" description="Review tours across the platform, open them quickly, edit them, or remove the ones that need cleanup." headerAction={<Pressable onPress={() => loadTours(true)} style={styles.headerActionButton}><Text style={styles.headerActionButtonText}>Refresh Tours</Text></Pressable>}>
        {body}
      </AdminDesktopFrame>
    );
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
  inlineErrorCard: { backgroundColor: '#2A0A10', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, marginBottom: 14 },
  inlineErrorText: { color: '#FFFFFF', fontSize: 13, lineHeight: 18 },
  errorCard: { width: '100%', maxWidth: 520, backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 18 },
  errorTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  errorText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  grid: { gap: 12 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  tourCard: { backgroundColor: '#1A0509', borderWidth: 1, borderColor: 'rgba(201,168,76,0.18)', borderRadius: 18, padding: 16 },
  tourCardWide: { width: '49.1%' },
  tourTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  tourMeta: { color: 'rgba(255,255,255,0.58)', fontSize: 13, marginBottom: 6 },
  tourOwnerName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tourOwnerEmail: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 6 },
  tourOwner: { color: '#C9A84C', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  tourDate: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  primaryButton: { flex: 1, backgroundColor: '#C9A84C', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#0D0407', fontSize: 15, fontWeight: '800' },
  secondaryButton: { flex: 1, backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#C9A84C', fontSize: 15, fontWeight: '800' },
  deleteButton: { backgroundColor: '#2A0A10', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.7 },
  headerActionButton: { backgroundColor: '#120408', borderWidth: 1, borderColor: 'rgba(201,168,76,0.28)', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14 },
  headerActionButtonText: { color: '#C9A84C', fontSize: 14, fontWeight: '800' },
});
