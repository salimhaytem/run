import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PACE',
  slug: 'pace',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png', // run: npm run assets from repo root
  scheme: 'pace',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0F14',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pace.running',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'PACE utilise votre position pour le tracking et la découverte de runners.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'PACE suit votre course en arrière-plan.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B0F14',
    },
    package: 'com.pace.running',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION'],
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Autoriser PACE à suivre votre course.',
      },
    ],
    'expo-notifications',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: 'pace-running',
    },
  },
});
