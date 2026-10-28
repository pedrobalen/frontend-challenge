// Sem dependência do MSW: roda no carregamento inicial, antes do chunk dos mocks.

/**
 * Cenários de rede determinísticos. Selecione com `?cenario=<id>` na URL
 * (fica salvo no localStorage) e volte ao padrão com `?cenario=padrao`.
 */
export const SCENARIOS = {
  padrao: 'Latência curta e respostas de sucesso',
  lento: 'Toda resposta demora 2,5 s',
  'fora-de-ordem': 'Requisições ímpares demoram mais que as pares, invertendo a ordem de chegada',
  vazio: 'Catálogo sem resultados',
  'erro-servidor': 'Toda requisição responde 500 depois de 600 ms',
  offline: 'Falha de conexão em todas as requisições',
  'sessao-expirada': 'A próxima requisição autenticada encontra a sessão expirada',
  'conflito-cadastro': 'O cadastro sempre responde que o e-mail já está em uso',
  'carteira-recusada': 'A carteira recusa a conexão',
  'carteira-desconectada': 'A carteira desconecta antes do envio do pedido',
  'preco-alterado': 'O preço do primeiro item sobe 0.10 ETH no envio do pedido',
  'edicao-esgotada': 'A edição do primeiro item esgota no envio do pedido',
  'timeout-pedido': 'O pedido é criado, mas a primeira resposta demora mais que o limite do cliente',
  'pagamento-recusado': 'O pagamento é recusado ao fim do processamento',
  'favoritos-falha': 'Adicionar ou remover favorito responde 500 depois de 600 ms',
} as const

export type ScenarioId = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mock-scenario'

function isScenario(value: string | null): value is ScenarioId {
  return value !== null && value in SCENARIOS
}

export function readScenario(): ScenarioId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isScenario(stored)) return stored
  } catch {
    // Sem storage, usa o padrão.
  }
  return 'padrao'
}

export function writeScenario(id: ScenarioId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Ignorado: o cenário vale só nesta sessão.
  }
}

/** Lê `?cenario=` da URL inicial, persiste e remove o parâmetro. */
export function applyScenarioFromUrl() {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get('cenario')
  if (requested === null) return
  if (isScenario(requested)) writeScenario(requested)
  url.searchParams.delete('cenario')
  window.history.replaceState(window.history.state, '', url)
}
