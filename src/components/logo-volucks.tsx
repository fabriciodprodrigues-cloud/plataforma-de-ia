/**
 * Logo "Node V": cinco nós ligados formando um V.
 *
 * SVG inline em vez de arquivo porque ele troca de cor conforme o contexto e
 * precisa ficar nítido em qualquer tamanho — e porque uma requisição a menos no
 * caminho crítico da landing vale mais que a reutilização de um .svg externo.
 */
export function LogoVolucks({
  tamanho = 28,
  className,
}: {
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <line x1="20" y1="20" x2="35" y2="50" stroke="#2647FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="35" y1="50" x2="50" y2="82" stroke="#2647FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="80" y1="20" x2="65" y2="50" stroke="#2647FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="65" y1="50" x2="50" y2="82" stroke="#2647FF" strokeWidth="5" strokeLinecap="round" />
      <line x1="35" y1="50" x2="65" y2="50" stroke="#4CC9F0" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="6" fill="#2647FF" />
      <circle cx="80" cy="20" r="6" fill="#2647FF" />
      <circle cx="35" cy="50" r="5" fill="#4CC9F0" />
      <circle cx="65" cy="50" r="5" fill="#4CC9F0" />
      <circle cx="50" cy="82" r="7" fill="#2647FF" />
    </svg>
  );
}

/** Logo com o nome ao lado, como aparece na navegação e na barra do admin. */
export function MarcaVolucks({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span className="flex items-center gap-2.5 font-titulo text-[17px] font-bold tracking-tight">
      <LogoVolucks tamanho={tamanho} />
      <span>
        VOLUCKS <b className="font-bold text-marca-700">IA</b>
      </span>
    </span>
  );
}
