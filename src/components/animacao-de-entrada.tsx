"use client";

import { useEffect } from "react";

/**
 * Faz os blocos marcados com `data-revelar` aparecerem ao entrar na tela.
 *
 * Um componente só, montado uma vez, observando elementos renderizados no
 * servidor — em vez de embrulhar cada seção num componente de cliente. A landing
 * inteira continua sendo servidor, que é o que importa para o SEO.
 *
 * Sem biblioteca de animação: é um IntersectionObserver e duas classes CSS.
 */
export function AnimacaoDeEntrada() {
  useEffect(() => {
    const alvos = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
    if (alvos.length === 0) return;

    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Sem observer, ou com o usuário pedindo menos movimento: nada a fazer. Os
    // blocos já nascem visíveis no HTML, então ficam como estão. O conteúdo
    // nunca pode sumir por causa de um enfeite.
    if (semMovimento || !("IntersectionObserver" in window)) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          delete (entrada.target as HTMLElement).dataset.revelar;
          observador.unobserve(entrada.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    // O estado escondido é aplicado AQUI, no cliente, e só no que ainda está
    // fora da tela.
    //
    // Antes isso vinha de uma classe `js` que um script inline punha no <html>.
    // Funcionava no protótipo, que é HTML puro, mas no React o servidor
    // renderiza sem a classe e o cliente hidrata com ela — mismatch de
    // hidratação, que o React avisa e não corrige.
    //
    // Esconder só o que está fora da tela também evita o piscar: o que o
    // usuário já está vendo nunca some para reaparecer animado.
    for (const el of alvos) {
      const caixa = el.getBoundingClientRect();
      const jaVisivel = caixa.top < window.innerHeight && caixa.bottom > 0;
      if (jaVisivel) continue;
      el.dataset.revelar = "oculto";
      observador.observe(el);
    }

    return () => observador.disconnect();
  }, []);

  return null;
}
