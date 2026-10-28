import { expect, test } from '@playwright/test'

test.describe('detalhe do NFT', () => {
  test('abre pelo catálogo e mostra preço, edições e coleção', async ({ page }) => {
    await page.goto('/')
    await page.locator('#catalogo').getByRole('link', { name: 'Emerald Ape #042' }).click()

    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByText('1.19 ETH').first()).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Edição 1/50' })).toBeChecked()
    await expect(page.getByText('Kurio Apes')).toBeVisible()
  })

  test('acesso direto com edição na URL e limite de quantidade', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042?edicao=1-1')
    await expect(page.getByRole('radio', { name: 'Edição 1/1', exact: true })).toBeChecked()

    // A edição 1/1 tem uma unidade: não dá para aumentar.
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(page.getByText('Só resta 1 unidade desta edição.')).toBeVisible()

    // Na 1/50 o limite é o máximo por pedido (10).
    await page.getByText('1/50', { exact: true }).click()
    await expect(page).toHaveURL(/edicao=1-50/)
    const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 9; i++) await increase.click()
    await expect(page.getByLabel('Quantidade selecionada')).toHaveText('10')
    await expect(increase).toBeDisabled()
    await expect(page.getByText('Máximo de 10 unidades por pedido.')).toBeVisible()
  })

  test('edição esgotada fica indisponível e NFT esgotado bloqueia a compra', async ({ page }) => {
    await page.goto('/nft/sage-nomad-009')
    await expect(page.getByRole('radio', { name: 'Edição 1/1, esgotada' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Edição 1/10, esgotada' })).toBeDisabled()

    await page.goto('/nft/golden-signal-160')
    await expect(page.getByText('Todas as edições deste NFT estão esgotadas.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Esgotado' })).toBeDisabled()
  })

  test('NFT inexistente mostra aviso e volta ao mercado', async ({ page }) => {
    await page.goto('/nft/nao-existe-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
    await expect(page).toHaveURL(/\/#catalogo$/)
  })

  test('avaliações carregam ao abrir a aba', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await page.getByRole('tab', { name: /Avaliações/ }).click()
    await expect(page.getByRole('tabpanel').getByRole('listitem')).toHaveCount(5)
    await page.getByRole('button', { name: 'Próximas' }).click()
    await expect(page.getByText('Página 2 de 4')).toBeVisible()
  })
})
