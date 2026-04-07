import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ViewerTabScreen() {
  const { imageUrl } = useLocalSearchParams<{ imageUrl: string }>();

  const html = useMemo(() => {
    if (!imageUrl) return '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #000;
              overflow: hidden;
            }
            #viewer {
              width: 100vw;
              height: 100vh;
            }
          </style>

          <link rel="stylesheet" href="https://unpkg.com/photo-sphere-viewer@5/dist/photo-sphere-viewer.css" />

          <script src="https://unpkg.com/three@0.152.2/build/three.min.js"></script>
          <script src="https://unpkg.com/photo-sphere-viewer@5/dist/photo-sphere-viewer.js"></script>
        </head>

        <body>
          <div id="viewer"></div>

          <script>
            const viewer = new PhotoSphereViewer.Viewer({
              container: document.getElementById('viewer'),
              panorama: "${imageUrl}",
              navbar: false,
              loadingImg: null,
              defaultZoomLvl: 50,
            });
          </script>
        </body>
      </html>
    `;
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0407', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0407' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        style={{ flex: 1, backgroundColor: '#0D0407' }}
      />
    </View>
  );
}