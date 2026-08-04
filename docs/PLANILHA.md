# Planilha de resultados (Google Sheets)

A página é estática: ela **lê** a planilha, nunca escreve nela. Quem organiza atualiza os
placares no Sheets pelo celular e o site público reflete em até 1 minuto.

## 1. Criar a planilha

Crie uma planilha nova com **duas abas**, com exatamente estes nomes:

### Aba `Grupos`

| jogador | grupo |
| ------- | ----- |
| Aderson | A     |
| Murilo  | A     |
| ...     | ...   |
| Jean    | B     |

### Aba `Jogos`

| fase    | id     | grupo | jogador_a | jogador_b | placar          | data  |
| ------- | ------ | ----- | --------- | --------- | --------------- | ----- |
| grupo   | GA-R1  | A     | Murilo    | Bruno     | 6-4             | 10/08 |
| grupo   | GA-R1  | A     | Japa      | Fabiano   |                 |       |
| quartas | QF1    |       |           |           |                 |       |
| final   | FINAL  |       |           |           |                 |       |

Regras das colunas:

- **fase** — `grupo`, `quartas`, `semi` ou `final`.
- **id** — livre na fase de grupos; nas eliminatórias **precisa** ser um de
  `QF1 QF2 QF3 QF4 SF1 SF2 3LUGAR FINAL`.
- **jogador_a / jogador_b** — nos jogos de grupo, os nomes exatamente como na aba `Grupos`.
  Nas eliminatórias **deixe em branco**: a página preenche sozinha a partir da classificação.
- **placar** — vazio enquanto não jogado. Formatos aceitos: `6-4`, `6/4 3-6 10-8`, `6x4 6x2`.
  A ordem dos games segue a ordem dos jogadores na linha.
- **data** — opcional, texto livre.

Você não precisa digitar nada disso à mão. Depois do sorteio, a própria página
mostra dois botões — **"1. Copiar para a aba Grupos"** e **"2. Copiar para a aba Jogos"** —
que geram todas as linhas prontas. Cole cada bloco na aba correspondente.

Alternativa por terminal, se preferir:

```bash
node scripts/gerar-planilha.mjs "04/08/2026 + Mega-Sena 2801"
```

## 2. Liberar a leitura

Na planilha: **Compartilhar > Acesso geral > Qualquer pessoa com o link > Leitor**.

Isso basta — não é preciso usar "Publicar na web".

## 3. Conectar ao site

Copie o ID da planilha, que é o trecho entre `/d/` e `/edit` na URL:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit#gid=0
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ este pedaço
```

Cole em [`src/js/config.js`](../src/js/config.js):

```js
planilha: {
  id: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
  ...
}
```

Commit, push, e o site público passa a mostrar os resultados.

## Solução de problemas

| Sintoma                             | Causa provável                                                    |
| ----------------------------------- | ----------------------------------------------------------------- |
| "Falha ao ler a planilha: HTTP 404" | Nome da aba diferente de `Grupos`/`Jogos`, ou ID errado.           |
| Erro de CORS / HTTP 401             | A planilha não está compartilhada como "qualquer pessoa com link". |
| Jogo aparece sem placar             | Formato do placar não reconhecido, ou nomes divergentes da aba `Grupos`. |
| Quartas mostram "A definir"         | Normal: só preenchem quando **todos** os jogos do grupo terminarem. |
