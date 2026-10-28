import { expect, test, type Page } from '@playwright/test'

const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!' }
const BRUNO = { email: 'bruno@kurio.app', password: 'Kurio2026!' }

async function fillLogin(page: Page, user: { email: string; password: string }) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

async function login(page: Page, path: string, user = ANA) {
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}auth=entrar`)
  await fillLogin(page, user)
}

const heart = (page: Page, name: string) => page.getByRole('button', { name: `Favoritar ${name}` }).first()

test.describe('favoritos', () => {
  test('visitante é levado ao login e volta para a mesma tela', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await heart(page, 'Emerald Ape #042').click()
    await fillLogin(page, ANA)
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await expect(heart(page, 'Emerald Ape #042')).toHaveAttribute('aria-pressed', 'false')
  })

  test('favorita, aparece na lista de interesse, persiste e remove', async ({ page }) => {
    await login(page, '/')
    const button = heart(page, 'Emerald Ape #042')
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Emerald Ape #042 entrou na sua lista de interesse.')).toBeVisible()

    await page.goto('/perfil/favoritos')
    const list = page.getByRole('region', { name: 'Lista de interesse' }).or(page.locator('section[aria-labelledby="favoritos-titulo"]'))
    await expect(list.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
    // Os favoritos de fixture da Ana continuam lá.
    await expect(list.getByRole('link', { name: 'Sage Nomad #009' })).toBeVisible()

    await page.reload()
    await expect(list.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
    await heart(page, 'Emerald Ape #042').click()
    await expect(list.getByRole('link', { name: 'Emerald Ape #042' })).toHaveCount(0)
  })

  test('falha ao favoritar desfaz a mudança e permite tentar de novo', async ({ page }) => {
    await login(page, '/nft/emerald-ape-042')
    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'favoritos-falha'))
    const button = heart(page, 'Emerald Ape #042')

    await button.click()
    // Otimista: marca na hora e volta quando a API recusa.
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText(/Não foi possível favoritar Emerald Ape #042/)).toBeVisible()
    await expect(button).toHaveAttribute('aria-pressed', 'false')

    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'padrao'))
    await button.click()
    await expect(page.getByText('Emerald Ape #042 entrou na sua lista de interesse.')).toBeVisible()
    await page.reload()
    await expect(heart(page, 'Emerald Ape #042')).toHaveAttribute('aria-pressed', 'true')
  })

  test('favoritos de um usuário não aparecem para outro', async ({ page }) => {
    await login(page, '/perfil/favoritos')
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, '/perfil/favoritos', BRUNO)
    await expect(page.getByText('Sua lista de interesse está vazia')).toBeVisible()
  })
})
