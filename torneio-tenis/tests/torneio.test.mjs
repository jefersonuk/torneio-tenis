import { readFileSync } from 'node:fs';
const raiz = '/Users/jefersonunrein/torneio-tenis/';
const w = { fetch: () => {} };
for (const f of ['src/js/config.js', 'src/js/sorteio.js', 'src/js/torneio.js']) {
  new Function('window', 'fetch', readFileSync(raiz + f, 'utf8'))(w, w.fetch);
}
const { parsePlacar, classificar, montarChave, vencedorDe } = w.Torneio;
let falhas = 0;
const ok = (nome, cond, extra) => {
  console.log((cond ? '  ok  ' : ' FALHA') + ' ' + nome + (cond ? '' : ' -> ' + extra));
  if (!cond) falhas++;
};

// --- parsePlacar
ok('placar 6-4', parsePlacar('6-4').vencedor === 'a');
ok('placar 3 sets', parsePlacar('6/4 3-6 10-8').vencedor === 'a');
ok('placar 6x2 6x7 4x6', parsePlacar('6x2 6x7 4x6').vencedor === 'b');
ok('placar vazio', parsePlacar('') === null);
ok('placar 1-1 sets invalido', parsePlacar('6-4 3-6') === null);
ok('games somados', parsePlacar('6-4 6-3').gamesA === 12 && parsePlacar('6-4 6-3').gamesB === 7);

// --- confronto direto: A e B empatados em vitorias, B venceu o confronto
const g = ['Ana', 'Bia', 'Cris', 'Dani'];
const jogos = [
  { a: 'Ana', b: 'Bia', placar: parsePlacar('2-6') }, // Bia vence
  { a: 'Ana', b: 'Cris', placar: parsePlacar('6-0') },
  { a: 'Ana', b: 'Dani', placar: parsePlacar('6-0') },
  { a: 'Bia', b: 'Cris', placar: parsePlacar('6-4') },
  { a: 'Bia', b: 'Dani', placar: parsePlacar('6-4') },
  { a: 'Cris', b: 'Dani', placar: parsePlacar('6-3') },
];
const tab = classificar(g, jogos);
ok('confronto direto desempata', tab[0].jogador === 'Bia', tab.map((l) => l.jogador).join(','));
ok('2o lugar Ana', tab[1].jogador === 'Ana');
ok('vitorias contabilizadas', tab[0].v === 3 && tab[0].j === 3);
ok('games contabilizados', tab[0].gamesPro === 18, String(tab[0].gamesPro));

// --- torneio completo: 2 grupos de 5
const grupos = {
  A: ['A1', 'A2', 'A3', 'A4', 'A5'],
  B: ['B1', 'B2', 'B3', 'B4', 'B5'],
};
function jogosGrupo(nomes) {
  const out = [];
  for (let i = 0; i < nomes.length; i++)
    for (let j = i + 1; j < nomes.length; j++)
      // o de indice menor sempre vence -> ordem final = ordem da lista
      out.push({ a: nomes[i], b: nomes[j], placar: parsePlacar('6-2') });
  return out;
}
const cls = {
  A: classificar(grupos.A, jogosGrupo(grupos.A)),
  B: classificar(grupos.B, jogosGrupo(grupos.B)),
};
ok('grupo A ordenado', cls.A.map((l) => l.jogador).join(',') === 'A1,A2,A3,A4,A5', cls.A.map((l) => l.jogador).join(','));
ok('todos com 4 jogos', cls.A.every((l) => l.j === 4));

let chave = montarChave(cls, []);
ok('QF1 = A1 x B4', chave.QF1.a === 'A1' && chave.QF1.b === 'B4', chave.QF1.a + ' x ' + chave.QF1.b);
ok('QF2 = B2 x A3', chave.QF2.a === 'B2' && chave.QF2.b === 'A3');
ok('QF3 = B1 x A4', chave.QF3.a === 'B1' && chave.QF3.b === 'A4');
ok('QF4 = A2 x B3', chave.QF4.a === 'A2' && chave.QF4.b === 'B3');
ok('5o colocado fora', !JSON.stringify(chave).includes('A5'));
ok('SF vazia sem resultado das QF', chave.SF1.a === null);

// --- grupo incompleto nao gera classificados
const parcial = { A: classificar(grupos.A, jogosGrupo(grupos.A).slice(0, 3)), B: cls.B };
ok('grupo incompleto -> QF a definir', montarChave(parcial, []).QF1.a === null);

// --- avanco do mata-mata
const mm = [
  { id: 'QF1', a: '', b: '', placar: parsePlacar('6-1 6-2') },
  { id: 'QF2', a: '', b: '', placar: parsePlacar('6-1 6-2') },
  { id: 'QF3', a: '', b: '', placar: parsePlacar('1-6 2-6') },
  { id: 'QF4', a: '', b: '', placar: parsePlacar('6-1 6-2') },
];
chave = montarChave(cls, mm);
ok('SF1 = A1 x B2', chave.SF1.a === 'A1' && chave.SF1.b === 'B2', chave.SF1.a + ' x ' + chave.SF1.b);
ok('SF2 = A4 x A2', chave.SF2.a === 'A4' && chave.SF2.b === 'A2', chave.SF2.a + ' x ' + chave.SF2.b);

mm.push({ id: 'SF1', a: '', b: '', placar: parsePlacar('7-5 6-4') });
mm.push({ id: 'SF2', a: '', b: '', placar: parsePlacar('4-6 6-3 10-7') });
mm.push({ id: 'FINAL', a: '', b: '', placar: parsePlacar('6-4 6-4') });
chave = montarChave(cls, mm);
ok('final = A1 x A4', chave.FINAL.a === 'A1' && chave.FINAL.b === 'A4', chave.FINAL.a + ' x ' + chave.FINAL.b);
ok('campeao A1', vencedorDe(chave, 'FINAL') === 'A1');
ok('3o lugar = B2 x A2', chave['3LUGAR'].a === 'B2' && chave['3LUGAR'].b === 'A2', chave['3LUGAR'].a + ' x ' + chave['3LUGAR'].b);

// --- CSV
const linhas = w.Torneio.csvParaObjetos('fase,id,placar\ngrupo,GA-R1,"6-4"\ngrupo,GA-R2,\n');
ok('csv 2 linhas', linhas.length === 2, String(linhas.length));
ok('csv aspas', linhas[0].placar === '6-4');
ok('csv campo vazio', linhas[1].placar === '');

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
