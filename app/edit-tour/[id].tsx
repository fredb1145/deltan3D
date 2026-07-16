import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkspaceWebPage from '../../components/WorkspaceWebPage';
import MotionCard from '../../components/ui/MotionCard';
import MotionButton from '../../components/ui/MotionButton';
import {
  createSignedPanoramaUrl,
  preparePanorama,
  uploadPanorama,
} from '../../lib/panoramaUpload';
import { getPanoramaValidationMessage } from '../../lib/panoramaValidation';
import { saveTourContentWithPlanGuard } from '../../lib/planEnforcement';
import { supabase } from '../../lib/supabase';
import {
  buildOrderedNodes,
  createSceneId,
  getDefaultScenePosition,
  getDefaultSceneLabel,
  isSavedTourNode,
  moveItem,
  normalizeSceneLabel,
  normalizeRoomName,
  normalizeScenePosition,
  type OrderedSceneInput,
  type ScenePosition,
} from '../../lib/tourScenes';

type EditableScene = {
  id: string;
  label: string;
  imagePath: string | null;
  previewPath: string | null;
  previewUri: string;
  localUri: string | null;
  imageWidth: number;
  imageHeight: number;
  roomName: string;
  position: ScenePosition;
};

export default function EditTourScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1100;

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [scenes, setScenes] = useState<EditableScene[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [originalStoredPaths, setOriginalStoredPaths] = useState<string[]>([]);

  const canSave = useMemo(() => {
    if (!title.trim() || !location.trim()) return false;
    if (!scenes.length) return false;

    return scenes.every(scene => {
      if (scene.localUri) {
        return !!scene.localUri;
      }

      return !!scene.imagePath;
    });
  }, [location, scenes, title]);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setInitialLoading(false);
      setLoadError('This tour could not be opened.');
      return;
    }

    void loadTour();
  }, [id]);

  const loadTour = async () => {
    setInitialLoading(true);
    setLoadError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        throw new Error(authError?.message || 'Please sign in again.');
      }

      const { data, error } = await supabase
        .from('tours')
        .select('id, title, location, nodes')
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'This tour could not be loaded.');
      }

      const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
      const validNodes = rawNodes.filter(isSavedTourNode).filter(node => {
        if (!node.imageWidth || !node.imageHeight) {
          return true;
        }

        return !getPanoramaValidationMessage(node.imageWidth, node.imageHeight);
      });

      const mappedScenes = await Promise.all(
        validNodes.map(async (node, index) => {
          let previewUri = '';
          const previewSourcePath = typeof node.previewPath === 'string' && node.previewPath.trim()
            ? node.previewPath.trim()
            : node.imagePath.trim();

          try {
            previewUri = await createSignedPanoramaUrl(previewSourcePath);
          } catch {
            previewUri = '';
          }

          return {
            id: node.id,
            label: normalizeSceneLabel(node.label, index),
            imagePath: node.imagePath,
            previewPath: node.previewPath || null,
            previewUri,
            localUri: null,
            imageWidth: node.imageWidth,
            imageHeight: node.imageHeight,
            roomName: normalizeRoomName(node.roomName || '') || '',
            position: normalizeScenePosition(node.position),
          };
        }),
      );

      setTitle(typeof data.title === 'string' ? data.title : '');
      setLocation(typeof data.location === 'string' ? data.location : '');
      setScenes(mappedScenes);
      setOriginalStoredPaths(
        validNodes.flatMap(node => [
          node.imagePath,
          ...(node.previewPath ? [node.previewPath] : []),
        ]),
      );
    } catch (error: any) {
      setLoadError(error?.message || 'This tour could not be loaded.');
      setScenes([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const addMore360Photos = async () => {
    Keyboard.dismiss();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to select 360 photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: 0,
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const validScenes: EditableScene[] = [];
    let skippedCount = 0;

    for (const asset of result.assets) {
      const width = asset.width || 0;
      const height = asset.height || 0;
      const validationMessage = getPanoramaValidationMessage(width, height);

      if (validationMessage) {
        skippedCount += 1;
        continue;
      }

      try {
        const normalized = await preparePanorama(asset.uri);

        validScenes.push({
          id: createSceneId(),
          label: '',
          imagePath: null,
          previewPath: null,
          previewUri: normalized.uri,
          localUri: normalized.uri,
          imageWidth: normalized.width,
          imageHeight: normalized.height,
          roomName: '',
          position: getDefaultScenePosition(),
        });
      } catch {
        skippedCount += 1;
      }
    }

    if (!validScenes.length) {
      Alert.alert(
        'Invalid 360 photos',
        'None of the selected files matched the required 2:1 360 photo shape.',
      );
      return;
    }

    setScenes(prev => {
      const merged = [...prev, ...validScenes];
      return merged.map((scene, index) => ({
        ...scene,
        label: scene.label?.trim() ? scene.label : getDefaultSceneLabel(index),
      }));
    });

    if (skippedCount > 0) {
      Alert.alert(
        'Some files were skipped',
        'Only true 360 photos with an approximate 2:1 shape were added.',
      );
    }
  };

  const renameScene = (sceneId: string, value: string) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              label: value,
            }
          : scene,
      ),
    );
  };

  const updateSceneRoomName = (sceneId: string, value: string) => {
    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              roomName: value,
            }
          : scene,
      ),
    );
  };

  const moveSceneUp = (index: number) => {
    if (index === 0) return;

    setScenes(prev =>
      moveItem(prev, index, index - 1).map((scene, nextIndex) => ({
        ...scene,
        label: normalizeSceneLabel(scene.label, nextIndex),
      })),
    );
  };

  const moveSceneDown = (index: number) => {
    if (index === scenes.length - 1) return;

    setScenes(prev =>
      moveItem(prev, index, index + 1).map((scene, nextIndex) => ({
        ...scene,
        label: normalizeSceneLabel(scene.label, nextIndex),
      })),
    );
  };

  const removeScene = (sceneId: string) => {
    setScenes(prev =>
      prev
        .filter(scene => scene.id !== sceneId)
        .map((scene, index) => ({
          ...scene,
          label: normalizeSceneLabel(scene.label, index),
        })),
    );
  };

  const replaceSceneImage = async (sceneId: string) => {
    Keyboard.dismiss();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to select a 360 photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const width = asset.width || 0;
    const height = asset.height || 0;
    const validationMessage = getPanoramaValidationMessage(width, height);

    if (validationMessage) {
      Alert.alert('Invalid 360 photo', validationMessage);
      return;
    }

    try {
      const normalized = await preparePanorama(asset.uri);

      setScenes(prev =>
        prev.map(scene =>
          scene.id === sceneId
            ? {
                ...scene,
                previewPath: null,
                previewUri: normalized.uri,
                localUri: normalized.uri,
                imageWidth: normalized.width,
                imageHeight: normalized.height,
              }
            : scene,
        ),
      );
    } catch (error: any) {
      Alert.alert('Invalid 360 photo', error?.message || 'Please choose a true 360 photo.');
    }
  };

  const handleSaveChanges = async () => {
    Keyboard.dismiss();

    if (!title.trim() || !location.trim()) {
      Alert.alert('Missing details', 'Please enter the tour title and location.');
      return;
    }

    if (!scenes.length) {
      Alert.alert('No scenes added', 'Please keep at least one 360 photo in this tour.');
      return;
    }

    setSaving(true);
    const newlyUploadedPaths: string[] = [];

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user?.id) {
        throw new Error(authError?.message || 'Please sign in again.');
      }

      const userId = authData.user.id;
      const uploadedScenes: OrderedSceneInput[] = [];

      for (let index = 0; index < scenes.length; index += 1) {
        const scene = scenes[index];

        if (scene.localUri) {
          const uploaded = await uploadPanorama({
            userId,
            tourId: id,
            sceneId: scene.id,
            localUri: scene.localUri,
            alreadyPrepared: true,
            imageWidth: scene.imageWidth,
            imageHeight: scene.imageHeight,
          });

          newlyUploadedPaths.push(uploaded.path);
          newlyUploadedPaths.push(uploaded.previewPath);

          uploadedScenes.push({
            id: scene.id,
            label: normalizeSceneLabel(scene.label, index),
            imagePath: uploaded.path,
            previewPath: uploaded.previewPath,
            imageWidth: uploaded.width,
            imageHeight: uploaded.height,
            roomName: normalizeRoomName(scene.roomName),
            position: normalizeScenePosition(scene.position),
          });

          continue;
        }

        if (!scene.imagePath) {
          throw new Error('Each scene needs a valid 360 photo before saving.');
        }

        uploadedScenes.push({
          id: scene.id,
          label: normalizeSceneLabel(scene.label, index),
          imagePath: scene.imagePath,
          previewPath: scene.previewPath,
          imageWidth: scene.imageWidth,
          imageHeight: scene.imageHeight,
          roomName: normalizeRoomName(scene.roomName),
          position: normalizeScenePosition(scene.position),
        });
      }

      const nodes = buildOrderedNodes(uploadedScenes);

      await saveTourContentWithPlanGuard({
        tourId: id,
        title,
        location,
        nodes,
      });

      const nextStoredPaths = new Set(
        nodes.flatMap(node => [node.imagePath, ...(node.previewPath ? [node.previewPath] : [])]),
      );
      const staleImagePaths = originalStoredPaths.filter(path => !nextStoredPaths.has(path));

      if (staleImagePaths.length > 0) {
        void supabase.storage.from('tour-panoramas').remove(staleImagePaths);
      }

      Alert.alert('Saved', 'Your tour changes are live.', [
        {
          text: 'Open Tour',
          onPress: () => {
            router.replace({
              pathname: '/tour/[id]',
              params: { id },
            });
          },
        },
      ]);
    } catch (error: any) {
      if (newlyUploadedPaths.length > 0) {
        await supabase.storage.from('tour-panoramas').remove(newlyUploadedPaths);
      }

      Alert.alert('Save failed', error?.message || 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    const loadingBody = (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color="#C9A84C" />
        <Text style={styles.loadingText}>Loading tour...</Text>
      </View>
    );

    if (isDesktop) {
      return (
        <WorkspaceWebPage
          activeRoute="/explore"
          eyebrow="Tour Builder"
          title="Edit your walkthrough in a wider browser workspace"
          description="Update details, adjust scene order, replace 360 photos, and move into the layout map without squeezing the editor into a narrow mobile stack."
        >
          {loadingBody}
        </WorkspaceWebPage>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0407' }}>{loadingBody}</SafeAreaView>
    );
  }

  if (loadError) {
    const errorBody = (
      <View style={styles.errorWrap}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not open this tour</Text>

          <Text style={styles.errorText}>{loadError}</Text>

          <MotionButton onPress={() => router.back()} variant="primary" style={styles.errorButton}>
            Go Back
          </MotionButton>
        </View>
      </View>
    );

    if (isDesktop) {
      return (
        <WorkspaceWebPage
          activeRoute="/explore"
          eyebrow="Tour Builder"
          title="Edit your walkthrough in a wider browser workspace"
          description="Update details, adjust scene order, replace 360 photos, and move into the layout map without squeezing the editor into a narrow mobile stack."
        >
          {errorBody}
        </WorkspaceWebPage>
      );
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0407' }}>{errorBody}</SafeAreaView>
    );
  }

  const content = (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0407' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 120,
              width: '100%',
              maxWidth: isDesktop ? 1360 : undefined,
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {!isDesktop ? (
              <>
                <MotionButton
                  onPress={() => router.back()}
                  variant="secondary"
                  style={{
                    alignSelf: 'flex-start',
                    marginBottom: 18,
                  }}
                  textStyle={{
                    fontSize: 13,
                  }}
                >
                  Back
                </MotionButton>

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 30,
                    fontWeight: '800',
                    marginBottom: 8,
                  }}
                >
                  Edit Tour
                </Text>

                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 14,
                    marginBottom: 24,
                  }}
                >
                  Update the title, location, scene order, and 360 photos. When you are ready, open
                  the layout map to place scenes visually for a more natural walkthrough.
                </Text>
              </>
            ) : null}

            <MotionButton
              onPress={() =>
                router.push({
                  pathname: '/edit-tour-layout/[id]',
                  params: { id },
                })
              }
              variant="secondary"
              style={{
                marginBottom: 20,
              }}
            >
              Open Layout Map
            </MotionButton>

            <TextInput
              placeholder="Tour title"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              style={{
                backgroundColor: '#1A0509',
                color: '#FFFFFF',
                padding: 15,
                borderRadius: 12,
                marginBottom: 12,
              }}
            />

            <TextInput
              placeholder="Location"
              placeholderTextColor="#888"
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              style={{
                backgroundColor: '#1A0509',
                color: '#FFFFFF',
                padding: 15,
                borderRadius: 12,
                marginBottom: 20,
              }}
            />

            <View
              style={{
                backgroundColor: '#140307',
                borderWidth: 1,
                borderColor: 'rgba(201,168,76,0.18)',
                borderRadius: 18,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 20,
                  fontWeight: '800',
                  marginBottom: 6,
                }}
              >
                360 Scenes
              </Text>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 13,
                  marginBottom: 18,
                }}
              >
                Reorder scenes to change the walkthrough path. Highlights will still let people jump
                straight to any scene.
              </Text>

              <MotionButton
                onPress={addMore360Photos}
                variant="primary"
                style={{
                  marginBottom: scenes.length ? 16 : 0,
                }}
              >
                {scenes.length ? 'Add More 360 Photos' : 'Add 360 Photos'}
              </MotionButton>

              {!scenes.length ? (
                <View
                  style={{
                    marginTop: 18,
                    backgroundColor: '#1A0509',
                    borderRadius: 14,
                    padding: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      textAlign: 'center',
                      fontWeight: '700',
                    }}
                  >
                    No scenes in this tour yet.
                  </Text>
                </View>
              ) : null}

              <View
                style={
                  isDesktop
                    ? {
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                      }
                    : undefined
                }
              >
                {scenes.map((scene, index) => (
                  <MotionCard
                    key={scene.id}
                    style={{
                      marginBottom: 14,
                      width: isDesktop ? '48.9%' : '100%',
                      padding: 14,
                    }}
                  >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '800',
                      }}
                    >
                      {`Scene ${index + 1}`}
                    </Text>

                    <MotionButton
                      onPress={() => removeScene(scene.id)}
                      variant="secondary"
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                      textStyle={{
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </MotionButton>
                  </View>

                  <TextInput
                    placeholder={getDefaultSceneLabel(index)}
                    placeholderTextColor="#888"
                    value={scene.label}
                    onChangeText={value => renameScene(scene.id, value)}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    style={{
                      backgroundColor: '#120408',
                      color: '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                  />

                  <TextInput
                    placeholder="Room name (optional)"
                    placeholderTextColor="#888"
                    value={scene.roomName}
                    onChangeText={value => updateSceneRoomName(scene.id, value)}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    style={{
                      backgroundColor: '#120408',
                      color: '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                  />

                  {scene.previewUri ? (
                    <Image
                      source={{ uri: scene.previewUri }}
                      resizeMode="cover"
                      style={{
                        width: '100%',
                        height: 180,
                        borderRadius: 12,
                        backgroundColor: '#120408',
                        marginBottom: 12,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: '100%',
                        height: 180,
                        borderRadius: 12,
                        backgroundColor: '#120408',
                        marginBottom: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: '#C9A84C',
                          fontSize: 30,
                          fontWeight: '800',
                        }}
                      >
                        {normalizeSceneLabel(scene.label, index).slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      backgroundColor: '#120408',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: '800',
                        marginBottom: 4,
                      }}
                    >
                      Walkthrough Order
                    </Text>

                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: 12,
                      }}
                    >
                      This scene will appear as step {index + 1} in the walkthrough.
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <MotionButton
                      onPress={() => moveSceneUp(index)}
                      disabled={index === 0}
                      variant="secondary"
                      style={{ flex: 1 }}
                    >
                      Move Up
                    </MotionButton>

                    <MotionButton
                      onPress={() => moveSceneDown(index)}
                      disabled={index === scenes.length - 1}
                      variant="secondary"
                      style={{ flex: 1 }}
                    >
                      Move Down
                    </MotionButton>
                  </View>

                  <MotionButton
                    onPress={() => replaceSceneImage(scene.id)}
                    variant="secondary"
                    style={{ marginTop: 10 }}
                  >
                    Replace 360 Photo
                  </MotionButton>
                  </MotionCard>
                ))}
              </View>
            </View>

            <MotionButton
              onPress={handleSaveChanges}
              disabled={!canSave || saving}
              loading={saving}
              variant="primary"
            >
              Save Changes
            </MotionButton>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (isDesktop) {
    return (
      <WorkspaceWebPage
        activeRoute="/explore"
        eyebrow="Tour Builder"
        title="Edit your walkthrough in a wider browser workspace"
        description="Update details, adjust scene order, replace 360 photos, and move into the layout map without squeezing the editor into a narrow mobile stack."
      >
        {content}
      </WorkspaceWebPage>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  errorWrap: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  errorCard: {
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
  errorButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#0D0407',
    fontSize: 14,
    fontWeight: '800',
  },
});
