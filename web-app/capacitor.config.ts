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
      serverClientId: "770116190928-8o5hunfe5m2ue5db4h1sqdpa0vo9cc9v.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
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
