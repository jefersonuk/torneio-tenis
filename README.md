# 🎾 Torneio Interno de Tênis

Página pública com sorteio dos grupos, tabelas de classificação e chave eliminatória.
Site estático (sem build, sem servidor) publicado no GitHub Pages, alimentado por uma
planilha do Google Sheets.

## Formato

- **10 jogadores**, sorteados em **2 grupos de 5**.
- Fase de grupos: **todos contra todos** (10 jogos por grupo, 4 jogos por jogador).
- Os **4 primeiros de cada grupo** avançam.
- Quartas cruzadas entre os grupos, com os dois líderes em metades opostas da chave:

  | Jogo | Confronto        |
  | ---- | ---------------- |
  | QF1  | 1º A × 4º B      |
  | QF2  | 2º B × 3º A      |
  | QF3  | 1º B × 4º A      |
  | QF4  | 2º A × 3º B      |

  `SF1 = QF1 × QF2`, `SF2 = QF3 × QF4`, mais final e disputa de 3º lugar.

- Desempate no grupo, nesta ordem: **vitórias → confronto direto** (empate entre 2) →
  **% de sets vencidos → % de games vencidos**.

## Sorteio auditável

O sorteio não usa `Math.random()`. Ele deriva de uma **semente pública** — um texto
combinado entre todos antes do sorteio, que ninguém consegue prever nem manipular
(ex.: `"04/08/2026 + Mega-Sena 2801"`).

Qualquer pessoa que digite a mesma semente na página obtém **exatamente a mesma
divisão de grupos**. Isso permite conferir o sorteio depois, sem precisar confiar em
quem clicou no botão.

Depois de sortear, a página mostra dois botões que copiam as linhas prontas para
colar nas abas `Grupos` e `Jogos` da planilha. Quem preferir o terminal:

```bash
node scripts/gerar-planilha.mjs "04/08/2026 + Mega-Sena 2801"
```

## Como configurar

1. Edite [`src/js/config.js`](src/js/config.js): nomes dos jogadores, nome do torneio,
   formato dos jogos e o ID da planilha.
2. Crie a planilha seguindo [`docs/PLANILHA.md`](docs/PLANILHA.md).
3. Publique (abaixo).

## Como publicar no GitHub Pages

```bash
gh repo create torneio-tenis --public --source=. --push
```

Sem o `gh`, crie o repositório pelo site e então:

```bash
git remote add origin git@github.com:SEU_USUARIO/torneio-tenis.git && git push -u origin main
```

Depois, no repositório: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

O link público fica em `https://SEU_USUARIO.github.io/torneio-tenis/`.

## Rodando localmente

```bash
python3 -m http.server 8000
```

E abra <http://localhost:8000>.

## Estrutura

```
index.html                  página única
src/js/config.js            ← o único arquivo que você costuma editar
src/js/sorteio.js           PRNG com semente, sorteio e round-robin
src/js/torneio.js           leitura da planilha, classificação e chave
src/js/app.js               renderização
src/css/style.css           estilo (tema claro e escuro)
scripts/gerar-planilha.mjs  gera as linhas para colar no Sheets
docs/PLANILHA.md            como montar e conectar a planilha
```
