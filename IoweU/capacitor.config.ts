import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ioweu.eu',
  appName: 'IoweU',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['apple.com', 'google.com'],
    },
    // @ts-ignore: Keyboard is a valid Capacitor plugin config
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;