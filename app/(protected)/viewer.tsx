import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import PanoramaViewer from '../../components/PanoramaViewer';

export default function ViewerTabScreen() {
  const { imageUrl } = useLocalSearchParams<{ imageUrl: string }>();

  if (!imageUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0407', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0407' }}>
      <PanoramaViewer imageUrl={imageUrl} />
    </View>
  );
}
