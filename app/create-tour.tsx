import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WorkspaceWebPage from '../components/WorkspaceWebPage';
import { preparePanorama, uploadPanorama } from '../lib/panoramaUpload';
import { getPanoramaValidationMessage } from '../lib/panoramaValidation';
import { createTourWithPlanGuard, saveTourContentWithPlanGuard } from '../lib/planEnforcement';
import { supabase } from '../lib/supabase';
import {
  buildOrderedNodes,
  createSceneId,
  getDefaultScenePosition,
  getDefaultSceneLabel,
  normalizeSceneLabel,
  normalizeRoomName,
  normalizeScenePosition,
  moveItem,
  type OrderedSceneInput,
  type ScenePosition,
} from '../lib/tourScenes';

type DraftScene = {
  id: string;
  label: string;
  localUri: string;
  imageWidth: number;
  imageHeight: number;
  roomName: string;
  position: ScenePosition;
};

const SAMPLE_PANORAMAS = [
  {
    source: require('../assets/panoramas/node1.jpg'),
    label: 'Sample Scene 1',
    roomName: 'Sample Room',
  },
  {
    source: require('../assets/panoramas/node2.jpg'),
    label: 'Sample Scene 2',
    roomName: 'Sample Room',
  },
  {
    source: require('../assets/panoramas/node3.jpg'),
    label: 'Sample Scene 3',
    roomName: 'Sample Room',
  },
] as const;

async function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

