import { expect, test, type Page } from '@playwright/test'

/**
 * Regressão visual das telas do enunciado. Estado isolado por teste (contexto novo,
 * fixtures padrão), relógio fixo e espera pelos dados e pela fonte antes da captura.
 * As baselines ficam versionadas em e2e/visual.spec.ts-snapshots/.
 */
const FIXED_NOW = new Date('2026-10-20T12:00:00Z')
const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!' }
// Em paralelo com a suíte inteira, o primeiro carregamento (MSW + dados) pode passar de 5 s.
const LOAD = { timeout: 15_000 }

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, LOAD)
}

async function login(page: Page) {
  await page.goto('/?auth=entrar')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(ANA.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

async function addToCart(page: Page, path: string) {
  await page.goto(path)
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW)
})

test('início', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#catalogo article').first()).toBeVisible(LOAD)
  await settle(page)
  await expect(page).toHaveScreenshot('inicio.png')
})

test('detalhe do NFT', async ({ page }) => {
  await page.goto('/nft/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible(LOAD)
  await settle(page)
  await expect(page).toHaveScreenshot('detalhe.png')
})

test('carrinho', async ({ page }) => {
  await login(page)
  await addToCart(page, '/nft/emerald-ape-042')
  await addToCart(page, '/nft/violet-nomad-314')
  await expect(page.getByRole('link', { name: 'Violet Nomad #314' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('carrinho.png')
})

test('pagamento', async ({ page }) => {
  await login(page)
  await addToCart(page, '/nft/emerald-ape-042')
  await page.goto('/pagamento')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeVisible(LOAD)
  await expect(page.getByText('1.206 ETH').first()).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('pagamento.png')
})
