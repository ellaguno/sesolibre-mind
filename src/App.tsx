import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { listenReminderTaps, syncReminder } from './core/reminder';
import HubScreen from './hub/HubScreen';
import GameHost from './hub/GameHost';
import SettingsScreen from './hub/SettingsScreen';
import SessionScreen from './hub/SessionScreen';
import ProfileScreen from './hub/ProfileScreen';
import ProfilesScreen from './hub/ProfilesScreen';
import ChallengeScreen from './hub/ChallengeScreen';
import { useProfiles } from './core/profiles';
import { useSettings } from './core/settings';
import { useRewards } from './core/RewardService';
import { useTutorials } from './core/tutorials';
import { useLevels } from './core/levels';
import ParticleOverlay from './anim/ParticleOverlay';
import RouteTransition from './anim/RouteTransition';
import { resolveLang } from './core/i18n';

export default function App() {
  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrateRewards = useRewards((s) => s.hydrate);
  const hydrateTutorials = useTutorials((s) => s.hydrate);
  const hydrateLevels = useLevels((s) => s.hydrate);
  const initProfiles = useProfiles((s) => s.init);
  const profilesReady = useProfiles((s) => s.ready);
  useEffect(() => {
    // Primero el perfil activo (fija dónde se leen los datos); luego hidratar
    // todo y reprogramar el recordatorio diario (app nativa).
    void initProfiles().then(() => {
      void hydrateSettings().then(() => syncReminder());
      void hydrateRewards();
      void hydrateTutorials();
      void hydrateLevels();
    });
  }, [initProfiles, hydrateSettings, hydrateRewards, hydrateTutorials, hydrateLevels]);

  // Tocar la notificación del recordatorio abre la sesión del día.
  const navigate = useNavigate();
  useEffect(() => {
    let off = () => {};
    void listenReminderTaps((route) => navigate(route)).then((f) => (off = f));
    return () => off();
  }, [navigate]);

  // <html lang> sigue al idioma elegido (lectores de pantalla / TalkBack).
  const lang = useSettings((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = resolveLang(lang);
  }, [lang]);

  // Nada se lee del almacenamiento antes de saber de qué perfil.
  if (!profilesReady) return null;

  return (
    <>
      <ParticleOverlay />
      <RouteTransition>
        <Routes>
          <Route path="/" element={<HubScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profiles" element={<ProfilesScreen />} />
          <Route path="/challenge" element={<ChallengeScreen />} />
          <Route path="/play/:id" element={<GameHost />} />
        </Routes>
      </RouteTransition>
    </>
  );
}
