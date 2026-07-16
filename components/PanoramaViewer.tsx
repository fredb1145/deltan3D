import { Asset } from 'expo-asset';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber/native';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { BackSide, PerspectiveCamera, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { getPanoramaValidationMessage } from '../lib/panoramaValidation';

type Props = {
  imageUrl: string;
  onError?: (message: string) => void;
  onReady?: () => void;
  showLoadingOverlay?: boolean;
};

type ControlState = {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  fov: number;
  targetFov: number;
};

const LOAD_RETRY_DELAYS_MS = [0, 500, 1200];

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDownloadedImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

async function downloadPanoramaSource(url: string): Promise<{
  uri: string;
  width: number;
  height: number;
}> {
  let lastError: unknown;

  for (let attempt = 0; attempt < LOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      if (LOAD_RETRY_DELAYS_MS[attempt] > 0) {
        await wait(LOAD_RETRY_DELAYS_MS[attempt]);
      }

      const asset = Asset.fromURI(url);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      const imageSize = await getDownloadedImageSize(uri);

      return {
        uri,
        width: imageSize.width,
        height: imageSize.height,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Could not load ${url}`);
}

class NativePanoramaTextureLoader extends TextureLoader {
  load(
    url: string,
    onLoad?: (texture: Texture<HTMLImageElement>) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (event: unknown) => void,
  ) {
    const resolvedUrl = this.path && typeof url === 'string' ? this.path + url : url;
    const texture = new Texture() as Texture<HTMLImageElement>;

    this.manager.itemStart(resolvedUrl);

    downloadPanoramaSource(resolvedUrl)
      .then(({ uri, width, height }) => {
        texture.image = {
          data: { localUri: uri },
          width,
          height,
        } as any;
        texture.flipY = true;
        texture.needsUpdate = true;
        texture.colorSpace = SRGBColorSpace;
        (texture as any).isDataTexture = true;

        onLoad?.(texture);
        this.manager.itemEnd(resolvedUrl);
      })
      .catch(error => {
        onError?.(error);
        this.manager.itemError(resolvedUrl);
        this.manager.itemEnd(resolvedUrl);
      });

    return texture;
  }
}

class PanoramaErrorBoundary extends React.Component<
  {
    onError: (message: string) => void;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError('This 360 photo could not be loaded.');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function clampPitch(value: number) {
  const limit = Math.PI / 2 - 0.12;
  return Math.max(-limit, Math.min(limit, value));
}

function clampFov(value: number) {
  return Math.max(40, Math.min(95, value));
}

function PanoramaScene({
  imageUrl,
  controls,
  onReady,
  onInvalid,
}: {
  imageUrl: string;
  controls: React.MutableRefObject<ControlState>;
  onReady: () => void;
  onInvalid: (message: string) => void;
}) {
  const texture = useLoader(NativePanoramaTextureLoader, imageUrl);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.colorSpace = SRGBColorSpace;
    }
  }, [texture]);

  useEffect(() => {
    const image = texture?.image as { width?: number; height?: number } | undefined;
    const width = image?.width || 0;
    const height = image?.height || 0;
    const message = getPanoramaValidationMessage(width, height);

    if (message) {
      onInvalid(message);
      return;
    }

    const panoramaCamera = camera as PerspectiveCamera;
    panoramaCamera.fov = 72;
    panoramaCamera.updateProjectionMatrix();
    onReady();
  }, [camera, onInvalid, onReady, texture]);

  useFrame(() => {
    const state = controls.current;
    state.yaw += (state.targetYaw - state.yaw) * 0.12;
    state.pitch += (state.targetPitch - state.pitch) * 0.12;
    state.fov += (state.targetFov - state.fov) * 0.18;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
    const panoramaCamera = camera as PerspectiveCamera;
    panoramaCamera.fov = state.fov;
    panoramaCamera.updateProjectionMatrix();
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}

export default function PanoramaViewer({
  imageUrl,
  onError,
  onReady,
  showLoadingOverlay = true,
}: Props) {
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const controls = useRef<ControlState>({
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    fov: 72,
    targetFov: 72,
  });
  const gestureRef = useRef({
    startYaw: 0,
    startPitch: 0,
    startFov: 72,
    pinchDistance: 0,
  });

  useEffect(() => {
    setReady(false);
    setErrorMessage(null);
    controls.current.yaw = 0;
    controls.current.pitch = 0;
    controls.current.targetYaw = 0;
    controls.current.targetPitch = 0;
    controls.current.fov = 72;
    controls.current.targetFov = 72;
    gestureRef.current.startYaw = 0;
    gestureRef.current.startPitch = 0;
    gestureRef.current.startFov = 72;
    gestureRef.current.pinchDistance = 0;
  }, [imageUrl]);

  const handleError = (message: string) => {
    setErrorMessage(message);
    onError?.(message);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          controls.current.yaw = controls.current.targetYaw;
          controls.current.pitch = controls.current.targetPitch;
          controls.current.fov = controls.current.targetFov;
          gestureRef.current.startYaw = controls.current.targetYaw;
          gestureRef.current.startPitch = controls.current.targetPitch;
          gestureRef.current.startFov = controls.current.targetFov;

          if (event.nativeEvent.touches.length >= 2) {
            const [firstTouch, secondTouch] = event.nativeEvent.touches;
            const dx = secondTouch.pageX - firstTouch.pageX;
            const dy = secondTouch.pageY - firstTouch.pageY;
            gestureRef.current.pinchDistance = Math.hypot(dx, dy);
          } else {
            gestureRef.current.pinchDistance = 0;
          }
        },
        onPanResponderMove: (event, gesture) => {
          if (event.nativeEvent.touches.length >= 2) {
            const [firstTouch, secondTouch] = event.nativeEvent.touches;
            const dx = secondTouch.pageX - firstTouch.pageX;
            const dy = secondTouch.pageY - firstTouch.pageY;
            const nextDistance = Math.hypot(dx, dy);

            if (!gestureRef.current.pinchDistance) {
              gestureRef.current.pinchDistance = nextDistance;
              gestureRef.current.startFov = controls.current.targetFov;
              return;
            }

            const pinchDelta = nextDistance - gestureRef.current.pinchDistance;
            controls.current.targetFov = clampFov(
              gestureRef.current.startFov - pinchDelta * 0.08,
            );
            return;
          }

          const sensitivity = 0.005;
          controls.current.targetYaw = gestureRef.current.startYaw + gesture.dx * sensitivity;
          controls.current.targetPitch = clampPitch(
            gestureRef.current.startPitch + gesture.dy * sensitivity,
          );
        },
        onPanResponderRelease: () => {
          gestureRef.current.pinchDistance = 0;
          gestureRef.current.startYaw = controls.current.targetYaw;
          gestureRef.current.startPitch = controls.current.targetPitch;
          gestureRef.current.startFov = controls.current.targetFov;
        },
        onPanResponderTerminate: () => {
          gestureRef.current.pinchDistance = 0;
        },
      }),
    [],
  );

  if (!imageUrl) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <PanoramaErrorBoundary onError={handleError}>
        <Canvas style={styles.canvas}>
          <Suspense fallback={null}>
            <PanoramaScene
              imageUrl={imageUrl}
              controls={controls}
              onReady={() => {
                setReady(true);
                onReady?.();
              }}
              onInvalid={handleError}
            />
          </Suspense>
        </Canvas>
      </PanoramaErrorBoundary>

      {!ready && showLoadingOverlay ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#C9A84C" />
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
  canvas: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,4,7,0.35)',
  },
  center: {
    flex: 1,
    backgroundColor: '#0D0407',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
});
