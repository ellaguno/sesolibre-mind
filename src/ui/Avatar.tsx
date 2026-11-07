/** Avatar del perfil: un emoji, o 👤 dibujado como busto (el emoji es oscuro en el tema oscuro). */
const PERSON = '👤';

export default function Avatar({ emoji }: { emoji: string }) {
  if (emoji !== PERSON) return <>{emoji}</>;
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      className="inline-block align-[-0.125em]"
      fill="currentColor"
    >
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.5 21c0-4.7 3.8-7.6 8.5-7.6s8.5 2.9 8.5 7.6c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1z" />
    </svg>
  );
}
