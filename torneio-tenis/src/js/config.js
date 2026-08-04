/**
 * ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR PARA CONFIGURAR O TORNEIO.
 */
window.CONFIG = {
  torneio: {
    nome: 'Torneio Interno de Tênis',
    edicao: '2026',
    local: '',
  },

  /** Os 10 participantes. Todos entram no sorteio. */
  jogadores: [
    'Fabiano',
    'Aderson',
    'Murilo',
    'Japa',
    'Márcio',
    'Marcelo',
    'Jeferson',
    'Bruno',
    'Miqueias',
    'Jean',
  ],

  /**
   * Jogadores com posição fixa (fora do sorteio). Sem cabeças-de-chave neste
   * torneio — deixe as listas vazias. Se um dia quiser fixar alguém, basta
   * mover o nome de `jogadores` para cá.
   */
  cabecas: {
    A: [],
    B: [],
  },

  /**
   * Planilha Google Sheets (ver docs/PLANILHA.md).
   * Cole apenas o ID da planilha — o trecho entre /d/ e /edit da URL.
   * Deixe em branco para a página funcionar só com o sorteio.
   */
  planilha: {
    id: '11n66a2w61rJ4FgjgZkNLLy4vN6S1jO2RNewqhk44U1w',
    abaGrupos: 'Grupos',
    abaJogos: 'Jogos',
    // Recarrega os dados automaticamente a cada N segundos (0 = desligado).
    autoRefreshSegundos: 60,
  },

  /**
   * Formato dos jogos — usado apenas nos textos de regra exibidos na página.
   */
  formato: {
    grupos: 'Set único até 6 games (tie-break em 6-6)',
    eliminatorias: 'Melhor de 3 sets (3º set em match tie-break até 10)',
  },
};
