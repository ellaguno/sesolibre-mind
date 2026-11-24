import { useState } from 'react';
import { useT } from '../core/i18n';
import { useSettings } from '../core/settings';
import {
  remindersSupported,
  requestReminderPermission,
  syncReminder,
} from '../core/reminder';

/** Hora del recordatorio que se ofrece desde el inicio. */
const MORNING = '08:00';

/**
 * Oferta, una sola vez y sólo en la app nativa, del recordatorio de la mañana
 * para la sesión del día. Se muestra cuando ya se jugó alguna sesión (`show`).
 */
export default function ReminderInvite({ show }: { show: boolean }) {
  const t = useT();
  const { loaded, reminder, reminderAsked, setReminder, setReminderAsked } =
    useSettings();
  const [msg, setMsg] = useState<string | null>(null);
  if (!remindersSupported() || !loaded || (!msg && (!show || reminder || reminderAsked)))
    return null;

  const accept = async () => {
    setReminderAsked();
    if (!(await requestReminderPermission())) {
      setMsg(t('reminder.denied'));
      return;
    }
    setReminder(true, MORNING);
    await syncReminder();
    setMsg(t('reminder.on', { time: MORNING }));
  };

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-app-border bg-app-surface p-4">
      {msg ? (
        <p className="text-sm" aria-live="polite">
          {msg}
        </p>
      ) : (
        <>
          <p className="font-semibold">☀️ {t('reminder.invite')}</p>
          <p className="text-sm text-app-muted">{t('reminder.inviteHint')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => void accept()}
              className="flex-1 rounded-xl bg-brand px-3 py-2 font-semibold text-white hover:opacity-90"
            >
              {t('reminder.inviteYes', { time: MORNING })}
            </button>
            <button
              onClick={setReminderAsked}
              className="rounded-xl bg-app-surface2 px-3 py-2 font-semibold hover:bg-app-border"
            >
              {t('reminder.inviteNo')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
