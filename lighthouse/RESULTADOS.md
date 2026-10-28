# Resultados do Lighthouse

Mediana de 3 execuções por página e perfil, build de produção servido por `vite preview`, cenário padrão dos mocks.
Gerado por `npm run lighthouse` (relatórios HTML/JSON em `lighthouse/reports/<perfil>/`).

| Perfil | Página | Execuções | Performance (meta 90) | Accessibility (meta 95) | Best Practices (meta 95) | SEO (meta 90) | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | `/` | 3 | 79 ⚠ | 100 | 100 | 100 | 4.23 s | 0.000 | 29 ms |
| mobile | `/nft/emerald-ape-042` | 3 | 80 ⚠ | 100 | 100 | 100 | 4.15 s | 0.000 | 17 ms |
| desktop | `/` | 3 | 99 | 100 | 100 | 100 | 0.85 s | 0.000 | 0 ms |
| desktop | `/nft/emerald-ape-042` | 3 | 99 | 100 | 100 | 100 | 0.90 s | 0.000 | 0 ms |

⚠ = abaixo da meta (justificativa em ARCHITECTURE.md, seção "Performance").

## Ambiente

- Lighthouse 12.6.1 via @lhci/cli; Chrome/156.0.8078.4 (chrome-headless-shell do Playwright)
- Node v22.12.0; Windows_NT 10.0.26100 (x64); AMD Ryzen 7 5700X 8-Core Processor              × 16
- Mobile: perfil padrão do Lighthouse (Moto G Power emulado, 4G lento simulado, CPU 4× mais lenta)
- Desktop: preset `desktop` do Lighthouse (rede e CPU sem limitação forte)
- Gerado em 2026-10-28T23:27:59.987Z
