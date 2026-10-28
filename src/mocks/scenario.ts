import { delay, HttpResponse } from 'msw'
import { readScenario } from './scenario-store'

export { applyScenarioFromUrl, readScenario, SCENARIOS, writeScenario, type ScenarioId } from './scenario-store'

let requestSequence = 0

/**
 * Aplica latência e falhas do cenário ativo. Retorna uma resposta de falha
 * quando o cenário exige, ou `undefined` para o handler seguir normalmente.
 */
export async function simulateNetwork(): Promise<Response | undefined> {
  const scenario = readScenario()
  requestSequence += 1

  switch (scenario) {
    case 'lento':
      await delay(2500)
      break
    case 'fora-de-ordem':
      await delay(requestSequence % 2 === 1 ? 1600 : 200)
      break
    case 'erro-servidor':
      // O erro demora um pouco, como um servidor sobrecarregado.
      await delay(600)
      break
    default:
      await delay(180)
  }

  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'erro-servidor') {
    return HttpResponse.json(
      { error: { code: 'internal_error', message: 'O servidor encontrou um erro. Tente novamente.' } },
      { status: 500 },
    )
  }
  return undefined
}
