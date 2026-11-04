import { useEffect } from 'react';
import { useT } from '../../core/i18n';

interface Props {
  onDigit: (d: number) => void;
  onBackspace: () => void;
  /** Si se da, aparece la tecla ✓ (y Enter la activa). */
  onSubmit?: () => void;
  disabled?: boolean;
}

/**
 * Teclado numérico grande para responder con el pulgar. También escucha el
 * teclado físico (cifras, Retroceso, Enter).
 */
export default function NumPad({ onDigit, onBackspace, onSubmit, disabled }: Props) {
  const t = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) onDigit(Number(e.key));
      else if (e.key === 'Backspace') onBackspace();
      else if (e.key === 'Enter' && onSubmit) onSubmit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDigit, onBackspace, onSubmit, disabled]);

  const key =
    'rounded-2xl bg-app-surface py-4 text-2xl font-bold transition hover:bg-app-surface2 active:scale-95 disabled:opacity-40';
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button key={d} className={key} disabled={disabled} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button
        className={key}
        disabled={disabled}
        onClick={onBackspace}
        aria-label={t('numpad.backspace')}
      >
        ⌫
      </button>
      <button className={key} disabled={disabled} onClick={() => onDigit(0)}>
        0
      </button>
      {onSubmit ? (
        <button
          className={`${key} bg-brand text-white hover:bg-brand-dark`}
          disabled={disabled}
          onClick={onSubmit}
          aria-label={t('numpad.ok')}
        >
          ✓
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
