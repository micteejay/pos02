import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.pos02',
  appName: 'POS',
  webDir: 'dist',
  /* server: {
    url: 'https://0a6d3734-6688-4546-912e-4413ab493183.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  }, */
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
