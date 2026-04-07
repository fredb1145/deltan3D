import * as ImagePicker from 'expo-image-picker';
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
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { preparePanorama, uploadPanorama } from '../lib/panoramaUpload';
import { getPanoramaValidationMessage } from '../lib/panoramaValidation';
import { supabase } from '../lib/supabase';

type DraftScene = {
  id: string;
  label: string;
  localUri: string;
  imageWidth: number;
  imageHeight: number;
};

type SavedNode = {
  id: string;
  label: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  forward: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
};

function createSceneId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultSceneLabel(index: number) {
  return `Scene ${index + 1}`;
}

function normalizeSceneLabel(label: string, index: number) {
  const trimmed = label.trim();
  return trimmed.length ? trimmed : getDefaultSceneLabel(index);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function buildOrderedNodes(
  uploadedScenes: Array<{
    id: string;
    label: string;
    imagePath: string;
    imageWidth: number;
    imageHeight: number;
  }>,
): SavedNode[] {
  return uploadedScenes.map((scene, index) => ({
    id: scene.id,
    label: scene.label,
    imagePath: scene.imagePath,
    imageWidth: scene.imageWidth,
    imageHeight: scene.imageHeight,
    forward: index < uploadedScenes.length - 1 ? uploadedScenes[index + 1].id : null,
    back: index > 0 ? uploadedScenes[index - 1].id : null,
    left: null,
    right: null,
  }));
}

export default function CreateTourScreen() {
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
        });
      } catch (error) {
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

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user?.id) {
        throw new Error(userError?.message || 'Could not get current user.');
      }

      const { data: insertedTour, error: insertError } = await supabase
        .from('tours')
        .insert([
          {
            user_id: userData.user.id,
            title: title.trim(),
            location: location.trim(),
            scenes: 0,
            nodes: [],
          },
        ])
        .select('id')
        .single();

      if (insertError || !insertedTour?.id) {
        throw new Error(insertError?.message || 'Could not create tour.');
      }

      createdTourId = insertedTour.id;

      const uploadedScenes: Array<{
        id: string;
        label: string;
        imagePath: string;
        imageWidth: number;
        imageHeight: number;
      }> = [];

      for (let index = 0; index < scenes.length; index += 1) {
        const scene = scenes[index];
        const uploaded = await uploadSceneImage({
          userId: userData.user.id,
          tourId: insertedTour.id,
          scene,
        });

        uploadedScenes.push({
          id: scene.id,
          label: normalizeSceneLabel(scene.label, index),
          imagePath: uploaded.path,
          imageWidth: uploaded.width,
          imageHeight: uploaded.height,
        });
      }

      const nodes = buildOrderedNodes(uploadedScenes);

      const { error: updateError } = await supabase
        .from('tours')
        .update({
          scenes: nodes.length,
          nodes,
        })
        .eq('id', insertedTour.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      Alert.alert('Success', 'Your tour is ready.', [
        {
          text: 'Open Tour',
          onPress: () => {
            router.replace({
              pathname: '/tour/[id]',
              params: { id: insertedTour.id },
            });
          },
        },
      ]);
    } catch (error: any) {
      if (createdTourId) {
        await supabase.from('tours').delete().eq('id', createdTourId);
      }

      Alert.alert('Error', error?.message || 'Something went wrong while creating the tour.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 30,
                fontWeight: '800',
                marginBottom: 8,
              }}
            >
              Create Tour
            </Text>

            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              Select your 360 photos at once. They stay in the order you picked, and you can reorder them before publishing.
            </Text>

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
                Scenes are connected automatically from first to last.
              </Text>

              <TouchableOpacity
                onPress={addMore360Photos}
                style={{
                  backgroundColor: '#C9A84C',
                  padding: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: scenes.length ? 16 : 0,
                }}
              >
                <Text
                  style={{
                    color: '#0D0407',
                    fontWeight: '800',
                  }}
                >
                  {scenes.length ? 'Add More 360 Photos' : 'Upload 360 Photos'}
                </Text>
              </TouchableOpacity>

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
                    No scenes added yet.
                  </Text>
                </View>
              ) : null}

              {scenes.map((scene, index) => (
                <View
                  key={scene.id}
                  style={{
                    backgroundColor: '#1A0509',
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(201,168,76,0.14)',
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

                    <TouchableOpacity
                      onPress={() => removeScene(scene.id)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        Remove
                      </Text>
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
                    style={{
                      backgroundColor: '#120408',
                      color: '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                  />

                  <Image
                    source={{ uri: scene.localUri }}
                    resizeMode="cover"
                    style={{
                      width: '100%',
                      height: 180,
                      borderRadius: 12,
                      backgroundColor: '#120408',
                      marginBottom: 12,
                    }}
                  />

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => moveSceneUp(index)}
                      disabled={index === 0}
                      style={{
                        flex: 1,
                        backgroundColor: index === 0 ? 'rgba(255,255,255,0.08)' : '#120408',
                        borderWidth: 1,
                        borderColor: index === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.28)',
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: index === 0 ? 'rgba(255,255,255,0.35)' : '#C9A84C',
                          fontWeight: '800',
                        }}
                      >
                        Move Up
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => moveSceneDown(index)}
                      disabled={index === scenes.length - 1}
                      style={{
                        flex: 1,
                        backgroundColor:
                          index === scenes.length - 1 ? 'rgba(255,255,255,0.08)' : '#120408',
                        borderWidth: 1,
                        borderColor:
                          index === scenes.length - 1
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(201,168,76,0.28)',
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color:
                            index === scenes.length - 1
                              ? 'rgba(255,255,255,0.35)'
                              : '#C9A84C',
                          fontWeight: '800',
                        }}
                      >
                        Move Down
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => replaceSceneImage(scene.id)}
                    style={{
                      marginTop: 10,
                      backgroundColor: 'rgba(201,168,76,0.14)',
                      borderWidth: 1,
                      borderColor: 'rgba(201,168,76,0.28)',
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: '#C9A84C',
                        fontWeight: '800',
                      }}
                    >
                      Replace 360 Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateTour}
              disabled={loading || !canCreate}
              style={{
                backgroundColor: '#C9A84C',
                padding: 16,
                borderRadius: 14,
                alignItems: 'center',
                opacity: loading || !canCreate ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#0D0407" />
              ) : (
                <Text
                  style={{
                    color: '#0D0407',
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  Create Live Tour
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
