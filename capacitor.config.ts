import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cloudstream.explorer',
  appName: 'CloudStream',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation: [
      "accounts.google.com",
      "drive.google.com",
      "*.googleapis.com"
    ]
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
      clientId: "YOUR_CLIENT_ID_GOES_HERE", // NOTE: In native mode, this is often handled by google-services.json, but good to have here fallback
      forceCodeForRefreshToken: true
    }
  }
};

export default config;