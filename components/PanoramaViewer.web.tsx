import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BackSide, SRGBColorSpace, TextureLoader } from 'three';
import { getPanoramaValidationMessage } from '../lib/panoramaValidation';

type Props = {
  imageUrl: string;
  onError?: (message: string) => void;
};

type ControlState = {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
};

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
  const texture = useLoader(TextureLoader, imageUrl);
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

    camera.fov = 72;
    camera.updateProjectionMatrix();
    onReady();
  }, [camera, onInvalid, onReady, texture]);

  useFrame(() => {
    const state = controls.current;
    state.yaw += (state.targetYaw - state.yaw) * 0.12;
    state.pitch += (state.targetPitch - state.pitch) * 0.12;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  );
}

export default function PanoramaViewer({ imageUrl, onError }: Props) {
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const lastPoint = useRef({ x: 0, y: 0 });
  const controls = useRef<ControlState>({
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  });

  useEffect(() => {
    setReady(false);
    setErrorMessage(null);
    controls.current.yaw = 0;
    controls.current.pitch = 0;
    controls.current.targetYaw = 0;
    controls.current.targetPitch = 0;
  }, [imageUrl]);

  const handleError = (message: string) => {
    setErrorMessage(message);
    onError?.(message);
  };

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
    <View
      style={styles.container}
      onPointerDown={(event: any) => {
        setDragging(true);
        lastPoint.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event: any) => {
        if (!dragging) return;

        const dx = event.clientX - lastPoint.current.x;
        const dy = event.clientY - lastPoint.current.y;
        lastPoint.current = { x: event.clientX, y: event.clientY };

        const sensitivity = 0.005;
        controls.current.targetYaw -= dx * sensitivity;
        controls.current.targetPitch = clampPitch(controls.current.targetPitch - dy * sensitivity);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <PanoramaErrorBoundary onError={handleError}>
        <Canvas style={styles.canvas}>
          <Suspense fallback={null}>
            <PanoramaScene
              imageUrl={imageUrl}
              controls={controls}
              onReady={() => setReady(true)}
              onInvalid={handleError}
            />
          </Suspense>
        </Canvas>
      </PanoramaErrorBoundary>

      {!ready ? (
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
    touchAction: 'none',
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
