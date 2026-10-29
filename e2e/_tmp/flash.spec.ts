import { expect, test } from '@playwright/test'
test('primeiro login: procura flash de erro', async ({ page, isMobile }) => {
  const logs: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`) })
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message))
  await page.addInitScript(() => {
    const seen: string[] = []
    ;(window as unknown as { __flash: string[] }).__flash = seen
    new MutationObserver(() => {
      if (document.body?.innerText.includes('Something went wrong')) seen.push(location.href + ' @' + Math.round(performance.now()))
    }).observe(document, { childList: true, subtree: true, characterData: true })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-realtime', 'conectado')
  if (isMobile) await page.getByRole('link', { name: /perfil|conta|entrar/i }).last().click().catch(() => page.goto('/?auth=entrar'))
  else await page.getByRole('button', { name: 'Entrar' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('E-mail').fill('ana@kurio.app')
  await dialog.getByLabel('Senha', { exact: true }).fill('Kurio2026!')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.waitForTimeout(2000)
  const flash = await page.evaluate(() => (window as unknown as { __flash: string[] }).__flash)
  console.log('FLASH:', JSON.stringify(flash.slice(0, 3)), 'total', flash.length)
  console.log('LOGS:\n' + logs.join('\n'))
})
