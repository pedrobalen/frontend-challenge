import { expect, test, type Page } from '@playwright/test'

const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!' }

/** Gatilhos do servidor simulado: mudam dados e o Socket.IO avisa a interface. */
async function mock(page: Page, path: string, body: unknown) {
  await page.evaluate(
    ([url, payload]) =>
      fetch(url as string, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }),
    [`/api/__mock/${path}`, body] as const,
  )
}

async function login(page: Page) {
  await page.goto('/?auth=entrar')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(ANA.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

async function addToCart(page: Page) {
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(page.getByText('1.206 ETH')).toBeVisible()
  await waitForRealtime(page)
}

/** Os gatilhos só chegam pelo Socket.IO depois que a conexão está aberta. */
async function waitForRealtime(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-realtime', 'conectado')
}

const firstCardPrice = (page: Page) => page.locator('#catalogo article').first().locator('p').first()

test.describe('tempo real', () => {
  test('nft.updated atualiza o catálogo e ignora duplicatas e eventos antigos', async ({ page }) => {
    await page.goto('/')
    await expect(firstCardPrice(page)).toContainText('1.19 ETH')
    await waitForRealtime(page)

    await mock(page, 'nfts/emerald-ape-042', { price: '1.49' })
    await expect(firstCardPrice(page)).toContainText('1.49 ETH')

    // Duplicata (mesmo id) e evento antigo (versão menor, preço 99.99) não mudam nada.
    await mock(page, 'realtime/replay', { mode: 'duplicate' })
    await mock(page, 'realtime/replay', { mode: 'stale' })
    await page.waitForTimeout(500)
    await expect(firstCardPrice(page)).toContainText('1.49 ETH')
    await expect(page.getByText('99.99')).toHaveCount(0)
  })

  test('preço alterado com o NFT no carrinho avisa e bloqueia até confirmar', async ({ page }) => {
    await login(page)
    await addToCart(page)

    await mock(page, 'nfts/emerald-ape-042', { price: '1.29' })
    await expect(page.getByText('O preço de Emerald Ape #042 mudou para 1.29 ETH. O resumo do carrinho foi atualizado.')).toBeVisible()
    await expect(page.getByText('1.306 ETH')).toBeVisible()
    await expect(page.getByText('Preço atualizado de 1.19 ETH para 1.29 ETH.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()

    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
  })

  test('edição esgotada enquanto o carrinho está aberto', async ({ page }) => {
    await login(page)
    await addToCart(page)
    await mock(page, 'nfts/emerald-ape-042', { editionId: '1-50', available: 0 })
    await expect(page.getByText('Edição esgotada. Remova o item para continuar.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('checkout não confirma com cotação desatualizada', async ({ page }) => {
    await login(page)
    await addToCart(page)
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review.getByText('1.206 ETH')).toBeVisible()
    await waitForRealtime(page)

    await mock(page, 'nfts/emerald-ape-042', { price: '1.39' })
    // A revisão recebe a cotação nova e mostra a mudança antes de qualquer envio.
    await expect(review.getByText('Preço atualizado: antes 1.19 ETH.')).toBeVisible()
    await expect(review.getByText('1.406 ETH')).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ped_/)
  })

  test('queda de conexão com pedido pendente: reconecta e recupera o resultado sem nova compra', async ({ page }) => {
    await page.clock.install()
    await login(page)
    await addToCart(page)
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('dialog', { name: 'Revise seu pedido' }).getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()
    await waitForRealtime(page)

    // O pedido termina enquanto o Socket.IO está fora: o order.updated se perde.
    await mock(page, 'realtime/disconnect', { outageMs: 4000 })
    // O aviso só aparece se a queda passar de 1,2 s.
    await page.clock.fastForward(1_200)
    await expect(page.getByText('Reconectando as atualizações em tempo real…')).toBeVisible()
    // Fim da queda; o pedido já terminou e o REST traz o resultado na reconexão.
    await page.clock.fastForward(4_000)
    await expect(page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expect(page.getByText('Reconectando as atualizações em tempo real…')).toHaveCount(0)

    const orders = await page.evaluate(() => fetch('/api/orders').then((response) => response.json() as Promise<unknown[]>))
    expect(orders).toHaveLength(1)
  })
})
