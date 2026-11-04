import { useT } from '../core/i18n';
import { useLevels, type StartChoice } from '../core/levels';

const OPTIONS: { id: StartChoice; emoji: string }[] = [
  { id: 'basic', emoji: '🌱' },
  { id: 'normal', emoji: '🙂' },
  { id: 'challenge', emoji: '🔥' },
];

/** Pregunta inicial: desde qué nivel empezar en todas las actividades. */
export default function StartChoiceDialog() {
  const t = useT();
  const choose = useLevels((s) => s.choose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-title"
      className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-950/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center"
    >
      <div className="overlay-pop my-auto flex max-h-full w-full max-w-md flex-col overflow-y-auto gap-3 rounded-3xl bg-app-surface p-6 shadow-2xl">
        <p className="text-4xl" aria-hidden>
          🧠
        </p>
        <h2 id="start-title" className="text-2xl font-bold">
          {t('start.title')}
        </h2>
        <p className="text-app-muted">{t('start.subtitle')}</p>
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => choose(o.id)}
            className="flex items-center gap-4 rounded-2xl border border-app-border bg-app-bg p-4 text-left transition hover:border-brand active:scale-[0.98]"
          >
            <span className="text-4xl" aria-hidden>
              {o.emoji}
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-bold">{t(`start.${o.id}`)}</span>
              <span className="text-sm text-app-muted">{t(`start.${o.id}Desc`)}</span>
            </span>
          </button>
        ))}
        <p className="text-center text-xs text-app-muted">{t('start.note')}</p>
      </div>
    </div>
  );
}
