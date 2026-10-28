import { expect, test } from '@playwright/test'

test.describe('teclado, foco e carregamento', () => {
  test('link de pular conteúdo e diálogo de busca com foco preso e devolvido', async ({ page, isMobile }) => {
    test.skip(isMobile, 'A busca do header existe só no desktop; no mobile o campo fica na página.')
    await page.goto('/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()

    // Primeiro Tab: link "Pular para o conteúdo".
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    // Abre a busca pelo teclado: o foco entra no diálogo e não sai dele com Tab.
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog.getByLabel('Nome ou ID do token')).toBeFocused()
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }

    // Esc fecha e devolve o foco ao botão que abriu.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()

    // Buscar pelo teclado aplica o filtro na URL.
    await page.keyboard.press('Enter')
    await page.keyboard.type('Golden Beat')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=Golden(\+|%20)Beat/)
    await expect(page.locator('#catalogo article').first()).toContainText('Golden Beat')
  })

  test('login pelo teclado: foco no diálogo, erros ligados aos campos e Esc fecha', async ({ page }) => {
    await page.goto('/?auth=entrar')
    const dialog = page.getByRole('dialog')
    const email = dialog.getByLabel('E-mail')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    await email.focus()
    await page.keyboard.press('Enter')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()
    const describedBy = await email.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe seu e-mail.')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page).not.toHaveURL(/auth=/)
  })

  test('edições escolhidas com as setas do teclado', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    const selected = page.getByRole('radio', { name: 'Edição 1/50' })
    await expect(selected).toBeChecked()
    await selected.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Edição aberta' })).toBeChecked()
    await expect(page).toHaveURL(/edicao=aberta/)
  })

  test('skeletons no carregamento lento e conteúdo sem deslocar o layout', async ({ page }) => {
    await page.goto('/?cenario=lento')
    const catalog = page.locator('#catalogo')
    // Durante a espera: região ocupada e skeletons no lugar dos cards.
    await expect(catalog.getByRole('status').filter({ hasText: 'Carregando NFTs…' })).toBeAttached()
    await expect(catalog.locator('[aria-busy="true"] .shimmer').first()).toBeVisible()
    const skeletonBox = await catalog.locator('[aria-busy="true"] > div').first().boundingBox()

    await expect(catalog.locator('article').first()).toBeVisible({ timeout: 15_000 })
    const cardBox = await catalog.locator('li').filter({ has: page.locator('article') }).first().boundingBox()
    // O card ocupa o mesmo espaço do skeleton (sem CLS).
    expect(Math.abs((cardBox?.width ?? 0) - (skeletonBox?.width ?? 0))).toBeLessThan(2)
    expect(Math.abs((cardBox?.y ?? 0) - (skeletonBox?.y ?? 0))).toBeLessThan(2)
  })
})
