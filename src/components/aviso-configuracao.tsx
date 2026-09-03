import { FlaskConical } from "lucide-react";
import { configuracoesPendentes, modoDemonstracao } from "@/lib/env";

/**
 * Avisa na tela o que falta preencher no .env — e, quando só falta a chave da
 * IA, avisa que o app está rodando com conteúdo de exemplo.
 *
 * Existe porque quem vai rodar isso não é desenvolvedor: sem esse aviso, uma
 * chave em branco viraria um erro técnico no meio do fluxo. E o segundo caso é
 * igualmente importante: conteúdo de exemplo nunca pode se passar por conteúdo
 * de verdade.
 */
export function AvisoConfiguracao() {
  const pendentes = configuracoesPendentes();
  const demonstracao = modoDemonstracao();

  const faltamOutras = pendentes.filter((p) => p.chave !== "ANTHROPIC_API_KEY");

  // Caso feliz do teste: só falta a IA, então estamos em modo demonstração.
  if (demonstracao && faltamOutras.length === 0) {
    return (
      <div
        role="status"
        className="border-b border-marca-200 bg-marca-50 px-4 py-2.5 text-marca-900 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl items-start gap-2.5 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <strong>Modo demonstração.</strong> Os textos são exemplos prontos, não
            foram escritos por IA. Todo o resto funciona de verdade: identidade
            visual, artes, fotos e download. Para ligar a IA, preencha{" "}
            <code className="rounded bg-marca-100 px-1 text-xs">ANTHROPIC_API_KEY</code>{" "}
            no arquivo <code className="rounded bg-marca-100 px-1 text-xs">.env</code>.
          </p>
        </div>
      </div>
    );
  }

  if (pendentes.length === 0) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 sm:px-6"
    >
      <div className="mx-auto max-w-6xl text-sm">
        <p className="font-semibold">
          Falta configurar {pendentes.length}{" "}
          {pendentes.length === 1 ? "chave" : "chaves"} no arquivo{" "}
          <code className="rounded bg-amber-500/10 px-1">.env</code>
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {pendentes.map((p) => (
            <li key={p.chave}>
              <code className="rounded bg-amber-500/10 px-1 text-xs">{p.chave}</code> —{" "}
              {p.oQueE}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-amber-300">
          O passo a passo está no <strong>README.md</strong>, seção “Configuração”.
          Depois de preencher, salve o arquivo e recarregue a página.
        </p>
      </div>
    </div>
  );
}
