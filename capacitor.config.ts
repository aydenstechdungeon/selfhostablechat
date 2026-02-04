import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.selfhostablechat.app',
  appName: 'SelfHostableChat',
  webDir: 'build/client',
  server: isDev ? {
    // Development: use local dev server
    url: 'http://localhost:5173',
    cleartext: true,
    androidScheme: 'http'
  } : {
    // Production: use embedded assets
    // The server will run separately bundled with the app
    url: 'http://localhost:3422',
    cleartext: true,
    androidScheme: 'http',
    hostname: 'localhost',
    iosScheme: 'capacitor'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;
