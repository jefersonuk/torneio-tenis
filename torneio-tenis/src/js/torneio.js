/**
 * Leitura da planilha, cálculo de classificação e montagem da chave.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- CSV ----

  /** Parser de CSV que respeita aspas e quebras de linha dentro do campo. */
  function parseCSV(texto) {
    const linhas = [];
    let campo = '';
    let linha = [];
    let dentroAspas = false;

    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];

      if (dentroAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') {
            campo += '"';
            i++;
          } else {
            dentroAspas = false;
          }
        } else {
          campo += c;
        }
        continue;
      }

      if (c === '"') dentroAspas = true;
      else if (c === ',') {
        linha.push(campo);
        campo = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        linha.push(campo);
        linhas.push(linha);
        linha = [];
        campo = '';
      } else campo += c;
    }

    if (campo !== '' || linha.length) {
      linha.push(campo);
      linhas.push(linha);
    }

    return linhas.filter(function (l) {
      return l.some(function (c) {
        return String(c).trim() !== '';
      });
    });
  }

  /** Converte a primeira linha em cabeçalho e o resto em objetos. */
  function csvParaObjetos(texto) {
    const linhas = parseCSV(texto);
    if (!linhas.length) return [];

    const cabecalho = linhas[0].map(function (c) {
      return String(c).trim().toLowerCase().replace(/\s+/g, '_');
    });

    return linhas.slice(1).map(function (l) {
      const obj = {};
      cabecalho.forEach(function (chave, i) {
        obj[chave] = String(l[i] === undefined ? '' : l[i]).trim();
      });
      return obj;
    });
  }

  function urlAba(idPlanilha, nomeAba) {
    return (
      'https://docs.google.com/spreadsheets/d/' +
      encodeURIComponent(idPlanilha) +
      '/gviz/tq?tqx=out:csv&sheet=' +
      encodeURIComponent(nomeAba)
    );
  }

  function carregarAba(idPlanilha, nomeAba) {
    return fetch(urlAba(idPlanilha, nomeAba), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' na aba "' + nomeAba + '"');
        return r.text();
      })
      .then(csvParaObjetos);
  }

  // ------------------------------------------------------------- PLACAR ----

  /**
   * Aceita "6-4", "6/4 3-6 10-8", "6x4 6x2". Retorna null se ainda não jogado.
   */
  function parsePlacar(texto) {
    if (!texto) return null;

    const sets = String(texto)
      .split(/[\s,;]+/)
      .map(function (p) {
        const m = p.match(/^(\d{1,2})\s*[-x\/:]\s*(\d{1,2})$/i);
        return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
      })
      .filter(Boolean);

    if (!sets.length) return null;

    let setsA = 0;
    let setsB = 0;
    let gamesA = 0;
    let gamesB = 0;

    sets.forEach(function (s) {
      gamesA += s[0];
      gamesB += s[1];
      if (s[0] > s[1]) setsA++;
      else if (s[1] > s[0]) setsB++;
    });

    if (setsA === setsB) return null; // placar incompleto ou inválido

    return {
      sets: sets,
      setsA: setsA,
      setsB: setsB,
      gamesA: gamesA,
      gamesB: gamesB,
      vencedor: setsA > setsB ? 'a' : 'b',
      texto: sets
        .map(function (s) {
          return s[0] + '-' + s[1];
        })
        .join(' '),
    };
  }

  // ------------------------------------------------------ CLASSIFICAÇÃO ----

  function linhaVazia(nome) {
    return {
      jogador: nome,
      j: 0,
      v: 0,
      d: 0,
      setsPro: 0,
      setsContra: 0,
      gamesPro: 0,
      gamesContra: 0,
    };
  }

  function razao(pro, contra) {
    const total = pro + contra;
    return total === 0 ? 0 : pro / total;
  }

  /**
   * Critérios de desempate, na ordem:
   * 1) vitórias  2) confronto direto (quando o empate é entre 2)
   * 3) % de sets vencidos  4) % de games vencidos  5) ordem alfabética
   */
  function classificar(jogadores, jogos) {
    const tabela = {};
    jogadores.forEach(function (n) {
      tabela[n] = linhaVazia(n);
    });

    jogos.forEach(function (jogo) {
      if (!jogo.placar || !tabela[jogo.a] || !tabela[jogo.b]) return;
      const p = jogo.placar;
      const la = tabela[jogo.a];
      const lb = tabela[jogo.b];

      la.j++;
      lb.j++;
      la.setsPro += p.setsA;
      la.setsContra += p.setsB;
      lb.setsPro += p.setsB;
      lb.setsContra += p.setsA;
      la.gamesPro += p.gamesA;
      la.gamesContra += p.gamesB;
      lb.gamesPro += p.gamesB;
      lb.gamesContra += p.gamesA;

      if (p.vencedor === 'a') {
        la.v++;
        lb.d++;
      } else {
        lb.v++;
        la.d++;
      }
    });

    const linhas = jogadores.map(function (n) {
      return tabela[n];
    });

    linhas.sort(function (x, y) {
      return (
        y.v - x.v ||
        razao(y.setsPro, y.setsContra) - razao(x.setsPro, x.setsContra) ||
        razao(y.gamesPro, y.gamesContra) - razao(x.gamesPro, x.gamesContra) ||
        x.jogador.localeCompare(y.jogador, 'pt-BR')
      );
    });

    aplicarConfrontoDireto(linhas, jogos);

    linhas.forEach(function (l, i) {
      l.pos = i + 1;
      l.saldoSets = l.setsPro - l.setsContra;
      l.saldoGames = l.gamesPro - l.gamesContra;
    });

    return linhas;
  }

  /** Empates de exatamente 2 jogadores em vitórias são decididos no confronto. */
  function aplicarConfrontoDireto(linhas, jogos) {
    for (let i = 0; i < linhas.length - 1; i++) {
      const a = linhas[i];
      const b = linhas[i + 1];
      if (a.v !== b.v) continue;
      const trio = i + 2 < linhas.length && linhas[i + 2].v === a.v;
      const duploAcima = i > 0 && linhas[i - 1].v === a.v;
      if (trio || duploAcima) continue; // empate triplo: mantém os critérios técnicos

      const confronto = jogos.find(function (j) {
        return (
          j.placar &&
          ((j.a === a.jogador && j.b === b.jogador) || (j.a === b.jogador && j.b === a.jogador))
        );
      });
      if (!confronto) continue;

      const vencedor = confronto.placar.vencedor === 'a' ? confronto.a : confronto.b;
      if (vencedor === b.jogador) {
        linhas[i] = b;
        linhas[i + 1] = a;
      }
    }
  }

  // ---------------------------------------------------------- MATA-MATA ----

  /**
   * 4 classificados por grupo. Cruzamento: 1º de um grupo x 4º do outro,
   * 2º de um x 3º do outro — com A1 e B1 em metades opostas da chave.
   */
  const CRUZAMENTOS = [
    { id: 'QF1', origem: [['A', 1], ['B', 4]] },
    { id: 'QF2', origem: [['B', 2], ['A', 3]] },
    { id: 'QF3', origem: [['B', 1], ['A', 4]] },
    { id: 'QF4', origem: [['A', 2], ['B', 3]] },
  ];

  function nomeClassificado(classificacoes, grupo, posicao) {
    const linhas = classificacoes[grupo] || [];
    const linha = linhas[posicao - 1];
    const grupoCompleto = linhas.every(function (l) {
      return l.j === linhas.length - 1;
    });
    if (!linha || !grupoCompleto) return null;
    return linha.jogador;
  }

  function jogoDaPlanilha(jogos, id) {
    return (
      jogos.find(function (j) {
        return String(j.id).toUpperCase() === id;
      }) || null
    );
  }

  function montarChave(classificacoes, jogosMataMata) {
    const chave = {};

    CRUZAMENTOS.forEach(function (c) {
      const registro = jogoDaPlanilha(jogosMataMata, c.id);
      const a =
        (registro && registro.a) || nomeClassificado(classificacoes, c.origem[0][0], c.origem[0][1]);
      const b =
        (registro && registro.b) || nomeClassificado(classificacoes, c.origem[1][0], c.origem[1][1]);

      chave[c.id] = {
        id: c.id,
        rotuloA: c.origem[0][1] + 'º Grupo ' + c.origem[0][0],
        rotuloB: c.origem[1][1] + 'º Grupo ' + c.origem[1][0],
        a: a,
        b: b,
        placar: registro ? registro.placar : null,
      };
    });

    const proximos = [
      { id: 'SF1', de: ['QF1', 'QF2'] },
      { id: 'SF2', de: ['QF3', 'QF4'] },
      { id: 'FINAL', de: ['SF1', 'SF2'] },
    ];

    proximos.forEach(function (p) {
      const registro = jogoDaPlanilha(jogosMataMata, p.id);
      chave[p.id] = {
        id: p.id,
        rotuloA: 'Vencedor ' + p.de[0],
        rotuloB: 'Vencedor ' + p.de[1],
        a: (registro && registro.a) || vencedorDe(chave, p.de[0]),
        b: (registro && registro.b) || vencedorDe(chave, p.de[1]),
        placar: registro ? registro.placar : null,
      };
    });

    const terceiro = jogoDaPlanilha(jogosMataMata, '3LUGAR');
    chave['3LUGAR'] = {
      id: '3LUGAR',
      rotuloA: 'Perdedor SF1',
      rotuloB: 'Perdedor SF2',
      a: (terceiro && terceiro.a) || perdedorDe(chave, 'SF1'),
      b: (terceiro && terceiro.b) || perdedorDe(chave, 'SF2'),
      placar: terceiro ? terceiro.placar : null,
    };

    return chave;
  }

  function vencedorDe(chave, id) {
    const j = chave[id];
    if (!j || !j.placar) return null;
    return j.placar.vencedor === 'a' ? j.a : j.b;
  }

  function perdedorDe(chave, id) {
    const j = chave[id];
    if (!j || !j.placar) return null;
    return j.placar.vencedor === 'a' ? j.b : j.a;
  }

  window.Torneio = {
    parseCSV: parseCSV,
    csvParaObjetos: csvParaObjetos,
    carregarAba: carregarAba,
    urlAba: urlAba,
    parsePlacar: parsePlacar,
    classificar: classificar,
    montarChave: montarChave,
    vencedorDe: vencedorDe,
    perdedorDe: perdedorDe,
    CRUZAMENTOS: CRUZAMENTOS,
  };
})();
