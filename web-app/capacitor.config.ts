import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.luxresilient.app',
  appName: 'Lux',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "337956413837-50tlt5kf1l8o39bobc1bispknmun857o.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    CapacitorHttp: {
      enabled: false // <--- CRÍTICO: Desactivado para no romper Supabase (interceptaba fetch global). Usa CapacitorHttp manualmente en tus APIs si necesitas bypass de CORS.
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
