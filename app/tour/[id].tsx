import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import PanoramaViewer from '../../components/PanoramaViewer';
import TourLayoutMap from '../../components/TourLayoutMap';
import { createSignedPanoramaUrl } from '../../lib/panoramaUpload';
import { getPanoramaValidationMessage } from '../../lib/panoramaValidation';
import { supabase } from '../../lib/supabase';
import { buildMovementMarkers } from '../../lib/tourMovement';
import { hasAnySceneLayout, isSavedTourNode, type SavedTourNode } from '../../lib/tourScenes';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import MotionButton from '../../components/ui/MotionButton';
import MotionCard from '../../components/ui/MotionCard';

type NodeType = SavedTourNode;

type StepMarkerProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  large?: boolean;
  style?: any;
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function StepMarker({ icon, label, onPress, large = false, style }: StepMarkerProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const { triggerLightImpact } = useHapticFeedback();

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 1.15,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1.0,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    triggerLightImpact();
    onPress();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.stepMarkerWrap,
          large ? styles.stepMarkerWrapLarge : styles.stepMarkerWrapSmall,
        ]}
      >
        <View style={[styles.stepMarker, large ? styles.stepMarkerLarge : styles.stepMarkerSmall]}>
          <View style={styles.stepMarkerInner}>
            <Ionicons name={icon} size={large ? 28 : 22} color="rgba(255,255,255,0.94)" />
          </View>
        </View>
        <Text numberOfLines={1} style={styles.stepMarkerLabel}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TourViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1200;

  const [tourTitle, setTourTitle] = useState('');
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [activeNode, setActiveNode] = useState<NodeType | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [pendingNode, setPendingNode] = useState<NodeType | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [awaitingActiveReady, setAwaitingActiveReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});

  const transitionShadeOpacity = useRef(new Animated.Value(0)).current;
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadedImageUrlsRef = useRef<Set<string>>(new Set());

  const orderedNodes = useMemo(() => nodes, [nodes]);

  const currentIndex = useMemo(() => {
    if (!activeNode) {
      return -1;
    }

    return orderedNodes.findIndex(node => node.id === activeNode.id);
  }, [activeNode, orderedNodes]);

  const currentRoomName = useMemo(() => {
    const value = activeNode?.roomName || '';
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }, [activeNode]);

  const movementMarkers = useMemo(() => {
    if (!activeNode) {
      return [];
    }

    return buildMovementMarkers(orderedNodes, activeNode.id);
  }, [activeNode, orderedNodes]);

  const controlsOffset = isDesktop ? 28 : highlightsOpen ? 178 : 92;
  const layoutOffset = highlightsOpen ? 188 : 100;
  const hasLayoutMap = useMemo(() => hasAnySceneLayout(orderedNodes), [orderedNodes]);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setInitialLoading(false);
      setErrorMessage('This tour could not be opened.');
      return;
    }

    void loadTour();

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [id]);

  const prepareSignedImageUrl = async (path: string) => {
    if (!path || !path.trim()) {
      return null;
    }

    const normalizedPath = path.trim();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const signedUrl = await createSignedPanoramaUrl(normalizedPath);
        return signedUrl;
      } catch {
        if (attempt < 3) {
          await delay(700);
        }
      }
    }

    return null;
  };

  const buildSignedUrlMap = async (paths: string[]) => {
    const urlEntries = await Promise.all(
      Array.from(
        new Set(
          paths
            .map(path => path.trim())
            .filter(path => path.length > 0),
        ),
      ).map(async path => {
        const signedUrl = await prepareSignedImageUrl(path);

        if (!signedUrl) {
          return null;
        }

        return [path, signedUrl] as const;
      }),
    );

    const nextMap: Record<string, string> = {};

    urlEntries.forEach(entry => {
      if (!entry) {
        return;
      }

      nextMap[entry[0]] = entry[1];
    });

    return nextMap;
  };

  const getPreviewSourcePath = (node: NodeType) => {
    if (typeof node.previewPath !== 'string') {
      return null;
    }

    const trimmed = node.previewPath.trim();
    return trimmed.length ? trimmed : null;
  };

  const preloadSceneImages = async (urlList: string[]) => {
    await Promise.all(
      urlList.map(async url => {
        try {
          await Asset.fromURI(url).downloadAsync();
        } catch {
          return null;
        }

        return null;
      }),
    );
  };

  const warmPreviewUrls = async (nodeList: NodeType[]) => {
    for (const node of nodeList) {
      const previewPath = getPreviewSourcePath(node);

      if (!previewPath) {
        continue;
      }

      const existingPreviewUrl = signedUrlMap[previewPath];

      if (existingPreviewUrl) {
        setPreviewUrls(prev => {
          if (prev[node.id]) {
            return prev;
          }

          return {
            ...prev,
            [node.id]: existingPreviewUrl,
          };
        });
        continue;
      }

      const signedUrl = await prepareSignedImageUrl(previewPath);

      if (!signedUrl) {
        continue;
      }

      setSignedUrlMap(prev => ({
        ...prev,
        [previewPath]: signedUrl,
      }));

      setPreviewUrls(prev => ({
        ...prev,
        [node.id]: signedUrl,
      }));
    }
  };

  const warmNextScene = async (
    nodeList: NodeType[],
    activeNodeId: string,
    currentUrlMap: Record<string, string>,
  ) => {
    const activeIndex = nodeList.findIndex(node => node.id === activeNodeId);

    if (activeIndex < 0) {
      return;
    }

    const nextNode = nodeList[activeIndex + 1];

    if (!nextNode) {
      return;
    }

    const nextPath = nextNode.imagePath.trim();
    let nextUrl = currentUrlMap[nextPath] || null;

    if (!nextUrl) {
      nextUrl = await prepareSignedImageUrl(nextPath);

      if (nextUrl) {
        setSignedUrlMap(prev => ({
          ...prev,
          [nextPath]: nextUrl as string,
        }));
      }
    }

    if (!nextUrl || preloadedImageUrlsRef.current.has(nextUrl)) {
      return;
    }

    preloadedImageUrlsRef.current.add(nextUrl);
    await preloadSceneImages([nextUrl]);
  };

  const loadTour = async () => {
    setInitialLoading(true);
    setErrorMessage(null);
    setActiveImageUrl(null);
    setPendingNode(null);
    setPendingImageUrl(null);
    setPreviewUrls({});
    setSignedUrlMap({});
    setTransitioning(false);
    setAwaitingActiveReady(false);
    preloadedImageUrlsRef.current.clear();
    transitionShadeOpacity.stopAnimation();
    transitionShadeOpacity.setValue(0);

    const { data, error } = await supabase
      .from('tours')
      .select('id, title, nodes')
      .eq('id', id)
      .single();

    if (error || !data) {
      setInitialLoading(false);
      setErrorMessage('This tour could not be loaded.');
      return;
    }

    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const tourNodes = rawNodes.filter(isSavedTourNode).filter(node => {
      if (!node.imageWidth || !node.imageHeight) return true;
      return !getPanoramaValidationMessage(node.imageWidth, node.imageHeight);
    });

    if (!tourNodes.length) {
      setInitialLoading(false);
      setErrorMessage('This tour does not have any valid scenes yet.');
      return;
    }

    const firstNode = tourNodes[0];
    const firstPath = firstNode.imagePath.trim();
    const firstImageUrl = await prepareSignedImageUrl(firstPath);

    if (!firstImageUrl) {
      setInitialLoading(false);
      setErrorMessage('Could not load this 360 photo.');
      return;
    }

    setTourTitle(typeof data.title === 'string' ? data.title : '');
    setNodes(tourNodes);
    setActiveNode(firstNode);
    setActiveImageUrl(firstImageUrl);
    setSignedUrlMap({
      [firstPath]: firstImageUrl,
    });
    setPreviewUrls({
      [firstNode.id]: firstImageUrl,
    });
    setInitialLoading(false);
    void warmPreviewUrls(tourNodes);
  };

  const resetPendingTransition = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    transitionShadeOpacity.stopAnimation();
    transitionShadeOpacity.setValue(0);
    setPendingNode(null);
    setPendingImageUrl(null);
    setAwaitingActiveReady(false);
    setTransitioning(false);
  };

  const goToNode = async (nodeId?: string | null) => {
    if (!nodeId || nodeId === activeNode?.id || transitioning) return;

    const nextNode = nodes.find(node => node.id === nodeId);
    if (!nextNode) return;

    setErrorMessage(null);
    setTransitioning(true);
    setPendingNode(nextNode);

    let nextImageUrl = signedUrlMap[nextNode.imagePath.trim()] || null;

    if (!nextImageUrl) {
      nextImageUrl = await prepareSignedImageUrl(nextNode.imagePath);

      if (nextImageUrl) {
        setSignedUrlMap(prev => ({
          ...prev,
          [nextNode.imagePath.trim()]: nextImageUrl as string,
        }));
      }
    }

    if (!nextImageUrl) {
      resetPendingTransition();
      setErrorMessage('Could not load this 360 photo.');
      return;
    }

    setPendingImageUrl(nextImageUrl);
    transitionShadeOpacity.stopAnimation();
    transitionShadeOpacity.setValue(0);

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    const nextPendingNode = nextNode;
    const nextPendingImageUrl = nextImageUrl;

    transitionTimeoutRef.current = setTimeout(() => {
      Animated.timing(transitionShadeOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        setActiveNode(nextPendingNode);
        setActiveImageUrl(nextPendingImageUrl);
        setAwaitingActiveReady(true);
      });
    }, 80);
  };

  const handleActiveReady = () => {
    if (!awaitingActiveReady) {
      return;
    }

    Animated.timing(transitionShadeOpacity, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPendingNode(null);
      setPendingImageUrl(null);
      setAwaitingActiveReady(false);
      setTransitioning(false);
      transitionShadeOpacity.stopAnimation();
      transitionShadeOpacity.setValue(0);
    });
  };

  const handleActiveError = (message: string) => {
    if (transitioning || awaitingActiveReady) {
      resetPendingTransition();
    }

    setErrorMessage(message);
  };

  useEffect(() => {
    if (initialLoading || !activeNode) {
      return;
    }

    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(() => {
      void warmNextScene(orderedNodes, activeNode.id, signedUrlMap);
    }, 900);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [activeNode, initialLoading, orderedNodes, signedUrlMap]);

  const retryCurrentNode = async () => {
    if (!activeNode) return;

    setErrorMessage(null);
    setInitialLoading(true);

    const nextImageUrl =
      signedUrlMap[activeNode.imagePath.trim()] || (await prepareSignedImageUrl(activeNode.imagePath));

    if (!nextImageUrl) {
      setInitialLoading(false);
      setErrorMessage('Could not load this 360 photo.');
      return;
    }

    setActiveImageUrl(nextImageUrl);
    setInitialLoading(false);
  };

  const highlightsMarkup = (
    <>
      {orderedNodes.map((node, index) => {
        const isActive = activeNode?.id === node.id;
        const previewUrl = previewUrls[node.id];

        return (
          <MotionCard
            key={node.id}
            style={[
              styles.highlightCard,
              isDesktop ? styles.highlightCardDesktop : null,
              isActive ? styles.highlightCardActive : null,
              { width: 130, marginRight: 10, padding: 10 },
            ]}
            onPress={() => goToNode(node.id)}
          >
            <View style={styles.highlightImageWrap}>
              {previewUrl ? (
                <Image source={{ uri: previewUrl }} resizeMode="cover" style={styles.highlightImage} />
              ) : (
                <View style={styles.highlightFallback}>
                  <Text style={styles.highlightFallbackText}>
                    {node.label.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.highlightStep}>{`Step ${index + 1}`}</Text>

            {node.roomName ? (
              <Text numberOfLines={1} style={styles.highlightRoom}>
                {node.roomName}
              </Text>
            ) : null}

            <Text numberOfLines={1} style={[styles.highlightLabel, isActive && styles.highlightLabelActive]}>
              {node.label}
            </Text>
          </MotionCard>
        );
      })}
    </>
  );

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (!activeNode || !activeImageUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMessage || 'Could not load this 360 photo.'}</Text>

        <MotionButton onPress={retryCurrentNode} variant="primary">
          Try Again
        </MotionButton>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDesktop ? styles.containerDesktop : null]}>
      <View style={[styles.viewerStage, isDesktop ? styles.viewerStageDesktop : null]}>
        <View style={styles.viewerLayer}>
          <PanoramaViewer
            key={`active-${activeImageUrl}`}
            imageUrl={activeImageUrl}
            onError={handleActiveError}
            onReady={handleActiveReady}
            showLoadingOverlay={false}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.transitionShade,
            {
              opacity: transitionShadeOpacity,
            },
          ]}
        />
        <MotionButton
          onPress={() => router.back()}
          variant="secondary"
          style={[styles.viewerBackButton, isDesktop ? styles.viewerBackButtonDesktop : null]}
          textStyle={styles.viewerBackButtonText}
        >
          Back
        </MotionButton>

        <View style={[styles.topOverlay, isDesktop ? styles.topOverlayDesktop : null]}>
          <View style={[styles.titlePill, isDesktop ? styles.titlePillDesktop : null]}>
            <Text style={styles.tourTitleText}>{tourTitle || 'Tour'}</Text>
            {currentRoomName ? <Text style={styles.roomTitleText}>{currentRoomName}</Text> : null}
            <Text style={styles.sceneTitleText}>{activeNode.label}</Text>
            <Text style={styles.sceneStepText}>
              {currentIndex >= 0 ? `Step ${currentIndex + 1} of ${orderedNodes.length}` : ''}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={[styles.inlineErrorBox, isDesktop ? styles.inlineErrorBoxDesktop : null]}>
            <Text style={styles.inlineErrorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.controlsContainer, { bottom: controlsOffset }]}>
          {movementMarkers.map(marker => (
            <StepMarker
              key={marker.targetId}
              icon={marker.icon}
              label={marker.label}
              large={marker.primary}
              style={{
                left: `${marker.anchorX * 100}%`,
                top: `${marker.anchorY * 100}%`,
                marginLeft: marker.primary ? -42 : -34,
                opacity: transitioning ? 0.6 : 1,
              }}
              onPress={() => goToNode(marker.targetId)}
            />
          ))}
        </View>

        {!isDesktop && hasLayoutMap ? (
          <View style={[styles.layoutPanel, { bottom: layoutOffset }]}>
            <View style={styles.layoutPanelHeader}>
              <Text style={styles.layoutPanelTitle}>Layout</Text>
              <Text style={styles.layoutPanelHint}>Tap a point to jump there.</Text>
            </View>

            <TourLayoutMap
              nodes={orderedNodes}
              activeNodeId={activeNode.id}
              onSelectNode={nodeId => goToNode(nodeId)}
              compact
              showLabels={false}
            />
          </View>
        ) : null}

        {!isDesktop ? (
          <View style={styles.bottomOverlay}>
            <View style={styles.bottomBar}>
              <View>
                <Text style={styles.bottomBarTitle}>Highlights</Text>
                <Text style={styles.bottomBarHint}>Tap any scene to jump there.</Text>
              </View>

              <MotionButton
                onPress={() => setHighlightsOpen(current => !current)}
                variant="secondary"
                style={styles.highlightsToggle}
                textStyle={styles.highlightsToggleText}
              >
                {highlightsOpen ? 'Hide' : 'Show'}
              </MotionButton>
            </View>

            {highlightsOpen ? (
              <View style={styles.highlightsPanel}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.highlightsContent}
                >
                  {highlightsMarkup}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {isDesktop ? (
        <View style={styles.viewerSidePanel}>
          <View style={styles.viewerSideHeader}>
            <Text style={styles.viewerSideLabel}>Highlights</Text>
            <Text style={styles.viewerSideTitle}>Jump between scenes faster</Text>
            <Text style={styles.viewerSideText}>
              Browser view keeps the scene list and layout map beside the pano so the walkthrough stays immersive while navigation stays close by.
            </Text>
          </View>

          {hasLayoutMap ? (
            <View style={styles.viewerSideSection}>
              <Text style={styles.viewerSectionTitle}>Layout</Text>
              <TourLayoutMap
                nodes={orderedNodes}
                activeNodeId={activeNode.id}
                onSelectNode={nodeId => goToNode(nodeId)}
                compact
                showLabels={false}
              />
            </View>
          ) : null}

          <View style={styles.viewerSideSection}>
            <Text style={styles.viewerSectionTitle}>Scenes</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewerSideList}>
              {highlightsMarkup}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  containerDesktop: {
    flexDirection: 'row',
  },
  viewerStage: {
    flex: 1,
    position: 'relative',
  },
  viewerStageDesktop: {
    minWidth: 0,
  },
  viewerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  transitionShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0407',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0407',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#C9A84C',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#0D0407',
    fontWeight: '800',
  },
  topOverlay: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  topOverlayDesktop: {
    top: 76,
    left: 24,
    right: undefined,
    alignItems: 'flex-start',
  },
  titlePill: {
    backgroundColor: 'rgba(26,5,9,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  titlePillDesktop: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 280,
  },
  tourTitleText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  roomTitleText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  sceneTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sceneStepText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  inlineErrorBox: {
    position: 'absolute',
    top: 124,
    alignSelf: 'center',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.24)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  inlineErrorBoxDesktop: {
    top: 132,
    left: 24,
    right: undefined,
    alignSelf: 'flex-start',
  },
  inlineErrorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 260,
    pointerEvents: 'box-none',
  },
  layoutPanel: {
    position: 'absolute',
    left: 14,
    width: 160,
    backgroundColor: 'rgba(26,5,9,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 18,
    padding: 10,
  },
  layoutPanelHeader: {
    marginBottom: 8,
  },
  layoutPanelTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  layoutPanelHint: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    marginTop: 2,
  },
  viewerBackButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    zIndex: 3,
    backgroundColor: 'rgba(26,5,9,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  viewerBackButtonDesktop: {
    top: 24,
    left: 24,
  },
  viewerBackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepMarkerWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  stepMarkerWrapLarge: {
    width: 84,
  },
  stepMarkerWrapSmall: {
    width: 68,
  },
  stepMarker: {
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerLarge: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  stepMarkerSmall: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  stepMarkerInner: {
    transform: [{ rotate: '-45deg' }],
  },
  stepMarkerLabel: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(13,4,7,0.84)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,168,76,0.14)',
  },
  bottomBarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomBarHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  highlightsToggle: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  highlightsToggleText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
  },
  highlightsPanel: {
    backgroundColor: 'rgba(13,4,7,0.88)',
    paddingBottom: 18,
  },
  highlightsContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  highlightCard: {
    width: 118,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 8,
  },
  highlightCardDesktop: {
    width: '100%',
    marginHorizontal: 0,
    marginBottom: 10,
  },
  highlightCardActive: {
    borderColor: '#C9A84C',
    backgroundColor: '#22070B',
  },
  highlightImageWrap: {
    width: '100%',
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#120408',
    marginBottom: 8,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#120408',
  },
  highlightFallbackText: {
    color: '#C9A84C',
    fontSize: 24,
    fontWeight: '800',
  },
  highlightStep: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  highlightRoom: {
    color: '#C9A84C',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  highlightLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  highlightLabelActive: {
    color: '#C9A84C',
  },
  viewerSidePanel: {
    width: 340,
    backgroundColor: '#120408',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(201,168,76,0.14)',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
  },
  viewerSideHeader: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  viewerSideLabel: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  viewerSideTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  viewerSideText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 20,
  },
  viewerSideSection: {
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.16)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    flexShrink: 1,
  },
  viewerSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  viewerSideList: {
    paddingBottom: 8,
  },
});
