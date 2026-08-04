/**
 * Renderização da página e integração entre sorteio, planilha e chave.
 */
(function () {
  'use strict';

  const cfg = window.CONFIG;
  const CHAVE_LOCAL = 'torneio-tenis:sorteio';

  const estado = {
    grupos: null, // { A: [...], B: [...] }
    origemGrupos: null, // 'planilha' | 'sorteio-local' | 'pendente'
    jogosGrupo: [],
    jogosMataMata: [],
    classificacoes: { A: [], B: [] },
    chave: null,
    erro: null,
    atualizadoEm: null,
  };

  // ------------------------------------------------------------ helpers ----

  function $(sel) {
    return document.querySelector(sel);
  }

  function el(tag, attrs, filhos) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (filhos || []).forEach(function (f) {
      node.appendChild(f);
    });
    return node;
  }

  function chaveJogo(a, b) {
    return [a, b]
      .map(function (n) {
        return String(n).trim().toLowerCase();
      })
      .sort()
      .join('||');
  }

  function cabecas() {
    return { A: (cfg.cabecas && cfg.cabecas.A) || [], B: (cfg.cabecas && cfg.cabecas.B) || [] };
  }

  function todosJogadores() {
    const c = cabecas();
    return c.A.concat(c.B, cfg.jogadores);
  }

  // ------------------------------------------------------------- dados ----

  function gruposSalvos() {
    try {
      const bruto = localStorage.getItem(CHAVE_LOCAL);
      return bruto ? JSON.parse(bruto) : null;
    } catch (e) {
      return null;
    }
  }

  function gruposDaPlanilha(linhas) {
    const grupos = { A: [], B: [] };
    linhas.forEach(function (l) {
      const nome = l.jogador || l.nome || '';
      const g = String(l.grupo || '').trim().toUpperCase();
      if (nome && (g === 'A' || g === 'B')) grupos[g].push(nome);
    });
    return grupos.A.length && grupos.B.length ? grupos : null;
  }

  function jogosDaPlanilha(linhas) {
    const grupo = [];
    const mataMata = [];

    linhas.forEach(function (l) {
      const fase = String(l.fase || '').trim().toLowerCase();
      const registro = {
        id: String(l.id || '').trim(),
        grupo: String(l.grupo || '').trim().toUpperCase(),
        a: (l.jogador_a || l.jogadora || '').trim(),
        b: (l.jogador_b || l.jogadorb || '').trim(),
        placar: window.Torneio.parsePlacar(l.placar),
        data: (l.data || '').trim(),
      };
      if (fase === 'grupo' || fase === 'grupos') grupo.push(registro);
      else if (fase) mataMata.push(registro);
    });

    return { grupo: grupo, mataMata: mataMata };
  }

  function carregarPlanilha() {
    const id = (cfg.planilha.id || '').trim();
    if (!id) return Promise.resolve(false);

    return Promise.all([
      window.Torneio.carregarAba(id, cfg.planilha.abaGrupos).catch(function () {
        return [];
      }),
      window.Torneio.carregarAba(id, cfg.planilha.abaJogos),
    ]).then(function (res) {
      // A planilha é a fonte da verdade: se a aba Grupos esvaziar, o estado
      // anterior tem que cair junto, senão a página mostra grupos fantasma.
      const gp = gruposDaPlanilha(res[0]);
      estado.grupos = gp;
      estado.origemGrupos = gp ? 'planilha' : null;
      const jogos = jogosDaPlanilha(res[1]);
      estado.jogosGrupo = jogos.grupo;
      estado.jogosMataMata = jogos.mataMata;
      estado.atualizadoEm = new Date();
      return true;
    });
  }

  function recalcular() {
    if (!estado.grupos) {
      const salvo = gruposSalvos();
      if (salvo && salvo.grupos) {
        estado.grupos = salvo.grupos;
        estado.origemGrupos = 'sorteio-local';
      } else {
        const c = cabecas();
        estado.grupos = { A: c.A.slice(), B: c.B.slice() };
        estado.origemGrupos = 'pendente';
      }
    }

    ['A', 'B'].forEach(function (g) {
      const jogadores = estado.grupos[g];
      const jogos = tabelaDeJogos(g).map(function (j) {
        return { a: j.a, b: j.b, placar: j.placar };
      });
      estado.classificacoes[g] = window.Torneio.classificar(jogadores, jogos);
    });

    estado.chave = window.Torneio.montarChave(estado.classificacoes, estado.jogosMataMata);
  }

  /** Confronto gerado pelo round-robin + placar correspondente da planilha. */
  function tabelaDeJogos(grupo) {
    const rodadas = window.Sorteio.rodadasRoundRobin(estado.grupos[grupo]);
    const porChave = {};
    estado.jogosGrupo
      .filter(function (j) {
        return !j.grupo || j.grupo === grupo;
      })
      .forEach(function (j) {
        if (j.a && j.b) porChave[chaveJogo(j.a, j.b)] = j;
      });

    const jogos = [];
    rodadas.forEach(function (rodada, i) {
      rodada.forEach(function (par) {
        const registro = porChave[chaveJogo(par[0], par[1])];
        let placar = registro ? registro.placar : null;
        // A planilha pode listar o confronto na ordem inversa.
        if (placar && registro.a && chaveJogo(registro.a, registro.b) && registro.a !== par[0]) {
          placar = inverterPlacar(placar);
        }
        jogos.push({
          rodada: i + 1,
          grupo: grupo,
          a: par[0],
          b: par[1],
          placar: placar,
          data: registro ? registro.data : '',
        });
      });
    });
    return jogos;
  }

  function inverterPlacar(p) {
    return {
      sets: p.sets.map(function (s) {
        return [s[1], s[0]];
      }),
      setsA: p.setsB,
      setsB: p.setsA,
      gamesA: p.gamesB,
      gamesB: p.gamesA,
      vencedor: p.vencedor === 'a' ? 'b' : 'a',
      texto: p.sets
        .map(function (s) {
          return s[1] + '-' + s[0];
        })
        .join(' '),
    };
  }

  // ------------------------------------------------------------- render ----

  function render() {
    renderCabecalho();
    renderSorteio();
    renderGrupos();
    renderChave();
    renderStatus();
  }

  function renderCabecalho() {
    $('#titulo').textContent = cfg.torneio.nome;
    $('#subtitulo').textContent = [cfg.torneio.edicao, cfg.torneio.local]
      .filter(Boolean)
      .join(' · ');
  }

  function renderStatus() {
    const alvo = $('#status');
    alvo.innerHTML = '';

    if (estado.erro) {
      alvo.appendChild(el('span', { class: 'badge badge-erro', text: estado.erro }));
      return;
    }
    if (!cfg.planilha.id) {
      alvo.appendChild(
        el('span', {
          class: 'badge badge-aviso',
          text: 'Planilha não configurada — veja docs/PLANILHA.md',
        })
      );
      return;
    }
    if (estado.atualizadoEm) {
      alvo.appendChild(
        el('span', {
          class: 'badge badge-ok',
          text: 'Atualizado às ' + estado.atualizadoEm.toLocaleTimeString('pt-BR'),
        })
      );
    }
  }

  function renderSorteio() {
    const alvo = $('#sorteio-resultado');
    alvo.innerHTML = '';

    if (estado.origemGrupos === 'planilha') {
      alvo.appendChild(
        el('p', {
          class: 'nota',
          text: 'Os grupos já estão definidos na planilha. O sorteio abaixo serve apenas para conferência.',
        })
      );
    }

    const salvo = gruposSalvos();
    if (!salvo) return;

    alvo.appendChild(
      el('p', { class: 'nota', text: 'Semente do último sorteio: "' + salvo.semente + '"' })
    );
    alvo.appendChild(
      el('p', {
        class: 'nota',
        text: 'Copie os dois blocos abaixo e cole nas abas correspondentes da planilha:',
      })
    );

    const acoes = el('div', { class: 'acoes-copiar' });
    acoes.appendChild(botaoCopiar('1. Copiar para a aba Grupos', linhasGrupos(salvo.grupos)));
    acoes.appendChild(botaoCopiar('2. Copiar para a aba Jogos', linhasJogos(salvo.grupos)));
    alvo.appendChild(acoes);
  }

  /** Cada bloco é TSV: colar no Sheets já cai em colunas separadas. */
  function linhasGrupos(grupos) {
    const linhas = ['jogador\tgrupo'];
    ['A', 'B'].forEach(function (g) {
      grupos[g].forEach(function (n) {
        linhas.push(n + '\t' + g);
      });
    });
    return linhas.join('\n');
  }

  function linhasJogos(grupos) {
    const linhas = ['fase\tid\tgrupo\tjogador_a\tjogador_b\tplacar\tdata'];

    ['A', 'B'].forEach(function (g) {
      window.Sorteio.rodadasRoundRobin(grupos[g]).forEach(function (rodada, i) {
        rodada.forEach(function (par) {
          linhas.push(['grupo', 'G' + g + '-R' + (i + 1), g, par[0], par[1], '', ''].join('\t'));
        });
      });
    });

    [['quartas', 'QF1'], ['quartas', 'QF2'], ['quartas', 'QF3'], ['quartas', 'QF4'],
     ['semi', 'SF1'], ['semi', 'SF2'], ['final', '3LUGAR'], ['final', 'FINAL']].forEach(function (p) {
      linhas.push([p[0], p[1], '', '', '', '', ''].join('\t'));
    });

    return linhas.join('\n');
  }

  function botaoCopiar(rotulo, texto) {
    const btn = el('button', { class: 'btn btn-secundario', text: rotulo });
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(texto).then(function () {
        btn.textContent = '✓ Copiado — cole na planilha';
        setTimeout(function () {
          btn.textContent = rotulo;
        }, 2500);
      });
    });
    return btn;
  }

  function renderGrupos() {
    const alvo = $('#grupos');
    alvo.innerHTML = '';

    if (estado.origemGrupos === 'pendente') {
      alvo.appendChild(
        el('p', {
          class: 'nota',
          text: 'Grupos ainda não definidos. Faça o sorteio acima ou preencha a aba "Grupos" da planilha.',
        })
      );
      return;
    }

    ['A', 'B'].forEach(function (g) {
      const bloco = el('section', { class: 'grupo' });
      bloco.appendChild(el('h3', { text: 'Grupo ' + g }));
      bloco.appendChild(tabelaClassificacao(estado.classificacoes[g]));
      bloco.appendChild(el('h4', { text: 'Jogos' }));
      bloco.appendChild(listaJogos(tabelaDeJogos(g)));
      alvo.appendChild(bloco);
    });
  }

  function tabelaClassificacao(linhas) {
    const tabela = el('table', { class: 'tabela' });
    const thead = el('thead');
    const trh = el('tr');
    ['#', 'Jogador', 'J', 'V', 'D', 'Sets', 'Games'].forEach(function (t) {
      trh.appendChild(el('th', { text: t }));
    });
    thead.appendChild(trh);
    tabela.appendChild(thead);

    const tbody = el('tbody');
    linhas.forEach(function (l) {
      const tr = el('tr', { class: l.pos <= 4 ? 'classificado' : '' });
      tr.appendChild(el('td', { class: 'pos', text: String(l.pos) }));
      tr.appendChild(el('td', { class: 'nome', text: l.jogador }));
      tr.appendChild(el('td', { text: String(l.j) }));
      tr.appendChild(el('td', { class: 'destaque', text: String(l.v) }));
      tr.appendChild(el('td', { text: String(l.d) }));
      tr.appendChild(el('td', { text: l.setsPro + '/' + l.setsContra }));
      tr.appendChild(el('td', { text: l.gamesPro + '/' + l.gamesContra }));
      tbody.appendChild(tr);
    });
    tabela.appendChild(tbody);
    return tabela;
  }

  function listaJogos(jogos) {
    const lista = el('ul', { class: 'jogos' });
    jogos.forEach(function (j) {
      const item = el('li', { class: j.placar ? 'jogo concluido' : 'jogo' });
      const venceuA = j.placar && j.placar.vencedor === 'a';
      const venceuB = j.placar && j.placar.vencedor === 'b';

      item.appendChild(el('span', { class: 'rodada', text: 'R' + j.rodada }));
      item.appendChild(el('span', { class: venceuA ? 'jgd vencedor' : 'jgd', text: j.a }));
      item.appendChild(
        el('span', { class: 'placar', text: j.placar ? j.placar.texto : 'x' })
      );
      item.appendChild(el('span', { class: venceuB ? 'jgd vencedor' : 'jgd', text: j.b }));
      lista.appendChild(item);
    });
    return lista;
  }

  function renderChave() {
    const alvo = $('#chave');
    alvo.innerHTML = '';
    if (!estado.chave) return;

    const colunas = [
      { titulo: 'Quartas', ids: ['QF1', 'QF2', 'QF3', 'QF4'] },
      { titulo: 'Semifinais', ids: ['SF1', 'SF2'] },
      { titulo: 'Final', ids: ['FINAL'] },
    ];

    colunas.forEach(function (col) {
      const div = el('div', { class: 'coluna-chave' });
      div.appendChild(el('h4', { text: col.titulo }));
      col.ids.forEach(function (id) {
        div.appendChild(cartaoJogo(estado.chave[id]));
      });
      alvo.appendChild(div);
    });

    const campeao = window.Torneio.vencedorDe(estado.chave, 'FINAL');
    const extra = el('div', { class: 'coluna-chave' });
    extra.appendChild(el('h4', { text: '3º lugar' }));
    extra.appendChild(cartaoJogo(estado.chave['3LUGAR']));
    extra.appendChild(el('h4', { text: 'Campeão' }));
    extra.appendChild(
      el('div', { class: campeao ? 'campeao definido' : 'campeao', text: campeao || 'A definir' })
    );
    alvo.appendChild(extra);
  }

  function cartaoJogo(jogo) {
    const card = el('div', { class: 'card-jogo' });
    card.appendChild(el('span', { class: 'card-id', text: jogo.id }));

    [['a', jogo.rotuloA], ['b', jogo.rotuloB]].forEach(function (lado) {
      const nome = jogo[lado[0]];
      const venceu = jogo.placar && jogo.placar.vencedor === lado[0];
      const linha = el('div', { class: venceu ? 'card-linha vencedor' : 'card-linha' });
      linha.appendChild(
        el('span', { class: nome ? 'card-nome' : 'card-nome pendente', text: nome || lado[1] })
      );
      if (jogo.placar) {
        linha.appendChild(
          el('span', {
            class: 'card-placar',
            text: jogo.placar.sets
              .map(function (s) {
                return lado[0] === 'a' ? s[0] : s[1];
              })
              .join(' '),
          })
        );
      }
      card.appendChild(linha);
    });

    return card;
  }

  // ------------------------------------------------------------ eventos ----

  function ligarSorteio() {
    $('#form-sorteio').addEventListener('submit', function (ev) {
      ev.preventDefault();
      const semente = $('#semente').value.trim();
      if (!semente) return;

      const resultado = window.Sorteio.sortearGrupos(cabecas(), cfg.jogadores, semente);
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(resultado));
      estado.grupos = resultado.grupos;
      estado.origemGrupos = 'sorteio-local';
      recalcular();
      render();
    });

    $('#btn-limpar').addEventListener('click', function () {
      localStorage.removeItem(CHAVE_LOCAL);
      estado.grupos = null;
      estado.origemGrupos = null;
      atualizar();
    });
  }

  function atualizar() {
    estado.erro = null;
    return carregarPlanilha()
      .catch(function (e) {
        // Sem compartilhamento público o navegador nem chega a ver o 401:
        // o fetch morre no CORS e só sobra "Failed to fetch".
        estado.erro = /failed to fetch|networkerror/i.test(e.message)
          ? 'Planilha inacessível — compartilhe como "qualquer pessoa com o link: leitor"'
          : 'Falha ao ler a planilha: ' + e.message;
      })
      .then(function () {
        recalcular();
        render();
      });
  }

  function iniciar() {
    $('#regra-grupos').textContent = cfg.formato.grupos;
    $('#regra-elim').textContent = cfg.formato.eliminatorias;
    $('#lista-jogadores').textContent = todosJogadores().join(' · ');

    ligarSorteio();
    $('#btn-atualizar').addEventListener('click', atualizar);
    atualizar();

    const intervalo = Number(cfg.planilha.autoRefreshSegundos) || 0;
    if (intervalo > 0 && cfg.planilha.id) setInterval(atualizar, intervalo * 1000);
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
