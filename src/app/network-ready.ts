/**
 * Sinal de "rede pronta". A interface aparece antes do MSW terminar de iniciar;
 * a primeira requisição REST e a conexão Socket.IO esperam este sinal. Sem mocks,
 * ele é dado logo na inicialização. Depois disso é uma promessa já resolvida.
 */
let markReady: () => void = () => undefined

export const networkReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function markNetworkReady() {
  markReady()
}
