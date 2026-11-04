import type { ReactNode } from 'react';
import Screen from '../ui/Screen';
import { useSettings, type LangSetting } from '../core/settings';
import { AudioService } from '../core/AudioService';
import { useT } from '../core/i18n';
import { useLevels, type StartChoice } from '../core/levels';

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-app-muted">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        aria-label={label}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-app-surface2'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3">
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-app-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const {
    theme,
    sound,
    motion,
    lang,
    colorblind,
    toggleTheme,
    setSound,
    setMotion,
    setLang,
    setColorblind,
  } = useSettings();
  const start = useLevels((s) => s.start);
  const chooseStart = useLevels((s) => s.choose);

  return (
    <Screen title={t('settings.title')}>
      <div className="flex flex-col gap-3">
        <ToggleRow
          label={t('settings.darkTheme')}
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        <ToggleRow
          label={t('settings.sound')}
          checked={sound}
          onChange={() => {
            const next = !sound;
            setSound(next);
            if (next) AudioService.play('pop');
          }}
        />
        <ToggleRow
          label={t('settings.animations')}
          checked={motion}
          onChange={() => setMotion(!motion)}
        />
        <ToggleRow
          label={t('settings.colorblind')}
          hint={t('settings.colorblindHint')}
          checked={colorblind}
          onChange={() => setColorblind(!colorblind)}
        />
        <Row label={t('settings.startLevel')} hint={t('settings.startLevelHint')}>
          <select
            value={start ?? 'normal'}
            aria-label={t('settings.startLevel')}
            onChange={(e) => chooseStart(e.target.value as StartChoice)}
            className="rounded-lg border border-app-border bg-app-surface2 p-2 text-app-text"
          >
            <option value="basic">{t('start.basic')}</option>
            <option value="normal">{t('start.normal')}</option>
            <option value="challenge">{t('start.challenge')}</option>
          </select>
        </Row>
        <Row label={t('settings.language')}>
          <select
            value={lang}
            aria-label={t('settings.language')}
            onChange={(e) => setLang(e.target.value as LangSetting)}
            className="rounded-lg border border-app-border bg-app-surface2 p-2 text-app-text"
          >
            <option value="auto">{t('lang.auto')}</option>
            <option value="es">{t('lang.es')}</option>
            <option value="en">{t('lang.en')}</option>
          </select>
        </Row>
      </div>
    </Screen>
  );
}
