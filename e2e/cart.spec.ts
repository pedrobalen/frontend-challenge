import { expect, test, type Page } from '@playwright/test'

async function addFromDetail(page: Page, path: string) {
  await page.goto(path)
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

const quantityOf = (page: Page, name: string) => page.getByRole('group', { name: `Quantidade de ${name}` })

test.describe('carrinho', () => {
  test('adiciona pelo detalhe, soma valores da API e mantém após refresh', async ({ page }) => {
    await addFromDetail(page, '/nft/emerald-ape-042')
    await addFromDetail(page, '/nft/violet-nomad-314?edicao=1-10')

    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Violet Nomad #314' })).toBeVisible()
    // 1.19 + 1.39 = 2.58; taxa de rede 0.016.
    await expect(page.getByText('2.58 ETH')).toBeVisible()
    await expect(page.getByText('2.596 ETH')).toBeVisible()

    await page.reload()
    await expect(page.getByText('2.596 ETH')).toBeVisible()
  })

  test('altera quantidades respeitando o estoque e remove itens', async ({ page }) => {
    // A edição 1/10 do Violet Nomad tem 2 unidades.
    await addFromDetail(page, '/nft/violet-nomad-314?edicao=1-10')
    const quantity = quantityOf(page, 'Violet Nomad #314')

    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(quantity.locator('output')).toHaveText('2')
    await expect(page.getByText('2.78 ETH').first()).toBeVisible()
    await expect(quantity.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()

    await quantity.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(quantity.locator('output')).toHaveText('1')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 (edição 1/10)' }).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('cupom inválido, expirado, válido e remoção', async ({ page }) => {
    await addFromDetail(page, '/nft/emerald-ape-042')
    const coupon = page.getByPlaceholder('Digite o código promocional...')

    await coupon.fill('XPTO')
    await coupon.press('Enter')
    await expect(page.getByRole('alert')).toHaveText('Código promocional inválido.')
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')

    await coupon.fill('verao24')
    await coupon.press('Enter')
    await expect(page.getByRole('alert')).toHaveText('Este código promocional expirou.')

    await coupon.fill('kurio10')
    await coupon.press('Enter')
    // 10% de 1.19 = 0.119 → total 1.19 - 0.119 + 0.016 = 1.087.
    await expect(page.getByText('(-) 0.119 ETH')).toBeVisible()
    await expect(page.getByText('1.087 ETH')).toBeVisible()

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByText('(-) 00.00')).toBeVisible()
  })

  test('falha ao alterar quantidade desfaz a mudança otimista', async ({ page }) => {
    await addFromDetail(page, '/nft/emerald-ape-042')
    const quantity = quantityOf(page, 'Emerald Ape #042')
    await expect(quantity.locator('output')).toHaveText('1')

    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'erro-servidor'))
    await quantity.getByRole('button', { name: 'Aumentar quantidade' }).click()
    // A tela muda na hora e volta quando a API recusa.
    await expect(quantity.locator('output')).toHaveText('2')
    await expect(page.getByText('O servidor encontrou um erro. Tente novamente.')).toBeVisible()
    await expect(quantity.locator('output')).toHaveText('1')
  })
})
