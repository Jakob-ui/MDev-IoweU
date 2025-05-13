import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'IoweU',
  webDir: 'www',
  plugins: {
    Keyboard: {
      resize: 'ionic',
    },
  },
};

export default config;