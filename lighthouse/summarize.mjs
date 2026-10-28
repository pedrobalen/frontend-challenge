// Lê os relatórios JSON do LHCI e escreve lighthouse/RESULTADOS.md com a mediana
// de 3 execuções por página e perfil (categorias, LCP, CLS e TBT).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

const ROOT = 'lighthouse/reports'
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = [
  ['performance', 'Performance', 0.9],
  ['accessibility', 'Accessibility', 0.95],
  ['best-practices', 'Best Practices', 0.95],
  ['seo', 'SEO', 0.9],
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

let lighthouseVersion = ''
let chromeVersion = ''
const rows = []
for (const profile of PROFILES) {
  const dir = join(ROOT, profile)
  if (!existsSync(dir)) continue
  const reports = readdirSync(dir)
    .filter((file) => file.endsWith('.report.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')))
  const byUrl = Map.groupBy(reports, (report) => new URL(report.finalDisplayedUrl ?? report.finalUrl).pathname)
  for (const [path, runs] of byUrl) {
    lighthouseVersion = runs[0].lighthouseVersion
    chromeVersion = runs[0].environment?.hostUserAgent?.match(/Chrome\/[\d.]+/)?.[0] ?? chromeVersion
    rows.push({
      profile,
      path,
      runs: runs.length,
      scores: CATEGORIES.map(([id]) => median(runs.map((run) => run.categories[id].score))),
      lcp: median(runs.map((run) => run.audits['largest-contentful-paint'].numericValue)),
      cls: median(runs.map((run) => run.audits['cumulative-layout-shift'].numericValue)),
      tbt: median(runs.map((run) => run.audits['total-blocking-time'].numericValue)),
    })
  }
}

const header = `| Perfil | Página | Execuções | ${CATEGORIES.map(([, label, goal]) => `${label} (meta ${goal * 100})`).join(' | ')} | LCP | CLS | TBT |`
const divider = `|${' --- |'.repeat(6 + CATEGORIES.length)}`
const lines = rows.map(
  (row) =>
    `| ${row.profile} | \`${row.path}\` | ${row.runs} | ${row.scores.map((score, i) => `${Math.round(score * 100)}${score < CATEGORIES[i][2] ? ' ⚠' : ''}`).join(' | ')} | ${(row.lcp / 1000).toFixed(2)} s | ${row.cls.toFixed(3)} | ${Math.round(row.tbt)} ms |`,
)

const markdown = `# Resultados do Lighthouse

Mediana de ${rows[0]?.runs ?? 3} execuções por página e perfil, build de produção servido por \`vite preview\`, cenário padrão dos mocks.
Gerado por \`npm run lighthouse\` (relatórios HTML/JSON em \`lighthouse/reports/<perfil>/\`).

${header}
${divider}
${lines.join('\n')}

⚠ = abaixo da meta (justificativa em ARCHITECTURE.md, seção "Performance").

## Ambiente

- Lighthouse ${lighthouseVersion} via @lhci/cli; ${chromeVersion} (chrome-headless-shell do Playwright)
- Node ${process.version}; ${os.type()} ${os.release()} (${os.arch()}); ${os.cpus()[0]?.model ?? 'CPU'} × ${os.cpus().length}
- Mobile: perfil padrão do Lighthouse (Moto G Power emulado, 4G lento simulado, CPU 4× mais lenta)
- Desktop: preset \`desktop\` do Lighthouse (rede e CPU sem limitação forte)
- Gerado em ${new Date().toISOString()}
`
writeFileSync('lighthouse/RESULTADOS.md', markdown)
console.log(markdown)
