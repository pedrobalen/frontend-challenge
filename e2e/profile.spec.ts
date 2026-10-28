import { expect, test, type Page } from '@playwright/test'

const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!' }
// PNG 1x1 válido para o envio de avatar.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

async function login(page: Page, path: string, user = ANA) {
  await page.goto(`${path}?auth=entrar`)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(user.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

const profileForm = (page: Page) => page.locator('form[aria-labelledby="perfil-titulo"]')

test.describe('perfil e carteiras', () => {
  test('visitante vai para o login e volta ao perfil', async ({ page }) => {
    await page.goto('/perfil')
    await expect(page).toHaveURL(/auth=entrar/)
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(ANA.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  })

  test('edita os dados, trata validação e conflito e mantém após refresh', async ({ page }) => {
    await login(page, '/perfil')
    const form = profileForm(page)
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana Ribeiro')

    await form.getByLabel('E-mail').fill('sem-arroba')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('E-mail')).toBeFocused()

    // Conflito vem da API: o nome de usuário já é do Bruno.
    await form.getByLabel('E-mail').fill('ana@kurio.app')
    await form.getByLabel('Nome de usuário').fill('bruno.colecionador')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await form.getByLabel('Nome de usuário').fill('ana.ribeiro')
    await form.getByLabel('Nome de exibição').fill('Ana Clara Ribeiro')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil salvo.')).toBeVisible()

    await page.reload()
    await expect(profileForm(page).getByLabel('Nome de exibição')).toHaveValue('Ana Clara Ribeiro')
    await expect(profileForm(page).getByLabel('Nome de usuário')).toHaveValue('ana.ribeiro')
  })

  test('altera a senha e entra com a nova', async ({ page }) => {
    await login(page, '/perfil')
    const form = profileForm(page)

    await form.getByLabel('Senha atual').fill('errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
    await form.getByLabel('Confirmar nova senha').fill('NovaSenha2026')
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(form.getByText('A senha atual está incorreta.')).toBeVisible()

    await form.getByLabel('Senha atual').fill(ANA.password)
    await form.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Senha alterada.')).toBeVisible()
    await expect(form.getByLabel('Senha atual')).toHaveValue('')

    // A senha nova vale no próximo login; a antiga não.
    await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/$/)
    await login(page, '/', { email: ANA.email, password: 'NovaSenha2026' })
    const session = await page.evaluate(() => fetch('/api/session').then((response) => response.json()))
    expect(session.user.email).toBe(ANA.email)
  })

  test('envia, valida e remove o avatar', async ({ page }) => {
    await login(page, '/perfil')
    const fileInput = page.locator('input[type="file"]')

    await fileInput.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
    await expect(page.getByText('Use uma imagem PNG, JPEG ou WebP.')).toBeVisible()

    await fileInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Avatar atualizado.')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Avatar removido.')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)
  })

  test('carteiras: valida, recusa endereço repetido e salva a secundária', async ({ page }) => {
    await login(page, '/perfil/carteiras')
    const principal = page.getByRole('form', { name: 'Carteira principal' })
    await expect(principal.getByLabel('Apelido da carteira')).toHaveValue('Principal')

    await principal.getByLabel('Endereço da carteira').fill('0x123')
    await principal.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(principal.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()
    await principal.getByLabel('Endereço da carteira').fill('0xA91F3c2B7d4E8f6a1C0b9D2e5F7a3B8c4D6eE82C')

    // Remove a reserva da Ana e cadastra outra, primeiro com o endereço da principal.
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByLabel('Rede').selectOption('ethereum')
    await secondary.getByLabel('Tipo de carteira').selectOption('walletconnect')
    await secondary.getByLabel('Endereço da carteira').fill('0xA91F3c2B7d4E8f6a1C0b9D2e5F7a3B8c4D6eE82C')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText('Este endereço já está na sua outra carteira.')).toBeVisible()

    await secondary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Endereço da carteira')).toHaveValue(
      '0x1111111111111111111111111111111111111111',
    )
  })
})
