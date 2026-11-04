import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HubScreen from './hub/HubScreen';
import GameHost from './hub/GameHost';
import SettingsScreen from './hub/SettingsScreen';
import { useSettings } from './core/settings';
import { useRewards } from './core/RewardService';
import ParticleOverlay from './anim/ParticleOverlay';
import RouteTransition from './anim/RouteTransition';
import { resolveLang } from './core/i18n';

export default function App() {
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrateRewards = useRewards((s) => s.hydrate);
  useEffect(() => {
    void hydrateSettings();
    void hydrateRewards();
  }, [hydrateSettings, hydrateRewards]);

  // <html lang> sigue al idioma elegido (lectores de pantalla / TalkBack).
  const lang = useSettings((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = resolveLang(lang);
  }, [lang]);

  return (
    <>
      <ParticleOverlay />
      <RouteTransition>
        <Routes>
          <Route path="/" element={<HubScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/play/:id" element={<GameHost />} />
        </Routes>
      </RouteTransition>
    </>
  );
}
