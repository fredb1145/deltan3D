import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TourLayoutMap from '../../components/TourLayoutMap';
import WorkspaceWebPage from '../../components/WorkspaceWebPage';
import { supabase } from '../../lib/supabase';
import {
  getDefaultScenePosition,
  isSavedTourNode,
  normalizeRoomName,
  normalizeSceneLabel,
  normalizeScenePosition,
  type SavedTourNode,
  type ScenePosition,
} from '../../lib/tourScenes';

type LayoutScene = SavedTourNode;

export default function EditTourLayoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1180;

  const [tourTitle, setTourTitle] = useState('');
  const [scenes, setScenes] = useState<LayoutScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      setErrorMessage('This layout could not be opened.');
      return;
    }

    void loadTourLayout();
  }, [id]);

  const loadTourLayout = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        throw new Error(authError?.message || 'Please sign in again.');
      }

      const { data, error } = await supabase
        .from('tours')
        .select('id, title, nodes')
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'This tour could not be loaded.');
      }

      const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
      const validNodes = rawNodes.filter(isSavedTourNode).map((node, index) => ({
        ...node,
        label: normalizeSceneLabel(node.label, index),
        roomName: normalizeRoomName(node.roomName || ''),
        position: normalizeScenePosition(node.position),
      }));

      if (!validNodes.length) {
        throw new Error('Add scenes to this tour before setting the layout.');
      }

      setTourTitle(typeof data.title === 'string' ? data.title.trim() : '');
      setScenes(validNodes);
      setSelectedSceneId(validNodes[0].id);
    } catch (error: any) {
      setErrorMessage(error?.message || 'This layout could not be loaded.');
      setScenes([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedScene = useMemo(
    () => scenes.find(scene => scene.id === selectedSceneId) || null,
    [scenes, selectedSceneId],
  );

  const placedCount = useMemo(
    () =>
      scenes.filter(
        scene =>
          Math.abs(normalizeScenePosition(scene.position).x) > 0.04 ||
          Math.abs(normalizeScenePosition(scene.position).y) > 0.04,
      ).length,
    [scenes],
  );

  const updateScenePosition = (sceneId: string, position: ScenePosition) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              position: normalizeScenePosition(position),
            }
          : scene,
      ),
    );
  };

  const resetLayout = () => {
    setScenes(prev =>
      prev.map(scene => ({
        ...scene,
        position: getDefaultScenePosition(),
      })),
    );
  };

  const handleSaveLayout = async () => {
    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        throw new Error(authError?.message || 'Please sign in again.');
      }

      const updatedNodes = scenes.map(scene => ({
        ...scene,
        position: normalizeScenePosition(scene.position),
      }));

      const { error } = await supabase
        .from('tours')
        .update({
          nodes: updatedNodes,
          scenes: updatedNodes.length,
        })
        .eq('id', id)
        .eq('user_id', authData.user.id);

      if (error) {
        throw new Error(error.message || 'Could not save this layout.');
      }

      Alert.alert('Saved', 'Your layout map is ready.', [
        {
          text: 'Back to Edit Tour',
          onPress: () => {
            router.replace({
              pathname: '/edit-tour/[id]',
              params: { id },
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save this layout.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    const loadingBody = (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color="#C9A84C" />
        <Text style={styles.loadingText}>Loading layout...</Text>
      </View>
    );

    if (isDesktop) {
      return (
        <WorkspaceWebPage
          activeRoute="/explore"
          eyebrow="Layout Map"
          title="Place scenes visually in a wider browser workspace"
          description="Use the layout map to position scenes more naturally so the tour feels closer to a real walkthrough."
        >
          {loadingBody}
        </WorkspaceWebPage>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>{loadingBody}</SafeAreaView>
    );
  }

  if (errorMessage) {
    const errorBody = (
      <View style={styles.centerWrap}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not open layout</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );

    if (isDesktop) {
      return (
        <WorkspaceWebPage
          activeRoute="/explore"
          eyebrow="Layout Map"
          title="Place scenes visually in a wider browser workspace"
          description="Use the layout map to position scenes more naturally so the tour feels closer to a real walkthrough."
        >
          {errorBody}
        </WorkspaceWebPage>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>{errorBody}</SafeAreaView>
    );
  }

  const content = (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, isDesktop ? styles.contentDesktop : null]}>
        {!isDesktop ? (
          <>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            <Text style={styles.heading}>Edit Layout</Text>
            <Text style={styles.subheading}>
              Place each scene where it belongs in the property. This layout helps the viewer feel more
              like a real walkthrough.
            </Text>
          </>
        ) : null}

        <View style={isDesktop ? styles.desktopLayout : null}>
          <View style={isDesktop ? styles.mapColumn : null}>
            <TourLayoutMap
              nodes={scenes}
              selectedNodeId={selectedSceneId}
              onSelectNode={setSelectedSceneId}
              onPlaceNode={(sceneId, position) => updateScenePosition(sceneId, position)}
              helperText="Select a scene below, then tap where it belongs on the layout."
            />
          </View>

          <View style={isDesktop ? styles.sideColumn : null}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Tour</Text>
              <Text style={styles.summaryTitle}>{tourTitle || 'Untitled Tour'}</Text>
              <Text style={styles.summaryMeta}>
                {placedCount} of {scenes.length} scene{scenes.length === 1 ? '' : 's'} placed
              </Text>
            </View>

            <View style={styles.selectionCard}>
              <Text style={styles.selectionLabel}>Selected Scene</Text>
              <Text style={styles.selectionTitle}>
                {selectedScene ? selectedScene.label : 'Choose a scene'}
              </Text>
              <Text style={styles.selectionMeta}>
                {selectedScene?.roomName
                  ? selectedScene.roomName
                  : 'Add a room name in Edit Tour if you want extra grouping later.'}
              </Text>
            </View>

            <ScrollView
              horizontal={!isDesktop}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.sceneStrip, isDesktop ? styles.sceneStripDesktop : null]}
            >
              {scenes.map((scene, index) => {
                const isSelected = scene.id === selectedSceneId;
                const position = normalizeScenePosition(scene.position);
                const isPlaced = Math.abs(position.x) > 0.04 || Math.abs(position.y) > 0.04;

                return (
                  <Pressable
                    key={scene.id}
                    onPress={() => setSelectedSceneId(scene.id)}
                    style={[
                      styles.sceneChip,
                      isDesktop ? styles.sceneChipDesktop : null,
                      isSelected ? styles.sceneChipSelected : null,
                    ]}
                  >
                    <Text style={styles.sceneChipStep}>{`Step ${index + 1}`}</Text>
                    <Text style={styles.sceneChipTitle} numberOfLines={1}>
                      {scene.label}
                    </Text>
                    <Text style={styles.sceneChipMeta} numberOfLines={1}>
                      {isPlaced ? 'Placed on layout' : 'Needs a spot'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.actionsRow}>
              <Pressable onPress={resetLayout} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Reset Layout</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveLayout}
                disabled={saving}
                style={[styles.primaryButton, saving ? styles.buttonDisabled : null]}
              >
                {saving ? (
                  <ActivityIndicator color="#0D0407" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Layout</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (isDesktop) {
    return (
      <WorkspaceWebPage
        activeRoute="/explore"
        eyebrow="Layout Map"
        title="Place scenes visually in a wider browser workspace"
        description="Use the layout map to position scenes more naturally so the tour feels closer to a real walkthrough."
      >
        {content}
      </WorkspaceWebPage>
    );
  }

  return content;
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
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 40,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  mapColumn: {
    flex: 1.1,
  },
  sideColumn: {
    width: 330,
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
  errorCard: {
    width: '100%',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 18,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 18,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subheading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  summaryLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryMeta: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
  },
  selectionCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    marginBottom: 14,
  },
  selectionLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  selectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  selectionMeta: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 18,
  },
  sceneStrip: {
    paddingBottom: 4,
  },
  sceneStripDesktop: {
    paddingBottom: 0,
  },
  sceneChip: {
    width: 158,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
  },
  sceneChipDesktop: {
    width: '100%',
    marginRight: 0,
    marginBottom: 10,
  },
  sceneChipSelected: {
    borderColor: '#C9A84C',
    backgroundColor: '#22070B',
  },
  sceneChipStep: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  sceneChipTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  sceneChipMeta: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#C9A84C',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0D0407',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#C9A84C',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
