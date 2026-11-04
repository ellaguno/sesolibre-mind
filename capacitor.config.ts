import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sesolibre.mind',
  appName: 'SesoLibre Mind',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      // Ícono blanco de la barra de estado (native/android/res, lo copian los scripts).
      smallIcon: 'ic_stat_mind',
      iconColor: '#6366f1',
    },
  },
  // Android/iOS se agregan con `npx cap add android` en la fase de empaquetado.
};

export default config;
