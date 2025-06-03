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
    Keyboard: {
      resize: 'none', // verhindert das Verschieben des Layouts
      style: 'dark', // optional: Tastatur-Style
    },
  },
};

export default config;