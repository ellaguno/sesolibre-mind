import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

// Los juegos están diseñados solo para vertical. En Android lo fija el
// AndroidManifest y en la PWA instalada el manifest ("orientation":
// "portrait"); esto cubre además los navegadores que permiten bloquear la
// orientación desde JS (en el resto falla en silencio).
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};
(screen.orientation as LockableOrientation)?.lock?.('portrait').catch(() => {
  /* no soportado fuera de pantalla completa / app instalada */
});

// Service worker (caché offline) sólo en la web. En la app nativa los archivos
// ya vienen dentro del APK y el SW serviría la versión anterior tras cada
// actualización; si quedó uno registrado de una versión previa, se elimina.
if (Capacitor.isNativePlatform()) {
  void navigator.serviceWorker
    ?.getRegistrations()
    .then((regs) => regs.forEach((r) => void r.unregister()));
} else {
  void import('virtual:pwa-register').then(({ registerSW }) =>
    registerSW({ immediate: true }),
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter: compatible con file://capacitor:// en WebView nativo */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
