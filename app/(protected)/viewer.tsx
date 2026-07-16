import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import PanoramaViewer from '../../components/PanoramaViewer';
import WorkspaceWebPage from '../../components/WorkspaceWebPage';

export default function ViewerTabScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1100;
  const { imageUrl } = useLocalSearchParams<{ imageUrl: string }>();

  const emptyState = (
    <View style={styles.emptyWrap}>
      <ActivityIndicator color="#C9A84C" />
      <Text style={styles.emptyText}>Preparing viewer...</Text>
    </View>
  );

  if (!imageUrl) {
    if (isDesktop) {
      return (
        <WorkspaceWebPage
          activeRoute="/explore"
          eyebrow="Viewer"
          title="Open a 360 preview in a cleaner browser workspace"
          description="Use the browser to preview panoramas with more room around the viewer instead of dropping the mobile screen into a wide desktop canvas."
        >
          {emptyState}
        </WorkspaceWebPage>
      );
    }

    return <View style={styles.mobileWrap}>{emptyState}</View>;
  }

  const viewer = (
    <View style={styles.viewerWrap}>
      {isDesktop ? (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      ) : null}

      <PanoramaViewer imageUrl={imageUrl} />
    </View>
  );

  if (isDesktop) {
    return (
      <WorkspaceWebPage
        activeRoute="/explore"
        eyebrow="Viewer"
        title="Preview a 360 scene in a browser-friendly viewer"
        description="Use the wider browser layout for scene inspection while keeping the same underlying pano renderer used in the app."
      >
        {viewer}
      </WorkspaceWebPage>
    );
  }

  return <View style={styles.mobileWrap}>{viewer}</View>;
}

const styles = StyleSheet.create({
  mobileWrap: {
    flex: 1,
    backgroundColor: '#0D0407',
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: '#0D0407',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontWeight: '700',
  },
  viewerWrap: {
    flex: 1,
    minHeight: 640,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0D0407',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 18,
    left: 18,
    zIndex: 3,
    backgroundColor: 'rgba(26,5,9,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
