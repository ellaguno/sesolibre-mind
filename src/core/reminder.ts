import { Capacitor } from '@capacitor/core';
import { useSettings } from './settings';
import { resolveLang, translate } from './i18n';
import { dateKey } from './rng';
import { dailyPlan, isComplete, loadSession } from './session';

/**
 * Recordatorio diario (sólo en la app nativa): notificaciones locales que
 * programa el propio teléfono, sin servidor ni datos que salgan del dispositivo.
 *
 * Se programan avisos sueltos para los próximos DAYS días a la hora elegida (en
 * vez de uno repetitivo) para poder saltarse el de hoy si la sesión ya está
 * hecha. Se reprograman al abrir la app, al cambiar el ajuste y al terminar la
 * sesión.
 */

const BASE_ID = 1000;
const DAYS = 14;
const MESSAGES = 4;

export const remindersSupported = () => Capacitor.isNativePlatform();

async function plugin() {
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

/** Pide permiso de notificaciones (Android 13+). true si quedó concedido. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported()) return false;
  const ln = await plugin();
  const cur = await ln.checkPermissions();
  if (cur.display === 'granted') return true;
  const res = await ln.requestPermissions();
  return res.display === 'granted';
}

/** Días y horas (como Date) en que toca avisar a partir de `now`. */
export function reminderDates(
  now: Date,
  time: string,
  skipToday: boolean,
  days = DAYS,
): Date[] {
  const [h, m] = time.split(':').map(Number);
  const out: Date[] = [];
  for (let d = 0; d < days; d++) {
    const at = new Date(now);
    at.setDate(now.getDate() + d);
    at.setHours(h, m, 0, 0);
    if (at <= now || (d === 0 && skipToday)) continue;
    out.push(at);
  }
  return out;
}

export async function syncReminder(): Promise<void> {
  if (!remindersSupported()) return;
  const ln = await plugin();
  await ln.cancel({
    notifications: Array.from({ length: DAYS + 1 }, (_, k) => ({ id: BASE_ID + k })),
  });
  const { reminder, reminderTime, lang } = useSettings.getState();
  if (!reminder) return;
  if ((await ln.checkPermissions()).display !== 'granted') return;

  const today = dateKey(new Date());
  const doneToday = isComplete(dailyPlan(today), await loadSession(today));
  const l = resolveLang(lang);
  const dates = reminderDates(new Date(), reminderTime, doneToday);
  await ln.schedule({
    notifications: dates.map((at, k) => ({
      id: BASE_ID + k,
      title: translate(l, 'reminder.title'),
      body: translate(l, `reminder.body${(at.getDate() % MESSAGES) + 1}`),
      schedule: { at, allowWhileIdle: true },
      smallIcon: 'ic_stat_mind',
      iconColor: '#6366f1',
      extra: { route: '/session' },
    })),
  });
}

/** Al tocar la notificación, abrir la sesión del día. */
export async function listenReminderTaps(
  go: (route: string) => void,
): Promise<() => void> {
  if (!remindersSupported()) return () => {};
  const ln = await plugin();
  const handle = await ln.addListener('localNotificationActionPerformed', (e) => {
    const route = (e.notification.extra as { route?: string } | undefined)?.route;
    if (route) go(route);
  });
  return () => void handle.remove();
}
