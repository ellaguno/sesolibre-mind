import { useState } from 'react';
import Screen from '../ui/Screen';
import Button from '../ui/Button';
import { useT } from '../core/i18n';
import { AVATARS, MAX_PROFILES, useProfiles, type Profile } from '../core/profiles';

function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  const t = useT();
  return (
    <div
      className="grid grid-cols-6 gap-2"
      role="radiogroup"
      aria-label={t('profiles.avatar')}
    >
      {AVATARS.map((e) => (
        <button
          key={e}
          role="radio"
          aria-checked={e === value}
          onClick={() => onChange(e)}
          className={`rounded-xl py-2 text-2xl transition ${
            e === value ? 'bg-brand/30 ring-2 ring-brand' : 'bg-app-surface2'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; emoji: string };
  submitLabel: string;
  onSubmit: (name: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-border bg-app-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('profiles.name')}</span>
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('profiles.namePlaceholder')}
          className="rounded-lg border border-app-border bg-app-bg px-3 py-2 text-lg"
          autoFocus
        />
      </label>
      <AvatarPicker value={emoji} onChange={setEmoji} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => onSubmit(name, emoji)} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Modo familia: perfiles del dispositivo, cada uno con su progreso. */
export default function ProfilesScreen() {
  const t = useT();
  const { list, activeId, add, update, remove, switchTo } = useProfiles();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const nameOf = (p: Profile) => p.name || t('profiles.me');

  return (
    <Screen title={t('profiles.title')}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-app-muted">{t('profiles.intro')}</p>

        <ul className="flex flex-col gap-2">
          {list.map((p) =>
            editing === p.id ? (
              <li key={p.id}>
                <ProfileForm
                  initial={{ name: p.name, emoji: p.emoji }}
                  submitLabel={t('profiles.save')}
                  onCancel={() => setEditing(null)}
                  onSubmit={(name, emoji) => {
                    void update(p.id, { name, emoji });
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border bg-app-surface p-3 ${
                  p.id === activeId ? 'border-brand' : 'border-app-border'
                }`}
              >
                <button
                  onClick={() => p.id !== activeId && void switchTo(p.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                  aria-label={t('profiles.use', { name: nameOf(p) })}
                >
                  <span className="text-4xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-lg font-semibold">{nameOf(p)}</span>
                    <span className="text-xs text-app-muted">
                      {p.id === activeId
                        ? `✓ ${t('profiles.active')}`
                        : t('profiles.tapToUse')}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setEditing(p.id)}
                  aria-label={t('profiles.edit', { name: nameOf(p) })}
                  className="rounded-lg bg-app-surface2 px-3 py-2"
                >
                  ✏️
                </button>
                {p.id !== 'main' && (
                  <button
                    onClick={() => {
                      if (confirmDelete === p.id) {
                        void remove(p.id);
                        setConfirmDelete(null);
                      } else setConfirmDelete(p.id);
                    }}
                    aria-label={t('profiles.delete', { name: nameOf(p) })}
                    className={`rounded-lg px-3 py-2 ${
                      confirmDelete === p.id ? 'bg-red-600 text-white' : 'bg-app-surface2'
                    }`}
                  >
                    {confirmDelete === p.id ? t('profiles.confirmDelete') : '🗑️'}
                  </button>
                )}
              </li>
            ),
          )}
        </ul>
        {confirmDelete && (
          <p className="text-sm text-red-500" aria-live="polite">
            {t('profiles.deleteWarning')}
          </p>
        )}

        {adding ? (
          <ProfileForm
            initial={{ name: '', emoji: AVATARS[list.length % AVATARS.length] }}
            submitLabel={t('profiles.createAndUse')}
            onCancel={() => setAdding(false)}
            onSubmit={(name, emoji) => {
              void add(name, emoji).then((p) => switchTo(p.id));
            }}
          />
        ) : (
          list.length < MAX_PROFILES && (
            <Button onClick={() => setAdding(true)} className="py-3">
              ＋ {t('profiles.add')}
            </Button>
          )
        )}
      </div>
    </Screen>
  );
}
