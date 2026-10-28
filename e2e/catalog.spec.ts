import { expect, test } from '@playwright/test'

const catalog = (page: import('@playwright/test').Page) => page.locator('#catalogo')
const cardNames = (page: import('@playwright/test').Page) => catalog(page).locator('li h3')

test.describe('catálogo', () => {
  test('busca, filtros combinados, ordenação, paginação e histórico', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Filtros na coluna lateral só existem no desktop.')

    await page.goto('/')
    await expect(cardNames(page)).toHaveCount(9)
    await expect(cardNames(page).first()).toHaveText('Emerald Ape #042')

    const sidebar = page.getByRole('complementary', { name: 'Filtros do catálogo' })
    await sidebar.getByRole('link', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/colecao=musica/)
    await sidebar.getByRole('link', { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/rede=ethereum/)

    await page.getByRole('button', { name: /Ordenar por/ }).click()
    await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/ordem=menor-preco/)
    await expect(catalog(page).getByRole('status')).toContainText('página 1 de')

    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(catalog(page).getByRole('status')).toContainText('página 2 de')
    const pageTwoFirst = await cardNames(page).first().textContent()

    // Mudar um filtro volta para a primeira página.
    await sidebar.getByRole('link', { name: /^Polygon/ }).click()
    await expect(page).not.toHaveURL(/pagina=/)

    // O histórico restaura o estado anterior, inclusive a página.
    await page.goBack()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(cardNames(page).first()).toHaveText(pageTwoFirst!)

    // E o refresh mantém tudo.
    await page.reload()
    await expect(page).toHaveURL(/colecao=musica.*rede=ethereum|rede=ethereum.*colecao=musica/)
    await expect(cardNames(page).first()).toHaveText(pageTwoFirst!)
  })

  test('busca pelo nome e estado vazio', async ({ page }) => {
    await page.goto('/?q=golden%20beat')
    await expect(cardNames(page).first()).toContainText('Golden Beat')

    await page.goto('/?q=inexistente-xyz')
    await expect(catalog(page).getByText('Nenhum NFT encontrado')).toBeVisible()
    await catalog(page).getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(cardNames(page)).toHaveCount(9)
  })

  test('falha do servidor mostra erro e permite nova tentativa', async ({ page }) => {
    await page.goto('/?cenario=erro-servidor')
    const alert = catalog(page).getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })

    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'padrao'))
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(cardNames(page)).toHaveCount(9)
  })
})
