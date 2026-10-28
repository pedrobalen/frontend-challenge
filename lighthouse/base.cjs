const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('@playwright/test')

const PORT = 4174

/**
 * Navegador da auditoria: CHROME_PATH, se definido; senão o chrome-headless-shell
 * instalado por `npx playwright install chromium` (em algumas máquinas Windows o
 * chrome.exe completo do Playwright é bloqueado pelo sistema, o headless shell não).
 */
function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const cacheDir = path.resolve(path.dirname(chromium.executablePath()), '..', '..')
  const shellDir = fs.readdirSync(cacheDir).find((name) => name.startsWith('chromium_headless_shell-'))
  if (!shellDir) return chromium.executablePath()
  const platformDir = fs.readdirSync(path.join(cacheDir, shellDir)).find((name) => name.startsWith('chrome-headless-shell'))
  const binary = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'
  return path.join(cacheDir, shellDir, platformDir, binary)
}
const BASE = `http://localhost:${PORT}`

/** Configuração compartilhada do Lighthouse CI; cada perfil gera 3 medições por página. */
module.exports = ({ preset, outputDir }) => ({
  ci: {
    collect: {
      startServerCommand: `npm run preview -- --port ${PORT} --strictPort`,
      startServerReadyPattern: 'Local',
      // Início e detalhe do NFT, como pede o enunciado.
      url: [`${BASE}/`, `${BASE}/nft/emerald-ape-042`],
      numberOfRuns: 3,
      chromePath: resolveChromePath(),
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        // Cada execução parte de um estado limpo (sem cache nem storage).
        disableStorageReset: false,
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir,
    },
  },
})
