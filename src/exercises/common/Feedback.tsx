/** Destello ✓ / ✗ breve sobre la zona del estímulo. */
export default function Feedback({ kind }: { kind: 'ok' | 'bad' | null }) {
  if (!kind) return null;
  return (
    <span
      aria-hidden
      className={`overlay-pop pointer-events-none absolute right-3 top-3 text-4xl font-black ${
        kind === 'ok' ? 'text-green-500' : 'text-red-500'
      }`}
    >
      {kind === 'ok' ? '✓' : '✗'}
    </span>
  );
}
