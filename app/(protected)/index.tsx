import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type TourRow = {
  id: string;
  title: string | null;
  location: string | null;
  scenes: number | null;
  nodes: unknown;
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

export default function IndexScreen() {
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
      getTours();
    }, [getTours])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0407' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => getTours(true)}
            tintColor="#FFFFFF"
          />
        }
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: '800',
            marginBottom: 6,
          }}
        >
          Welcome back
        </Text>

        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          Create, organize, and open your virtual tours in one place.
        </Text>

        <Link
          href="/create-tour"
          style={{
            color: '#0D0407',
            backgroundColor: '#C9A84C',
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 12,
            overflow: 'hidden',
            fontWeight: '800',
            marginBottom: 24,
          }}
        >
          + Create New Tour
        </Link>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '800',
            marginBottom: 14,
          }}
        >
          My Tours
        </Text>

        {loading ? (
          <View
            style={{
              minHeight: 180,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF',
                marginTop: 12,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              Loading tours...
            </Text>
          </View>
        ) : error ? (
          <View
            style={{
              backgroundColor: '#1A0509',
              borderWidth: 1,
              borderColor: 'rgba(201,168,76,0.18)',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '800',
                marginBottom: 8,
              }}
            >
              Could not load tours
            </Text>

            <Text
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              {error}
            </Text>

            <Pressable
              onPress={() => getTours()}
              style={{
                backgroundColor: '#C9A84C',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#0D0407',
                  fontWeight: '800',
                  fontSize: 14,
                }}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : tours.length === 0 ? (
          <View
            style={{
              backgroundColor: '#1A0509',
              borderWidth: 1,
              borderColor: 'rgba(201,168,76,0.18)',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: '800',
                marginBottom: 8,
              }}
            >
              No tours yet
            </Text>

            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Create your first tour to start adding 360 scenes and opening them in the viewer.
            </Text>
          </View>
        ) : (
          tours.map((tour, index) => {
            const sceneCount = getSceneCount(tour);

            return (
              <Pressable
                key={tour.id}
                onPress={() => {
                  router.push({
                    pathname: '/tour/[id]',
                    params: { id: tour.id },
                  });
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#1A0509',
                  borderWidth: 1,
                  borderColor: 'rgba(201,168,76,0.18)',
                  borderRadius: 18,
                  padding: 18,
                  marginBottom: 16,
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 20,
                    fontWeight: '800',
                    marginBottom: 6,
                  }}
                >
                  {formatTourTitle(tour, index)}
                </Text>

                <Text
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {formatTourLocation(tour)} • {sceneCount} scene{sceneCount === 1 ? '' : 's'}
                </Text>

                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(201,168,76,0.14)',
                    borderWidth: 1,
                    borderColor: 'rgba(201,168,76,0.24)',
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: '#C9A84C',
                      fontSize: 13,
                      fontWeight: '800',
                    }}
                  >
                    Open Tour
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}