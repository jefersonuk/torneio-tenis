#!/usr/bin/env node
/**
 * Gera as linhas para colar nas abas "Grupos" e "Jogos" do Google Sheets.
 *
 *   node scripts/gerar-planilha.mjs "04/08/2026 + Mega-Sena 2801"
 *
 * A semente é a mesma que você digitar na página — o resultado é idêntico.
 * Reutiliza src/js/config.js e src/js/sorteio.js para não duplicar regra.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const janela = {};
for (const arquivo of ['src/js/config.js', 'src/js/sorteio.js']) {
  new Function('window', readFileSync(resolve(raiz, arquivo), 'utf8'))(janela);
}

const semente = process.argv[2];
if (!semente) {
  console.error('Uso: node scripts/gerar-planilha.mjs "<semente pública>"');
  process.exit(1);
}

const cfg = janela.CONFIG;
const cabecas = { A: cfg.cabecas?.A ?? [], B: cfg.cabecas?.B ?? [] };
const { grupos } = janela.Sorteio.sortearGrupos(cabecas, cfg.jogadores, semente);

const linhasGrupos = ['jogador\tgrupo'];
const linhasJogos = ['fase\tid\tgrupo\tjogador_a\tjogador_b\tplacar\tdata'];

for (const g of ['A', 'B']) {
  for (const nome of grupos[g]) linhasGrupos.push(`${nome}\t${g}`);

  janela.Sorteio.rodadasRoundRobin(grupos[g]).forEach((rodada, i) => {
    for (const [a, b] of rodada) {
      linhasJogos.push(`grupo\tG${g}-R${i + 1}\t${g}\t${a}\t${b}\t\t`);
    }
  });
}

for (const id of ['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', '3LUGAR', 'FINAL']) {
  const fase = id.startsWith('QF') ? 'quartas' : id.startsWith('SF') ? 'semi' : 'final';
  linhasJogos.push(`${fase}\t${id}\t\t\t\t\t`);
}

console.log(`\n=== Semente: "${semente}" ===`);
console.log('\n--- Aba "Grupos" ---\n');
console.log(linhasGrupos.join('\n'));
console.log('\n--- Aba "Jogos" ---\n');
console.log(linhasJogos.join('\n'));
console.log('\nCole cada bloco na aba correspondente (Colar > Dividir texto em colunas).\n');
