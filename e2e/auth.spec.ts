import { expect, test, type Page } from '@playwright/test'

// Credenciais fictícias das fixtures (src/mocks/fixtures/users.ts).
const ANA = { email: 'ana@kurio.app', password: 'Kurio2026!', name: 'Ana Ribeiro' }
const BRUNO = { email: 'bruno@kurio.app', password: 'Kurio2026!', name: 'Bruno Tavares' }

const dialog = (page: Page) => page.getByRole('dialog')

async function clickLogin(page: Page) {
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog(page)).toBeVisible()
}

/** O diálogo de conta abre em qualquer página pela URL (as telas imersivas do mobile não têm header). */
async function openLogin(page: Page) {
  const url = new URL(page.url())
  url.searchParams.set('auth', 'entrar')
  await page.goto(url.toString())
  await expect(dialog(page)).toBeVisible()
}

async function fillLogin(page: Page, user: { email: string; password: string }) {
  await dialog(page).getByLabel('E-mail').fill(user.email)
  await dialog(page).getByLabel('Senha', { exact: true }).fill(user.password)
  await dialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** No mobile o menu da conta fica na tab bar da tela inicial. */
async function logout(page: Page, name: string) {
  const account = page.getByRole('button', { name: `Conta de ${name}` })
  const returnTo = page.url()
  if (!(await account.isVisible())) await page.goto('/')
  await account.click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  // O botão Entrar só volta quando a API confirmou o logout e a sessão virou visitante.
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
  if (page.url() !== returnTo) await page.goto(returnTo)
}

async function expectLoggedIn(page: Page, name: string) {
  // A sessão aparece no header (desktop) ou na tab bar da tela inicial (mobile).
  await expect
    .poll(async () => page.evaluate(() => fetch('/api/session').then((response) => response.json())))
    .toMatchObject({ user: { displayName: name } })
}

test.describe('conta e sessão', () => {
  test('valida o login, entra, mantém a sessão após refresh e sai', async ({ page }) => {
    await page.goto('/')
    await clickLogin(page)

    // Envio vazio: erros nos campos e foco no primeiro inválido.
    await dialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = dialog(page).getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()
    await expect(dialog(page).getByText('Informe seu e-mail.')).toBeVisible()

    await fillLogin(page, { email: ANA.email, password: 'senha-errada1' })
    await expect(dialog(page).getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await dialog(page).getByLabel('Senha', { exact: true }).fill(ANA.password)
    await dialog(page).getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: `Conta de ${ANA.name}` })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: `Conta de ${ANA.name}` })).toBeVisible()

    await logout(page, ANA.name)
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
  })

  test('cadastro valida campos, trata conflito e cria a conta', async ({ page }) => {
    await page.goto('/?auth=cadastro')
    const form = dialog(page)

    await form.getByLabel('Nome de usuário').fill('Nova Pessoa')
    await form.getByLabel('E-mail').fill(ANA.email)
    await form.getByLabel('Senha', { exact: true }).fill('curta')
    await form.getByLabel('Confirmar senha').fill('outra')
    await form.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(form.getByText(/Use de 3 a 20 caracteres/)).toBeVisible()
    await expect(form.getByText('A senha precisa de 8 caracteres ou mais, com letras e números.')).toBeVisible()
    await expect(form.getByText('As senhas não conferem.')).toBeVisible()

    await form.getByLabel('Nome de usuário').fill('nova.pessoa')
    await form.getByLabel('Senha', { exact: true }).fill('Segura2026')
    await form.getByLabel('Confirmar senha').fill('Segura2026')
    await form.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    // Conflito vem da API e aparece no campo de e-mail.
    await expect(form.getByText('Este e-mail já está cadastrado. Entre na sua conta.')).toBeVisible()
    await expect(form.getByLabel('E-mail')).toBeFocused()

    await form.getByLabel('E-mail').fill('nova@kurio.app')
    await form.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page.getByRole('button', { name: 'Conta de nova.pessoa' })).toBeVisible()
  })

  test('carrinho do visitante vai para a conta e não aparece para outro usuário', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
    await expect(page).toHaveURL(/\/carrinho$/)

    // Finalizar como visitante pede login e segue para o pagamento com os itens.
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await fillLogin(page, ANA)
    await expect(page).toHaveURL(/\/pagamento$/)
    await page.goto('/carrinho')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()

    await logout(page, ANA.name)
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()

    await openLogin(page)
    await fillLogin(page, BRUNO)
    await expectLoggedIn(page, BRUNO.name)
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()

    await logout(page, BRUNO.name)
    await openLogin(page)
    await fillLogin(page, ANA)
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('sessão expirada durante a navegação pede login e retoma a tela', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await openLogin(page)
    await fillLogin(page, ANA)
    await expect(dialog(page)).toHaveCount(0)
    await expectLoggedIn(page, ANA.name)

    // A sessão expira enquanto a página está aberta: a próxima ação autenticada recebe 401.
    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'sessao-expirada'))
    await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()

    await expect(dialog(page).getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)

    await page.evaluate(() => localStorage.setItem('kurio:mock-scenario', 'padrao'))
    await fillLogin(page, ANA)
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('aba aberta antes de um deploy novo recarrega e abre o login', async ({ page }) => {
    // O chunk do diálogo é do build antigo e responde 404 na primeira vez, como após um deploy.
    // O diálogo abre pela URL na carga: depois que o MSW ativa, os pedidos passam pelo service
    // worker dele, e o page.route não os enxerga.
    let requests = 0
    await page.route(/\/assets\/auth-dialog-[^/]+\.js$/, (route) =>
      requests++ === 0 ? route.fulfill({ status: 404, body: 'Not Found' }) : route.continue(),
    )
    await page.goto('/?auth=entrar')
    await expect(dialog(page)).toBeVisible()
    await expect(page.getByText('Something went wrong')).toHaveCount(0)
    expect(requests).toBe(2)
  })
})
