import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HubScreen from './hub/HubScreen';
import GameHost from './hub/GameHost';
import SettingsScreen from './hub/SettingsScreen';
import SessionScreen from './hub/SessionScreen';
import ProfileScreen from './hub/ProfileScreen';
import { useSettings } from './core/settings';
import { useRewards } from './core/RewardService';
import { useTutorials } from './core/tutorials';
import ParticleOverlay from './anim/ParticleOverlay';
import RouteTransition from './anim/RouteTransition';
import { resolveLang } from './core/i18n';

export default function App() {
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrateRewards = useRewards((s) => s.hydrate);
  const hydrateTutorials = useTutorials((s) => s.hydrate);
  useEffect(() => {
    void hydrateSettings();
    void hydrateRewards();
    void hydrateTutorials();
  }, [hydrateSettings, hydrateRewards, hydrateTutorials]);

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
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/play/:id" element={<GameHost />} />
        </Routes>
      </RouteTransition>
    </>
  );
}
