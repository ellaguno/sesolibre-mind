import { blockedInitials } from '../core/online';
import InitialsInput from '../ui/InitialsInput';
import type { ReactNode } from 'react';
import Screen from '../ui/Screen';
import { useSettings, type LangSetting } from '../core/settings';
import { AudioService } from '../core/AudioService';
import { useT } from '../core/i18n';
import { useLevels, type StartChoice } from '../core/levels';
import { useState } from 'react';
import {
  remindersSupported,
  requestReminderPermission,
  syncReminder,
} from '../core/reminder';

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
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-2.5">
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-2.5">
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
    serene,
    toggleTheme,
    setSound,
    setMotion,
    setLang,
    setColorblind,
    setSerene,
    compare,
    initials,
    setCompare,
    setInitials,
    reminder,
    reminderTime,
    setReminder,
  } = useSettings();
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  const toggleReminder = async () => {
    setReminderMsg(null);
    if (reminder) {
      setReminder(false);
      await syncReminder();
      return;
    }
    if (!(await requestReminderPermission())) {
      setReminderMsg(t('reminder.denied'));
      return;
    }
    setReminder(true);
    await syncReminder();
    setReminderMsg(t('reminder.on', { time: reminderTime }));
  };
  const start = useLevels((s) => s.start);
  const chooseStart = useLevels((s) => s.choose);

  return (
    <Screen title={t('settings.title')}>
      <div className="flex flex-col gap-2">
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
        {remindersSupported() ? (
          <>
            <ToggleRow
              label={t('settings.reminder')}
              hint={t('settings.reminderHint')}
              checked={reminder}
              onChange={() => void toggleReminder()}
            />
            {reminder && (
              <Row label={t('settings.reminderTime')}>
                <input
                  type="time"
                  value={reminderTime}
                  aria-label={t('settings.reminderTime')}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setReminder(true, e.target.value);
                    void syncReminder();
                  }}
                  className="rounded-lg border border-app-border bg-app-surface2 p-2 text-app-text"
                />
              </Row>
            )}
            {reminderMsg && (
              <p className="px-1 text-sm text-app-muted" aria-live="polite">
                {reminderMsg}
              </p>
            )}
          </>
        ) : null}
        <ToggleRow
          label={t('settings.serene')}
          hint={t('settings.sereneHint')}
          checked={serene}
          onChange={() => setSerene(!serene)}
        />
        <ToggleRow
          label={t('settings.colorblind')}
          hint={t('settings.colorblindHint')}
          checked={colorblind}
          onChange={() => setColorblind(!colorblind)}
        />
        <ToggleRow
          label={t('settings.compare')}
          hint={t('settings.compareHint')}
          checked={compare}
          onChange={() => setCompare(!compare)}
        />
        {compare && (
          <Row label={t('settings.initials')} hint={t('settings.initialsHint')}>
            <InitialsInput
              value={initials}
              onChange={setInitials}
              label={t('settings.initials')}
            />
          </Row>
        )}
        {compare && blockedInitials(initials) && (
          <p className="px-1 text-sm text-red-400" aria-live="polite">
            {t('online.badInitials')}
          </p>
        )}
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
            onChange={(e) => {
              setLang(e.target.value as LangSetting);
              // El texto de las notificaciones sigue al idioma.
              void syncReminder();
            }}
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
