import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

// ⚠️ IMPORTANT: For testing on a physical device, replace 'localhost' with your computer's LAN IP
// e.g. 'http://192.168.1.XX:5173'
const WEB_APP_URL = 'http://192.168.18.105:5174';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000000" translucent={true} />
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}
        containerStyle={styles.webview}
        
        // Performance & UI Optimizations
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false} // Important for responsive web
        
        // Native feel
        bounces={false} // Disable iOS rubber band on the webview itself
        overScrollMode="never" // Disable Android overscroll glow
        backgroundColor="#000000" // Prevent white flash during load
        
        // Inject JS to ensure proper scaling/setup if needed
        injectedJavaScript={`
          const meta = document.createElement('meta');
          meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
          meta.setAttribute('name', 'viewport');
          document.getElementsByTagName('head')[0].appendChild(meta);
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
