import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PanoramaViewer from '../../components/PanoramaViewer';
import { createSignedPanoramaUrl } from '../../lib/panoramaUpload';
import { getPanoramaValidationMessage } from '../../lib/panoramaValidation';
import { supabase } from '../../lib/supabase';

type NodeType = {
  id: string;
  label: string;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  forward?: string | null;
  back?: string | null;
  left?: string | null;
  right?: string | null;
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidNode(value: any): value is NodeType {
  return (
    value &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.imagePath === 'string' &&
    value.imagePath.trim().length > 0
  );
}

export default function TourViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [currentNode, setCurrentNode] = useState<NodeType | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setInitialLoading(false);
      setErrorMessage('This tour could not be opened.');
      return;
    }

    loadTour();
  }, [id]);

  const loadTour = async () => {
    setInitialLoading(true);
    setErrorMessage(null);
    setImageUrl(null);

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
    const tourNodes = rawNodes.filter(isValidNode).filter(node => {
      if (!node.imageWidth || !node.imageHeight) return true;
      return !getPanoramaValidationMessage(node.imageWidth, node.imageHeight);
    });

    if (!tourNodes.length) {
      setInitialLoading(false);
      setErrorMessage('This tour does not have any valid scenes yet.');
      return;
    }

    setNodes(tourNodes);
    const firstNode = tourNodes[0];
    setCurrentNode(firstNode);

    const ok = await loadImage(firstNode.imagePath, true);

    if (!ok) {
      setInitialLoading(false);
      setErrorMessage('Could not load this 360 photo.');
      return;
    }

    setInitialLoading(false);
  };

  const loadImage = async (path: string, isInitial = false) => {
    if (!path || !path.trim()) {
      setImageUrl(null);
      return false;
    }

    if (isInitial) {
      setInitialLoading(true);
    } else {
      setSceneLoading(true);
    }

    setErrorMessage(null);

    const normalizedPath = path.trim();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const signedUrl = await createSignedPanoramaUrl(normalizedPath);
        const nextUrl = `${signedUrl}${signedUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setImageUrl(nextUrl);

        if (isInitial) {
          setInitialLoading(false);
        } else {
          setSceneLoading(false);
        }

        return true;
      } catch (error) {
        if (attempt < 3) {
          await delay(700);
        }
      }
    }

    if (isInitial) {
      setInitialLoading(false);
    } else {
      setSceneLoading(false);
    }

    return false;
  };

  const goToNode = async (nodeId?: string | null) => {
    if (!nodeId) return;

    const nextNode = nodes.find(node => node.id === nodeId);
    if (!nextNode) return;

    setCurrentNode(nextNode);

    const ok = await loadImage(nextNode.imagePath, false);

    if (!ok) {
      setErrorMessage('Could not load this 360 photo.');
    }
  };

  const retryCurrentNode = async () => {
    if (!currentNode) return;

    setErrorMessage(null);
    const ok = await loadImage(currentNode.imagePath, !imageUrl);

    if (!ok) {
      setErrorMessage('Could not load this 360 photo.');
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (!currentNode || !imageUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {errorMessage || 'Could not load this 360 photo.'}
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={retryCurrentNode}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PanoramaViewer
        key={imageUrl}
        imageUrl={imageUrl}
        onError={(message) => setErrorMessage(message)}
      />

      {sceneLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#C9A84C" />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.inlineErrorBox}>
          <Text style={styles.inlineErrorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.controlsContainer}>
        {currentNode.left ? (
          <TouchableOpacity
            style={[styles.button, styles.left]}
            onPress={() => goToNode(currentNode.left)}
          >
            <Text style={styles.text}>◀</Text>
          </TouchableOpacity>
        ) : null}

        {currentNode.right ? (
          <TouchableOpacity
            style={[styles.button, styles.right]}
            onPress={() => goToNode(currentNode.right)}
          >
            <Text style={styles.text}>▶</Text>
          </TouchableOpacity>
        ) : null}

        {currentNode.forward ? (
          <TouchableOpacity
            style={[styles.button, styles.forward]}
            onPress={() => goToNode(currentNode.forward)}
          >
            <Text style={styles.text}>▲</Text>
          </TouchableOpacity>
        ) : null}

        {currentNode.back ? (
          <TouchableOpacity
            style={[styles.button, styles.back]}
            onPress={() => goToNode(currentNode.back)}
          >
            <Text style={styles.text}>▼</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.labelBox}>
        <Text style={styles.labelText}>{currentNode.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,4,7,0.18)',
  },
  inlineErrorBox: {
    position: 'absolute',
    top: 108,
    alignSelf: 'center',
    backgroundColor: '#1A0509',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.24)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  inlineErrorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 100,
    width: '100%',
    height: 200,
  },
  button: {
    position: 'absolute',
    backgroundColor: '#C9A84C',
    padding: 14,
    borderRadius: 40,
  },
  text: {
    color: '#0D0407',
    fontWeight: 'bold',
    fontSize: 18,
  },
  forward: {
    bottom: 40,
    alignSelf: 'center',
  },
  back: {
    bottom: 0,
    alignSelf: 'center',
  },
  left: {
    bottom: 20,
    left: 40,
  },
  right: {
    bottom: 20,
    right: 40,
  },
  labelBox: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#1A0509',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  labelText: {
    color: '#C9A84C',
    fontWeight: '600',
  },
});
