import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../../lib/supabase';

type TourRow = {
  id: string;
  title: string | null;
  location: string | null;
  nodes: unknown;
  scenes: number | null;
  created_at: string | null;
};

function getSceneCount(tour: TourRow) {
  if (Array.isArray(tour.nodes) && tour.nodes.length > 0) {
    return tour.nodes.length;
  }

  if (typeof tour.scenes === 'number' && Number.isFinite(tour.scenes)) {
    return tour.scenes;
  }

  return 0;
}

function formatLocation(location: string | null) {
  if (typeof location === 'string' && location.trim()) {
    return location.trim();
  }

  return 'No location';
}

function formatTitle(tour: TourRow, index: number) {
  if (typeof tour.title === 'string' && tour.title.trim()) {
    return tour.title.trim();
  }

  return `Untitled Tour ${index + 1}`;
}

function formatCreatedAt(value: string | null) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1180;
  const isTwoColumn = Platform.OS === 'web' && width >= 860;

  const [tours, setTours] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      .select('id, title, location, nodes, scenes, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message || 'Could not load tours.');
      setTours([]);
    } else {
      setTours((data as TourRow[]) || []);
    }

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getTours();
  }, [getTours]);

  const summary = useMemo(() => {
    const totalTours = tours.length;
    const totalScenes = tours.reduce((count, tour) => count + getSceneCount(tour), 0);
    const latestTour = tours[0] || null;

    return {
      totalTours,
      totalScenes,
      latestDate: formatCreatedAt(latestTour?.created_at || null),
    };
  }, [tours]);

  const deleteTour = async (tour: TourRow, index: number) => {
    const tourTitle = formatTitle(tour, index);

    Alert.alert('Delete Tour', `Are you sure you want to delete "${tourTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(tour.id);

            const nodeList = Array.isArray(tour.nodes) ? tour.nodes : [];
            const paths = nodeList
              .flatMap((node: any) => [
                ...(typeof node?.imagePath === 'string' ? [node.imagePath] : []),
                ...(typeof node?.previewPath === 'string' ? [node.previewPath] : []),
              ])
              .filter(Boolean) as string[];

            const { error: deleteTourError } = await supabase
              .from('tours')
              .delete()
              .eq('id', tour.id);

            if (deleteTourError) {
              throw new Error(deleteTourError.message || 'Could not delete this tour.');
            }

            if (paths.length > 0) {
              await supabase.storage.from('tour-panoramas').remove(paths);
            }

            setTours(prev => prev.filter(item => item.id !== tour.id));
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message || 'Could not delete this tour.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

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
        <View style={[styles.headerRow, isDesktop ? styles.headerRowDesktop : null]}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>Explore Tours</Text>
            <Text style={styles.subheading}>
              Browse your tours, open any one instantly, or remove the ones you no longer need.
            </Text>
          </View>

          <Pressable onPress={() => router.push('/create-tour')} style={styles.createButton}>
            <Text style={styles.createButtonText}>Create New Tour</Text>
          </Pressable>
        </View>

        <View style={[styles.summaryRow, isDesktop ? styles.summaryRowDesktop : null]}>
          <View style={[styles.summaryCard, isDesktop ? styles.summaryHero : null]}>
            <Text style={styles.summaryLabel}>Library</Text>
            <Text style={styles.summaryTitle}>
              {summary.totalTours > 0
                ? `${summary.totalTours} tour${summary.totalTours === 1 ? '' : 's'} in your library`
                : 'Start building your library'}
            </Text>
            <Text style={styles.summaryText}>
              {summary.totalTours > 0
                ? `Your most recent addition was saved on ${summary.latestDate}.`
                : 'Once you create a tour, it will appear here automatically.'}
            </Text>
          </View>

          <View style={[styles.summaryMiniGrid, isDesktop ? styles.summaryMiniGridDesktop : null]}>
            <View style={styles.summaryMiniCard}>
              <Text style={styles.summaryMiniLabel}>Tours</Text>
              <Text style={styles.summaryMiniValue}>{summary.totalTours}</Text>
            </View>

            <View style={styles.summaryMiniCard}>
              <Text style={styles.summaryMiniLabel}>Scenes</Text>
              <Text style={styles.summaryMiniValue}>{summary.totalScenes}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading tours...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Could not load tours</Text>
            <Text style={styles.messageText}>{error}</Text>

            <Pressable onPress={() => getTours()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : tours.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>No tours found</Text>
            <Text style={styles.messageText}>
              Create a tour first, then it will appear here automatically.
            </Text>
          </View>
        ) : (
          <View style={[styles.grid, isTwoColumn ? styles.gridDesktop : null]}>
            {tours.map((tour, index) => {
              const sceneCount = getSceneCount(tour);
              const isDeleting = deletingId === tour.id;

              return (
                <View key={tour.id} style={[styles.card, isTwoColumn ? styles.cardDesktop : null]}>
                  <Pressable
                    onPress={() => {
                      if (isDeleting) return;

                      router.push({
                        pathname: '/tour/[id]',
                        params: { id: tour.id },
                      });
                    }}
                    style={({ pressed }) => [styles.openArea, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.preview}>
                      <Text style={styles.previewText}>Open Tour</Text>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{formatTitle(tour, index)}</Text>

                      <Text style={styles.cardMeta}>
                        {formatLocation(tour.location)} - {sceneCount} scene{sceneCount === 1 ? '' : 's'}
                      </Text>

                      <Text style={styles.cardDate}>Created {formatCreatedAt(tour.created_at)}</Text>
                    </View>
                  </Pressable>

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => {
                        if (isDeleting) return;

                        router.push({
                          pathname: '/tour/[id]',
                          params: { id: tour.id },
                        });
                      }}
                      style={({ pressed }) => [styles.openButton, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.openButtonText}>Open</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        if (isDeleting) return;

                        router.push({
                          pathname: '/edit-tour/[id]',
                          params: { id: tour.id },
                        });
                      }}
                      style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => deleteTour(tour, index)}
                      disabled={isDeleting}
                      style={[
                        styles.deleteButton,
                        isDeleting ? styles.buttonDisabled : null,
                      ]}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
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
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  contentDesktop: {
    padding: 28,
  },
  headerRow: {
    gap: 14,
    marginBottom: 22,
  },
  headerRowDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheading: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 720,
  },
  createButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#0D0407',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryRow: {
    gap: 14,
    marginBottom: 22,
  },
  summaryRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 22,
    padding: 20,
  },
  summaryHero: {
    flex: 1.45,
  },
  summaryLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 14,
    lineHeight: 21,
  },
  summaryMiniGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryMiniGridDesktop: {
    width: 320,
  },
  summaryMiniCard: {
    flex: 1,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 16,
  },
  summaryMiniLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryMiniValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  centerBlock: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  messageCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 18,
  },
  messageTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  messageText: {
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#C9A84C',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#0D0407',
    fontWeight: '800',
    fontSize: 14,
  },
  grid: {
    gap: 16,
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardDesktop: {
    width: '48.9%',
  },
  openArea: {
    overflow: 'hidden',
  },
  preview: {
    height: 180,
    backgroundColor: '#2A0A10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
    fontSize: 16,
  },
  cardBody: {
    padding: 18,
    paddingBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginBottom: 10,
  },
  cardDate: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
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
    fontWeight: '800',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#2A0A10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.9,
  },
});
