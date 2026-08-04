/**
 * Sorteio determinístico e auditável.
 *
 * A semente é um texto público escolhido pelo grupo (ex.: a data do sorteio +
 * o resultado da Mega-Sena). Qualquer pessoa que digite a mesma semente na
 * página obtém exatamente a mesma divisão de grupos — é isso que torna o
 * sorteio verificável depois.
 */
(function () {
  'use strict';

  /** Hash de string -> inteiro 32 bits (xmur3). */
  function semente32(texto) {
    let h = 1779033703 ^ texto.length;
    for (let i = 0; i < texto.length; i++) {
      h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  /** PRNG mulberry32 — rápido e com distribuição adequada para sorteio. */
  function prng(sementeNumerica) {
    let a = sementeNumerica;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Fisher-Yates com PRNG injetado (não usa Math.random). */
  function embaralhar(lista, rand) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /**
   * Distribui os jogadores sorteáveis entre os grupos, alternando A/B para
   * manter os grupos equilibrados independentemente da quantidade.
   */
  function sortearGrupos(cabecas, sorteaveis, sementeTexto) {
    const gerar = semente32(String(sementeTexto));
    const rand = prng(gerar());
    const ordem = embaralhar(sorteaveis, rand);

    const grupos = { A: cabecas.A.slice(), B: cabecas.B.slice() };
    const passos = [];

    ordem.forEach(function (jogador, i) {
      const destino = i % 2 === 0 ? 'A' : 'B';
      grupos[destino].push(jogador);
      passos.push({ ordem: i + 1, jogador: jogador, grupo: destino });
    });

    return { grupos: grupos, passos: passos, semente: String(sementeTexto) };
  }

  /**
   * Tabela de jogos todos-contra-todos pelo método do círculo.
   * Com 5 jogadores gera 5 rodadas, cada uma com 2 jogos e 1 folga.
   */
  function rodadasRoundRobin(jogadores) {
    const lista = jogadores.slice();
    if (lista.length % 2 === 1) lista.push(null); // folga

    const n = lista.length;
    const rodadas = [];

    for (let r = 0; r < n - 1; r++) {
      const jogos = [];
      for (let i = 0; i < n / 2; i++) {
        const a = lista[i];
        const b = lista[n - 1 - i];
        if (a && b) jogos.push([a, b]);
      }
      rodadas.push(jogos);
      lista.splice(1, 0, lista.pop()); // rotaciona mantendo o primeiro fixo
    }

    return rodadas;
  }

  window.Sorteio = {
    sortearGrupos: sortearGrupos,
    rodadasRoundRobin: rodadasRoundRobin,
    embaralhar: embaralhar,
    prng: prng,
    semente32: semente32,
  };
})();
