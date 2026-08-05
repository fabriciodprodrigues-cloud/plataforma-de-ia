import type { Plataforma } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Ícones das redes sociais desenhados aqui mesmo.
 * O pacote de ícones que usamos (lucide) deixou de trazer logos de marca na
 * versão 1, então não dá para depender dele para isso.
 */

const base = "size-5 shrink-0";

function Instagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect
        x="1.8"
        y="4.8"
        width="20.4"
        height="14.4"
        rx="4.4"
        stroke="currentColor"
        strokeWidth={2}
      />
      <path d="M10.2 8.9 15.6 12l-5.4 3.1z" fill="currentColor" />
    </svg>
  );
}

function LinkedIn({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-11h4v1.5A6 6 0 0 1 16 8z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12V9.68a5.72 5.72 0 0 0-.76-.05 5.68 5.68 0 1 0 5.68 5.68V8.9a7.3 7.3 0 0 0 4.27 1.37V7.18a4.25 4.25 0 0 1-3.21-1.36z" />
    </svg>
  );
}

export function IconePlataforma({
  plataforma,
  className,
}: {
  plataforma: Plataforma;
  className?: string;
}) {
  const classe = cn(base, className);
  switch (plataforma) {
    case "INSTAGRAM":
      return <Instagram className={classe} />;
    case "YOUTUBE":
      return <YouTube className={classe} />;
    case "LINKEDIN":
      return <LinkedIn className={classe} />;
    case "TIKTOK":
      return <TikTok className={classe} />;
  }
}
