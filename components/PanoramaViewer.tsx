import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  imageUrl: string;
};

export default function PanoramaViewer({ imageUrl }: Props) {
  const webRef = useRef<WebView>(null);

  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (imageUrl === currentUrl) return;

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentUrl(imageUrl);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });
  }, [imageUrl]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: black;
        }
        #viewer {
          width: 100vw;
          height: 100vh;
        }
      </style>

      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
      <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
    </head>

    <body>
      <div id="viewer"></div>

      <script>
        const viewer = pannellum.viewer('viewer', {
          type: 'equirectangular',
          panorama: '${currentUrl}',
          autoLoad: true,

          hfov: 100,
          minHfov: 50,
          maxHfov: 120,

          showControls: false,
          mouseZoom: true,
          draggable: true,
          touchZoom: true
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled
          domStorageEnabled
          style={styles.webview}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'black',
  },
});