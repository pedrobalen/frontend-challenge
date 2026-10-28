import { expect, test, type Page } from '@playwright/test'

const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!' }
const SLOW = { timeout: 15_000 }
/** Tempo que o servidor simulado leva para confirmar ou recusar um pedido. */
const PROCESSING_MS = 3_000

async function setScenario(page: Page, scenario: string) {
  await page.evaluate((value) => localStorage.setItem('kurio:mock-scenario', value), scenario)
}

async function login(page: Page) {
  await page.goto('/?auth=entrar')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(ANA.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

async function addToCart(page: Page, path = '/nft/emerald-ape-042') {
  await page.goto(path)
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

async function openReview(page: Page) {
  await page.goto('/pagamento')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review.getByText('Total', { exact: true })).toBeVisible()
  return review
}

async function ordersOf(page: Page) {
  return page.evaluate(() => fetch('/api/orders').then((response) => response.json() as Promise<{ id: string; status: string }[]>))
}

test.describe('pagamento', () => {
  test('visitante é levado ao login e volta para o pagamento', async ({ page }) => {
    await page.goto('/pagamento')
    await expect(page).toHaveURL(/auth=entrar/)
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/pagamento$/)
  })

  test('compra completa: do catálogo ao recibo confirmado', async ({ page }) => {
    await page.clock.install()
    await login(page)
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/pagamento$/)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review.getByText('Emerald Ape #042')).toBeVisible()
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page).toHaveURL(/\/pedidos\/ped_/)
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()

    // A confirmação só aparece quando a simulação confirma o pedido (3 s de processamento).
    const receipt = page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(receipt).toHaveCount(0)
    await page.clock.fastForward(PROCESSING_MS)
    await expect(receipt).toBeVisible()
    await expect(receipt.getByText('Emerald Ape #042')).toBeVisible()
    await expect(receipt.getByText('1.206 ETH').first()).toBeVisible()

    // Só o que foi comprado sai do carrinho.
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('valida os campos do layout antes de conectar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'O formulário de perfil só existe no layout desktop.')
    await login(page)
    await addToCart(page)
    await page.goto('/pagamento')

    const email = page.locator('#checkout').getByLabel('E-mail')
    await email.fill('email-invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('carteira recusa a conexão', async ({ page }) => {
    await login(page)
    await addToCart(page)
    await setScenario(page, 'carteira-recusada')
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('A conexão foi recusada na carteira. Tente de novo ou escolha outra carteira.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('preço alterado no envio exige nova confirmação', async ({ page }) => {
    await login(page)
    await addToCart(page)
    const review = await openReview(page)
    await setScenario(page, 'preco-alterado')
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(review.getByText('Os valores mudaram desde a revisão. Confira e confirme de novo.')).toBeVisible()
    await expect(review.getByText('1.29 ETH').first()).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento$/)

    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ped_/)
  })

  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await page.clock.install()
    await login(page)
    await addToCart(page)
    await setScenario(page, 'pagamento-recusado')
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()
    await page.clock.fastForward(PROCESSING_MS)
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/carrinho')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await login(page)
    await addToCart(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).dblclick()
    await expect(page).toHaveURL(/\/pedidos\/ped_/)
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela chave', async ({ page }) => {
    await login(page)
    await addToCart(page)
    await setScenario(page, 'timeout-pedido')
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(review.getByText('Ainda não recebemos a confirmação. Verificando seu pedido sem cobrar de novo…')).toBeVisible(SLOW)
    await expect(page).toHaveURL(/\/pedidos\/ped_/, SLOW)
    await setScenario(page, 'padrao')
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('pedido pendente continua após refresh, sem nova compra', async ({ page }) => {
    await page.clock.install()
    await login(page)
    await addToCart(page)
    const review = await openReview(page)
    await review.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Processando seu pagamento' })).toBeVisible()
    await page.clock.fastForward(PROCESSING_MS)
    await expect(page.getByRole('dialog', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const orders = await ordersOf(page)
    expect(orders).toHaveLength(1)
    expect(orders[0]!.status).toBe('confirmado')
  })
})
