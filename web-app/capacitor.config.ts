import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luxresilient.app',
  appName: 'Lux',
  webDir: 'dist',
  // The WebView's own colour shows through for any frame a layer isn't drawn
  // yet; dark like the app instead of the default white (no white flashes).
  backgroundColor: '#020204',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "797112490087-7bp66hii56d6b17sgtcpmm3dhf93pqek.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    CapacitorHttp: {
      enabled: false // <--- CRÍTICO: Desactivado para no romper Supabase (interceptaba fetch global). Usa CapacitorHttp manualmente en tus APIs si necesitas bypass de CORS.
    },
    LocalNotifications: {
      smallIcon: "ic_stat_lux",
      iconColor: "#a855f7",
      sound: "lux_sound.wav"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#020204",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    }
  }
};

export default config;
