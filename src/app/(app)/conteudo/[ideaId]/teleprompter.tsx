"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Pause,
  Play,
  RotateCcw,
  Type,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Ritmo de fala usado quando a plataforma não tem duração definida (post). */
const PALAVRAS_POR_MINUTO = 130;

/** Altura da linha-guia, em fração da tela. É onde o olho deve ficar. */
const ALTURA_GUIA = 0.38;

function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Teleprompter({
  texto,
  duracaoSegundos,
  rotulo,
  aoFechar,
}: {
  texto: string;
  /** Duração escolhida para o vídeo. Nulo em legenda de post. */
  duracaoSegundos: number | null;
  rotulo: string;
  aoFechar: () => void;
}) {
  const rolagemRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // O progresso da rolagem vive AQUI, não no DOM.
  //
  // `scrollTop` só guarda inteiros. Fazendo `el.scrollTop += 0.4` a cada frame,
  // o valor é lido de volta já arredondado para 0 antes da próxima soma — e a
  // rolagem trava em zero para sempre. Mantendo o acumulado em ponto flutuante
  // fora do DOM, cada frame soma na variável e só o resultado vai para o
  // scrollTop, que pode arredondar à vontade sem perder o progresso.
  const acumuladoRef = useRef(0);
  const ultimoFrameRef = useRef<number | null>(null);
  const animacaoRef = useRef<number | null>(null);

  const [rodando, setRodando] = useState(false);
  const [contagem, setContagem] = useState<number | null>(null);
  const [velocidade, setVelocidade] = useState(1);
  const [fonte, setFonte] = useState(38);
  const [espelhado, setEspelhado] = useState(false);
  const [comCamera, setComCamera] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [pxPorSegundo, setPxPorSegundo] = useState(0);
  const [restante, setRestante] = useState(0);

  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;
  const alvoSegundos = duracaoSegundos ?? (palavras / PALAVRAS_POR_MINUTO) * 60;

  /**
   * Recalcula a velocidade base a partir do que sobra para rolar.
   *
   * Precisa rodar de novo quando a fonte muda: o texto fica mais alto ou mais
   * baixo, então a mesma duração-alvo exige outra velocidade.
   */
  const recalcular = useCallback(() => {
    const el = rolagemRef.current;
    if (!el) return;
    const rolavel = el.scrollHeight - el.clientHeight;
    setPxPorSegundo(rolavel > 0 && alvoSegundos > 0 ? rolavel / alvoSegundos : 0);
  }, [alvoSegundos]);

  // Recalcula quando a fonte muda, preservando a FRAÇÃO já percorrida — senão
  // aumentar a fonte no meio da leitura jogaria o texto para outro ponto.
  useEffect(() => {
    const el = rolagemRef.current;
    if (!el) return;
    const antes = el.scrollHeight - el.clientHeight;
    const fracao = antes > 0 ? acumuladoRef.current / antes : 0;

    // Espera o layout reagir ao novo tamanho de fonte antes de medir.
    const id = requestAnimationFrame(() => {
      const depois = el.scrollHeight - el.clientHeight;
      acumuladoRef.current = fracao * depois;
      el.scrollTop = acumuladoRef.current;
      recalcular();
    });
    return () => cancelAnimationFrame(id);
  }, [fonte, recalcular]);

  useEffect(() => {
    recalcular();
    window.addEventListener("resize", recalcular);
    return () => window.removeEventListener("resize", recalcular);
  }, [recalcular]);

  // Laço de rolagem.
  useEffect(() => {
    if (!rodando) {
      ultimoFrameRef.current = null;
      return;
    }

    const passo = (agora: number) => {
      const el = rolagemRef.current;
      if (!el) return;

      const anterior = ultimoFrameRef.current;
      ultimoFrameRef.current = agora;

      if (anterior !== null) {
        // Limita o passo a 100ms. Em aba oculta o requestAnimationFrame para; ao
        // voltar, o primeiro delta seria todo o tempo escondido e o texto daria
        // um salto de centenas de pixels — bem no meio de uma gravação.
        const delta = Math.min((agora - anterior) / 1000, 0.1);
        acumuladoRef.current += pxPorSegundo * velocidade * delta;

        const limite = el.scrollHeight - el.clientHeight;
        if (acumuladoRef.current >= limite) {
          acumuladoRef.current = limite;
          el.scrollTop = limite;
          setRodando(false);
          setRestante(0);
          return;
        }
        el.scrollTop = acumuladoRef.current;

        const faltando = limite - acumuladoRef.current;
        const px = pxPorSegundo * velocidade;
        setRestante(px > 0 ? faltando / px : 0);
      }

      animacaoRef.current = requestAnimationFrame(passo);
    };

    animacaoRef.current = requestAnimationFrame(passo);
    return () => {
      if (animacaoRef.current !== null) cancelAnimationFrame(animacaoRef.current);
    };
  }, [rodando, pxPorSegundo, velocidade]);

  // Contagem regressiva antes de começar.
  useEffect(() => {
    if (contagem === null) return;
    if (contagem === 0) {
      setContagem(null);
      setRodando(true);
      return;
    }
    const t = setTimeout(() => setContagem((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [contagem]);

  const alternarPlay = useCallback(() => {
    if (rodando) {
      setRodando(false);
      return;
    }
    if (contagem !== null) return; // já contando
    // Conta 3-2-1 só ao iniciar do zero; retomar uma pausa é imediato.
    if (acumuladoRef.current === 0) setContagem(3);
    else setRodando(true);
  }, [rodando, contagem]);

  const reiniciar = useCallback(() => {
    setRodando(false);
    setContagem(null);
    acumuladoRef.current = 0;
    if (rolagemRef.current) rolagemRef.current.scrollTop = 0;
    setRestante(alvoSegundos);
  }, [alvoSegundos]);

  /** Desliga a câmera de verdade — sem isso a luz do dispositivo fica acesa. */
  const desligarCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setComCamera(false);
  }, []);

  const alternarCamera = useCallback(async () => {
    if (comCamera) {
      desligarCamera();
      return;
    }
    setErroCamera(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setComCamera(true);
    } catch (erro) {
      const nome = erro instanceof DOMException ? erro.name : "";
      setErroCamera(
        nome === "NotAllowedError"
          ? "Você negou o acesso à câmera. Libere nas permissões do navegador para usar."
          : nome === "NotFoundError"
            ? "Não encontramos nenhuma câmera neste dispositivo."
            : "Não conseguimos abrir a câmera agora.",
      );
    }
  }, [comCamera, desligarCamera]);

  const fechar = useCallback(() => {
    setRodando(false);
    desligarCamera();
    aoFechar();
  }, [desligarCamera, aoFechar]);

  // Atalhos — só enquanto o teleprompter existe, e sem roubar teclas de campos.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        fechar();
      } else if (e.code === "Space") {
        e.preventDefault(); // senão a página rola junto
        alternarPlay();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [fechar, alternarPlay]);

  // Rede de segurança: se o componente sumir por qualquer caminho, a câmera cai
  // junto. Não dá para confiar só no botão de fechar.
  useEffect(() => desligarCamera, [desligarCamera]);

  useEffect(() => {
    setRestante(alvoSegundos);
  }, [alvoSegundos]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#04060f]"
      role="dialog"
      aria-modal="true"
      aria-label={`Teleprompter — ${rotulo}`}
    >
      {comCamera && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-25"
        />
      )}

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-tinta-900">{rotulo}</p>
          <p className="font-mono text-xs text-tinta-400">
            {palavras} palavras · {formatarTempo(restante)} restantes
            {duracaoSegundos === null && " (estimado)"}
          </p>
        </div>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar teleprompter"
          className="rounded-full p-2 text-tinta-500 transition hover:bg-white/10 hover:text-tinta-900"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {/* Texto rolante */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={rolagemRef}
          className="h-full overflow-y-auto px-6 pb-[60vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ paddingTop: `${ALTURA_GUIA * 100}vh` }}
        >
          <p
            className={cn(
              "mx-auto max-w-3xl leading-[1.6] font-semibold whitespace-pre-wrap text-tinta-900",
              espelhado && "scale-x-[-1]",
            )}
            style={{ fontSize: `${fonte}px` }}
          >
            {texto}
          </p>
        </div>

        {/* Linha-guia: onde o olho fica durante a leitura. */}
        <div
          className="pointer-events-none absolute inset-x-0 flex items-center gap-2 px-4"
          style={{ top: `${ALTURA_GUIA * 100}%` }}
          aria-hidden
        >
          <span className="h-px flex-1 bg-marca-700/50" />
          <span className="size-1.5 rounded-full bg-marca-700" />
          <span className="h-px flex-1 bg-marca-700/50" />
        </div>

        {contagem !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#04060f]/80">
            <span
              className="font-[family-name:var(--font-space-grotesk)] text-[22vw] leading-none font-bold text-marca-700 sm:text-[14rem]"
              aria-live="assertive"
            >
              {contagem}
            </span>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="relative z-10 border-t border-linha bg-[#04060f]/90 px-4 py-4">
        {erroCamera && (
          <p className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {erroCamera}
          </p>
        )}

        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={alternarPlay}
            className="inline-flex items-center gap-2 rounded-full bg-marca-700 px-6 py-3 font-semibold text-[#04060f] transition hover:bg-marca-800"
          >
            {rodando ? (
              <>
                <Pause className="size-5" aria-hidden />
                Pausar
              </>
            ) : (
              <>
                <Play className="size-5" aria-hidden />
                {acumuladoRef.current > 0 ? "Continuar" : "Começar"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={reiniciar}
            aria-label="Reiniciar do começo"
            className="rounded-full border border-linha p-3 text-tinta-500 transition hover:border-linha-forte hover:text-tinta-900"
          >
            <RotateCcw className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setEspelhado((e) => !e)}
            aria-pressed={espelhado}
            aria-label="Modo espelhado"
            className={cn(
              "rounded-full border p-3 transition",
              espelhado
                ? "border-marca-700 text-marca-700"
                : "border-linha text-tinta-500 hover:border-linha-forte hover:text-tinta-900",
            )}
          >
            <FlipHorizontal className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={alternarCamera}
            aria-pressed={comCamera}
            aria-label="Câmera de fundo"
            className={cn(
              "rounded-full border p-3 transition",
              comCamera
                ? "border-marca-700 text-marca-700"
                : "border-linha text-tinta-500 hover:border-linha-forte hover:text-tinta-900",
            )}
          >
            {comCamera ? (
              <CameraOff className="size-5" aria-hidden />
            ) : (
              <Camera className="size-5" aria-hidden />
            )}
          </button>
        </div>

        <div className="mx-auto mt-4 flex max-w-3xl flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex flex-1 items-center gap-3 text-sm text-tinta-500">
            <Zap className="size-4 shrink-0" aria-hidden />
            <span className="w-20 shrink-0 font-mono text-xs">
              {velocidade.toFixed(1)}×
            </span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={velocidade}
              onChange={(e) => setVelocidade(Number(e.target.value))}
              aria-label="Velocidade da rolagem"
              className="flex-1 accent-[#4cc9f0]"
            />
          </label>

          <label className="flex flex-1 items-center gap-3 text-sm text-tinta-500">
            <Type className="size-4 shrink-0" aria-hidden />
            <span className="w-20 shrink-0 font-mono text-xs">{fonte}px</span>
            <input
              type="range"
              min={20}
              max={80}
              step={2}
              value={fonte}
              onChange={(e) => setFonte(Number(e.target.value))}
              aria-label="Tamanho da fonte"
              className="flex-1 accent-[#4cc9f0]"
            />
          </label>
        </div>

        <p className="mt-3 text-center text-xs text-tinta-400">
          Espaço para começar ou pausar · Esc para sair
        </p>
      </div>
    </div>
  );
}