export default function CreateTourScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1100;
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<DraftScene[]>([]);

  const canCreate = useMemo(() => {
    if (!title.trim() || !location.trim()) return false;
    if (!scenes.length) return false;
    return scenes.every(scene => !!scene.localUri);
  }, [title, location, scenes]);

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

    const validScenes: DraftScene[] = [];
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

  const loadSampleScenes = async () => {
    Keyboard.dismiss();

    try {
      const sampleScenes: DraftScene[] = [];

      for (const sample of SAMPLE_PANORAMAS) {
        const asset = Asset.fromModule(sample.source);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;
        const imageSize = await getImageSize(uri);
        const validationMessage = getPanoramaValidationMessage(imageSize.width, imageSize.height);

        if (validationMessage) {
          throw new Error('One of the sample 360 photos is not valid.');
        }

        const normalized = await preparePanorama(uri);

        sampleScenes.push({
          id: createSceneId(),
          label: sample.label,
          localUri: normalized.uri,
          imageWidth: normalized.width,
          imageHeight: normalized.height,
          roomName: sample.roomName,
          position: getDefaultScenePosition(),
        });
      }

      setScenes(sampleScenes);

      if (!title.trim()) {
        setTitle('Sample Tour');
      }

      if (!location.trim()) {
        setLocation('Sample Property');
      }
    } catch (error: any) {
      Alert.alert(
        'Could not load sample scenes',
        error?.message || 'Please try again.',
      );
    }
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

    let normalized: { uri: string; width: number; height: number };

    try {
      normalized = await preparePanorama(asset.uri);
    } catch (error: any) {
      Alert.alert('Invalid 360 photo', error?.message || 'Please choose a true 360 photo.');
      return;
    }

    setScenes(prev =>
      prev.map(scene =>
        scene.id === sceneId
          ? {
              ...scene,
              localUri: normalized.uri,
              imageWidth: normalized.width,
              imageHeight: normalized.height,
            }
          : scene,
      ),
    );
  };

  const uploadSceneImage = async (params: {
    userId: string;
    tourId: string;
    scene: DraftScene;
  }) => {
    const { userId, tourId, scene } = params;
    return uploadPanorama({
      userId,
      tourId,
      sceneId: scene.id,
      localUri: scene.localUri,
      alreadyPrepared: true,
      imageWidth: scene.imageWidth,
      imageHeight: scene.imageHeight,
    });
  };

  const handleCreateTour = async () => {
    Keyboard.dismiss();

    if (!title.trim() || !location.trim()) {
      Alert.alert('Missing details', 'Please enter the tour title and location.');
      return;
    }

    if (!scenes.length) {
      Alert.alert('No scenes added', 'Please upload at least one 360 photo.');
      return;
    }

    setLoading(true);
    let createdTourId: string | null = null;
    const newlyUploadedPaths: string[] = [];

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user?.id) {
        throw new Error(userError?.message || 'Could not get current user.');
      }

      createdTourId = await createTourWithPlanGuard({
        title,
        location,
        requestedSceneCount: scenes.length,
      });

      const uploadedScenes: OrderedSceneInput[] = [];

      for (let index = 0; index < scenes.length; index += 1) {
        const scene = scenes[index];
        const uploaded = await uploadSceneImage({
          userId: userData.user.id,
          tourId: createdTourId,
          scene,
        });

        newlyUploadedPaths.push(uploaded.path, uploaded.previewPath);

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
      }

      const nodes = buildOrderedNodes(uploadedScenes);

      await saveTourContentWithPlanGuard({
        tourId: createdTourId,
        title,
        location,
        nodes,
      });

      Alert.alert('Success', 'Your tour is ready.', [
        {
          text: 'Open Tour',
          onPress: () => {
            router.replace({
              pathname: '/tour/[id]',
              params: { id: createdTourId as string },
            });
          },
        },
      ]);
    } catch (error: any) {
      if (newlyUploadedPaths.length > 0) {
        await supabase.storage.from('tour-panoramas').remove(newlyUploadedPaths);
      }

      if (createdTourId) {
        await supabase.from('tours').delete().eq('id', createdTourId);
      }

      Alert.alert('Error', error?.message || 'Something went wrong while creating the tour.');
    } finally {
      setLoading(false);
    }
  };

  const body = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[
            styles.pageContent,
            isDesktop ? styles.pageContentDesktop : null,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {!isDesktop ? (
            <>
              <Text style={styles.mobileHeading}>Create Tour</Text>
              <Text style={styles.mobileSubheading}>
                Upload your 360 photos in the order the walkthrough should follow. If the order feels
                wrong, move scenes up or down before you publish.
              </Text>
            </>
          ) : null}

          <View style={isDesktop ? styles.desktopTopRow : null}>
            <View style={isDesktop ? styles.desktopMainColumn : null}>
              <View style={styles.detailsCard}>
                <Text style={styles.detailsCardLabel}>Tour Details</Text>
                <Text style={styles.detailsCardTitle}>Set the basics before you upload scenes</Text>
                <Text style={styles.detailsCardText}>
                  Name the tour, set the location, then add your 360 scenes in the order the walkthrough should follow.
                </Text>

                <TextInput
                  placeholder="Tour title"
                  placeholderTextColor="#888"
                  value={title}
                  onChangeText={setTitle}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  style={styles.input}
                />

                <TextInput
                  placeholder="Location"
                  placeholderTextColor="#888"
                  value={location}
                  onChangeText={setLocation}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  style={styles.input}
                />
              </View>
            </View>

            {isDesktop ? (
              <View style={styles.desktopSideColumn}>
                <View style={styles.sideCard}>
                  <Text style={styles.sideCardLabel}>Ready To Publish</Text>
                  <Text style={styles.sideCardTitle}>
                    {scenes.length} scene{scenes.length === 1 ? '' : 's'} prepared
                  </Text>
                  <Text style={styles.sideCardText}>
                    Browser layout gives you more room to manage scene order, review previews, and catch mistakes before the live tour goes out.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleCreateTour}
                  disabled={loading || !canCreate}
                  style={[styles.primaryAction, loading || !canCreate ? styles.buttonDisabled : null]}
                >
                  {loading ? (
                    <ActivityIndicator color="#0D0407" />
                  ) : (
                    <Text style={styles.primaryActionText}>Create Live Tour</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.scenesCard}>
            <Text style={styles.scenesCardTitle}>360 Scenes</Text>
            <Text style={styles.scenesCardText}>
              We use your scene order to create the walkthrough path. Highlights will still let people jump directly to any scene.
            </Text>

            <TouchableOpacity onPress={addMore360Photos} style={styles.uploadButton}>
              <Text style={styles.uploadButtonText}>
                {scenes.length ? 'Add More 360 Photos' : 'Upload 360 Photos'}
              </Text>
            </TouchableOpacity>

            {__DEV__ ? (
              <TouchableOpacity onPress={loadSampleScenes} style={styles.sampleButton}>
                <Text style={styles.sampleButtonText}>Use Sample 360 Photos</Text>
              </TouchableOpacity>
            ) : null}

            {!scenes.length ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>No scenes added yet.</Text>
              </View>
            ) : (
              <View style={isDesktop ? styles.sceneGridDesktop : null}>
                {scenes.map((scene, index) => (
                  <View
                    key={scene.id}
                    style={[styles.sceneCard, isDesktop ? styles.sceneCardDesktop : null]}
                  >
                    <View style={styles.sceneCardHeader}>
                      <Text style={styles.sceneCardTitle}>{`Scene ${index + 1}`}</Text>

                      <TouchableOpacity onPress={() => removeScene(scene.id)} style={styles.ghostChip}>
                        <Text style={styles.ghostChipText}>Remove</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      placeholder={getDefaultSceneLabel(index)}
                      placeholderTextColor="#888"
                      value={scene.label}
                      onChangeText={value => renameScene(scene.id, value)}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      style={styles.sceneInput}
                    />

                    <TextInput
                      placeholder="Room name (optional)"
                      placeholderTextColor="#888"
                      value={scene.roomName}
                      onChangeText={value => updateSceneRoomName(scene.id, value)}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      style={styles.sceneInput}
                    />

                    <Image source={{ uri: scene.localUri }} resizeMode="cover" style={styles.sceneImage} />

                    <View style={styles.sceneInfoCard}>
                      <Text style={styles.sceneInfoTitle}>Walkthrough Position</Text>
                      <Text style={styles.sceneInfoText}>
                        This scene will appear as step {index + 1} in the walkthrough.
                      </Text>
                    </View>

                    <View style={styles.sceneActionRow}>
                      <TouchableOpacity
                        onPress={() => moveSceneUp(index)}
                        disabled={index === 0}
                        style={[
                          styles.secondaryActionButton,
                          index === 0 ? styles.secondaryActionButtonDisabled : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryActionButtonText,
                            index === 0 ? styles.secondaryActionButtonTextDisabled : null,
                          ]}
                        >
                          Move Up
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => moveSceneDown(index)}
                        disabled={index === scenes.length - 1}
                        style={[
                          styles.secondaryActionButton,
                          index === scenes.length - 1 ? styles.secondaryActionButtonDisabled : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryActionButtonText,
                            index === scenes.length - 1
                              ? styles.secondaryActionButtonTextDisabled
                              : null,
                          ]}
                        >
                          Move Down
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => replaceSceneImage(scene.id)}
                      style={styles.replaceButton}
                    >
                      <Text style={styles.replaceButtonText}>Replace 360 Photo</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {!isDesktop ? (
            <TouchableOpacity
              onPress={handleCreateTour}
              disabled={loading || !canCreate}
              style={[styles.primaryAction, loading || !canCreate ? styles.buttonDisabled : null]}
            >
              {loading ? (
                <ActivityIndicator color="#0D0407" />
              ) : (
                <Text style={styles.primaryActionText}>Create Live Tour</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  if (isDesktop) {
    return (
      <WorkspaceWebPage
        eyebrow="Tour Builder"
        title="Create a new walkthrough with a browser-friendly builder"
        description="Set the tour details, upload 360 scenes, organize the walkthrough order, and publish without squeezing everything into a narrow mobile stack."
      >
        {body}
      </WorkspaceWebPage>
    );
  }

  return <SafeAreaView style={styles.safeArea}>{body}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  pageContent: {
    padding: 20,
    paddingBottom: 120,
  },
  pageContentDesktop: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 40,
  },
  mobileHeading: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  mobileSubheading: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 24,
  },
  desktopTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
    marginBottom: 18,
  },
  desktopMainColumn: {
    flex: 1,
  },
  desktopSideColumn: {
    width: 330,
    gap: 16,
  },
  detailsCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 22,
    padding: 20,
  },
  detailsCardLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailsCardTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailsCardText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#120408',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  sideCard: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 22,
    padding: 18,
  },
  sideCardLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sideCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  sideCardText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 20,
  },
  scenesCard: {
    backgroundColor: '#140307',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  scenesCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  scenesCardText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginBottom: 18,
  },
  uploadButton: {
    backgroundColor: '#C9A84C',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#0D0407',
    fontWeight: '800',
  },
  sampleButton: {
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  sampleButtonText: {
    color: '#C9A84C',
    fontWeight: '800',
  },
  emptyStateCard: {
    marginTop: 10,
    backgroundColor: '#1A0509',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    fontWeight: '700',
  },
  sceneGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sceneCard: {
    backgroundColor: '#1A0509',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.14)',
  },
  sceneCardDesktop: {
    width: '48.9%',
  },
  sceneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sceneCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  ghostChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ghostChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sceneInput: {
    backgroundColor: '#120408',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  sceneImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#120408',
    marginBottom: 12,
  },
  sceneInfoCard: {
    backgroundColor: '#120408',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sceneInfoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  sceneInfoText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  sceneActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#120408',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryActionButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryActionButtonText: {
    color: '#C9A84C',
    fontWeight: '800',
  },
  secondaryActionButtonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  replaceButton: {
    marginTop: 10,
    backgroundColor: 'rgba(201,168,76,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  replaceButtonText: {
    color: '#C9A84C',
    fontWeight: '800',
  },
  primaryAction: {
    backgroundColor: '#C9A84C',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#0D0407',
    fontWeight: '800',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
