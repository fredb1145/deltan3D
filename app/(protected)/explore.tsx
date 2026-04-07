import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
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

export default function ExploreScreen() {
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

  const deleteTour = async (tour: TourRow, index: number) => {
    const tourTitle = formatTitle(tour, index);

    Alert.alert(
      'Delete Tour',
      `Are you sure you want to delete "${tourTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(tour.id);

              const nodeList = Array.isArray(tour.nodes) ? tour.nodes : [];
              const paths = nodeList
                .map((node: any) =>
                  typeof node?.imagePath === 'string' ? node.imagePath : null,
                )
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
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => getTours(true)}
            tintColor="#FFFFFF"
          />
        }
      >
        <Text style={styles.heading}>Explore Tours</Text>

        <Text style={styles.subheading}>
          Browse your tours, open any one instantly, or remove the ones you no longer need.
        </Text>

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
          tours.map((tour, index) => {
            const sceneCount = getSceneCount(tour);
            const isDeleting = deletingId === tour.id;

            return (
              <View key={tour.id} style={styles.card}>
                <Pressable
                  onPress={() => {
                    if (isDeleting) return;

                    router.push({
                      pathname: '/tour/[id]',
                      params: { id: tour.id },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.openArea,
                    pressed ? styles.cardPressed : null,
                  ]}
                >
                  <View style={styles.preview}>
                    <Text style={styles.previewText}>Open Tour</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{formatTitle(tour, index)}</Text>

                    <Text style={styles.cardMeta}>
                      {formatLocation(tour.location)} • {sceneCount} scene{sceneCount === 1 ? '' : 's'}
                    </Text>
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
                    style={({ pressed }) => [
                      styles.openButton,
                      pressed ? styles.openButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.openButtonText}>Open</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => deleteTour(tour, index)}
                    disabled={isDeleting}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      isDeleting ? styles.disabledButton : null,
                      pressed ? styles.deleteButtonPressed : null,
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
          })
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
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheading: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginBottom: 24,
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
  card: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  openArea: {
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.9,
  },
  preview: {
    height: 160,
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
    padding: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  openButton: {
    flex: 1,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  openButtonPressed: {
    opacity: 0.9,
  },
  openButtonText: {
    color: '#0D0407',
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
  deleteButtonPressed: {
    opacity: 0.9,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
});