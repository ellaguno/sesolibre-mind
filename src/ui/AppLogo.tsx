/** Ícono de la app (el cerebro con pesa) para cabeceras y diálogos. */
export default function AppLogo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
      alt=""
      aria-hidden
      className={`inline-block shrink-0 rounded-[22%] ${className}`}
    />
  );
}
