import { useState, type ReactNode } from 'react';
import { useT } from '../core/i18n';
import Button from './Button';

export interface Slide {
  title: string;
  body: string;
  art: ReactNode;
}

interface Props {
  title: string;
  slides: Slide[];
  onClose: () => void;
}

/** Tutorial en diapositivas (primer uso o al tocar «?»). */
export default function Tutorial({ title, slides, onClose }: Props) {
  const t = useT();
  const [k, setK] = useState(0);
  const s = slides[k];
  const last = k === slides.length - 1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 p-3 sm:items-center"
    >
      <div className="overlay-pop flex w-full max-w-md flex-col gap-4 rounded-3xl bg-app-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
            {title} · {k + 1}/{slides.length}
          </p>
          <button
            onClick={onClose}
            className="text-sm text-app-muted hover:text-app-text"
          >
            {t('tutorial.skip')}
          </button>
        </div>
        <div
          key={k}
          className="route-enter flex min-h-[220px] items-center justify-center py-2"
        >
          {s.art}
        </div>
        <div>
          <h2 className="text-lg font-bold">{s.title}</h2>
          <p className="mt-1 text-app-muted">{s.body}</p>
        </div>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === k ? 'w-6 bg-brand' : 'w-1.5 bg-app-surface2'}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setK(k - 1)} disabled={k === 0}>
            {t('tutorial.prev')}
          </Button>
          <Button onClick={() => (last ? onClose() : setK(k + 1))}>
            {last ? t('tutorial.done') : t('tutorial.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
