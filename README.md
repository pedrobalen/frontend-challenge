# Kurio, marketplace de NFTs

Marketplace de NFTs em React e TypeScript, com descoberta, compra e conta do colecionador, em desktop e mobile, fiel ao [layout do Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). Todos os dados são simulados na camada de rede (MSW), inclusive o tempo real via Socket.IO. Não há blockchain, extensão de carteira nem gateway de pagamento.

- Enunciado original: [docs/desafio.md](docs/desafio.md)
- Decisões técnicas, contratos e limitações: [ARCHITECTURE.md](ARCHITECTURE.md)
- Resultados do Lighthouse: [lighthouse/RESULTADOS.md](lighthouse/RESULTADOS.md)

## Acesso rápido

- Aplicação publicada: _a preencher após a publicação._
- Entre com `ana@kurio.app` e a senha `Kurio2026!` (conta com carteiras e favoritos). Para testar a troca de usuário, use `bruno@kurio.app` com a mesma senha.
- Os dados ficam no navegador de cada visitante. `?mock-reset` em qualquer URL restaura o estado inicial, e `?cenario=<id>` ativa os [cenários de falha](#cenários-e-reset-dos-mocks).

## Stack

| Responsabilidade | Tecnologia | Onde participa |
| --- | --- | --- |
| Interface | React 19 | Toda a UI (`src/features`, `src/components`) |
| Linguagem | TypeScript 6 (strict) | Contratos tipados de ponta a ponta (`src/api/contracts`) |
| Roteamento | TanStack Router | Rotas por arquivo, search params do catálogo, guarda das rotas privadas (`src/routes`) |
| Estado remoto | TanStack Query | Consultas, mutations otimistas, cache por usuário, reconciliação com eventos |
| Cliente HTTP | Axios | Todo REST passa por `src/api/http.ts` (erros normalizados em `ApiError`) |
| Tempo real | Socket.IO (`socket.io-client`) | `nft.updated` e `order.updated` (`src/features/realtime`) |
| Estilo | Tailwind CSS 4 | Tokens do Figma em `src/index.css` |
| Componentes | shadcn/ui (Radix) | Diálogos, drawers, menus, abas e slider adaptados ao tema (`src/components/ui`) |
| Mocks | MSW 2 + `@mswjs/socket.io-binding` | API REST e servidor Socket.IO simulados (`src/mocks`) |
| E2E e regressão visual | Playwright | `e2e/`, Chromium em 1440 px e 390 px |
| Auditoria | Lighthouse (LHCI) | `lighthouse/`, mobile e desktop, 3 execuções |

Build com Vite 8.

## Requisitos

- Node.js 22.12 ou mais recente e npm
- Chromium do Playwright (testes e Lighthouse): `npx playwright install chromium`

## Como rodar

```bash
npm install
npx playwright install chromium
npm run dev
```

Abra http://localhost:5173. Os mocks sobem junto com a aplicação, em desenvolvimento e no build de produção.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks (MSW e Socket.IO simulados) |
| `npm run build` | Checagem de tipos e build de produção em `dist/` (mocks incluídos) |
| `npm run preview` | Serve o build de produção |
| `npm run typecheck` | Checagem de tipos (`tsc -b`) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright contra o build de produção (projetos `desktop` e `mobile`) |
| `npm run test:e2e:report` | Abre o relatório HTML do último teste |
| `npm run lighthouse` | Build, 3 execuções por página em mobile e desktop, relatórios e `lighthouse/RESULTADOS.md` |

## Variáveis de ambiente

Nenhuma é obrigatória. Veja [.env.example](.env.example).

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST. Os handlers MSW respondem em `/api`. |
| `VITE_API_MOCKING` | `enabled` | `disabled` desliga o MSW. Sem backend real, a aplicação fica sem dados. |
| `CHROME_PATH` | Chromium do Playwright | Navegador usado pelo Lighthouse (ver [Lighthouse](#lighthouse)). |

## Credenciais fictícias

As duas contas usam a senha `Kurio2026!`. As senhas são guardadas só como hash PBKDF2, nunca em texto claro.

| Conta | E-mail | Situação inicial |
| --- | --- | --- |
| Ana Ribeiro | `ana@kurio.app` | Carteiras principal e reserva, 2 favoritos |
| Bruno Tavares | `bruno@kurio.app` | Sem carteiras e sem favoritos |

Também é possível criar contas novas pelo cadastro.

## Cenários e reset dos mocks

Selecione um cenário com `?cenario=<id>` em qualquer URL. Ele fica salvo no `localStorage` até ser trocado; `?cenario=padrao` volta ao normal. `?mock-reset` restaura todas as fixtures (catálogo, carrinhos, contas, carteiras, favoritos e pedidos).

| Cenário | Efeito |
| --- | --- |
| `padrao` | Latência curta (180 ms) e respostas de sucesso |
| `lento` | Toda resposta demora 2,5 s (skeletons) |
| `fora-de-ordem` | Requisições ímpares demoram 1,6 s e as pares 200 ms (respostas fora de ordem) |
| `vazio` | Catálogo sem resultados |
| `erro-servidor` | Toda requisição responde 500 depois de 600 ms |
| `offline` | Falha de conexão em toda requisição |
| `sessao-expirada` | A próxima requisição autenticada encontra a sessão expirada |
| `conflito-cadastro` | O cadastro responde que o e-mail já está em uso |
| `carteira-recusada` | A carteira recusa a conexão no pagamento |
| `carteira-desconectada` | A carteira desconecta antes do envio do pedido |
| `preco-alterado` | O preço do primeiro item sobe 0.10 ETH no envio do pedido |
| `edicao-esgotada` | A edição do primeiro item esgota no envio do pedido |
| `timeout-pedido` | O pedido é criado, mas a primeira resposta passa do limite do cliente (6 s) |
| `pagamento-recusado` | O pagamento é recusado ao fim do processamento |
| `favoritos-falha` | Favoritar ou desfavoritar responde 500 |

Gatilhos do servidor simulado, para demonstração e testes. Eles mudam o estado dos mocks, e a interface só fica sabendo pelo Socket.IO ou pelo REST:

```bash
# no console do navegador, com a aplicação aberta
fetch('/api/__mock/nfts/emerald-ape-042', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ price: '1.49' }) })
fetch('/api/__mock/nfts/emerald-ape-042', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ editionId: '1-50', available: 0 }) })
fetch('/api/__mock/realtime/replay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'duplicate' }) }) // ou 'stale'
fetch('/api/__mock/realtime/disconnect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outageMs: 4000 }) })
```

Cupons: `KURIO10` (10%) e `GENESIS` (0.05 ETH) são válidos, `VERAO24` está expirado e qualquer outro código é inválido.

## Como reproduzir os fluxos de falha

| Fluxo | Passos |
| --- | --- |
| Carregamento lento e skeletons | Abra `/?cenario=lento` |
| Respostas fora de ordem | `/?cenario=fora-de-ordem` e troque de coleção rápido: fica o resultado do último filtro |
| Erro e nova tentativa | `/?cenario=erro-servidor`, depois `?cenario=padrao` e "Tentar novamente" |
| Sessão expirada | Entre, abra um NFT, rode `localStorage.setItem('kurio:mock-scenario','sessao-expirada')` no console e clique em Comprar: o login abre por cima da tela atual. Abrir uma URL com `?cenario=sessao-expirada` recarrega a página e a sessão já expira na carga (vira visitante com aviso). |
| Conflito de cadastro | Cadastre com `ana@kurio.app` (ou `?cenario=conflito-cadastro`) |
| Cupom inválido ou expirado | No carrinho, aplique `XPTO` ou `VERAO24` |
| Preço ou estoque alterado no carrinho | Com o carrinho aberto, use o gatilho `/api/__mock/nfts/...` acima |
| Preço alterado no checkout | Na revisão do pedido, use o gatilho de preço (ou `?cenario=preco-alterado` e confirme) |
| Carteira recusada | `?cenario=carteira-recusada` e "Confirmar compra" |
| Clique repetido | Dê duplo clique em "Confirmar e pagar": um único pedido é criado |
| Timeout com recuperação | `?cenario=timeout-pedido`: a interface tenta de novo com a mesma chave e recupera o mesmo pedido |
| Pagamento recusado | `?cenario=pagamento-recusado`: o pedido termina recusado e o carrinho fica intacto |
| Queda do tempo real | Com um pedido pendente, use o gatilho `realtime/disconnect`: ao reconectar, o REST traz o resultado |
| Falha ao favoritar | `?cenario=favoritos-falha` e clique em um coração: a mudança é desfeita |

## Testes

```bash
npm run test:e2e                                   # tudo, desktop (1440 px) e mobile (390 px)
npx playwright test e2e/checkout.spec.ts --project=desktop
npm run test:e2e:report                            # relatório HTML; traces das falhas ficam anexados
```

Cada teste parte de um contexto novo do navegador (cookies e `localStorage` vazios, ou seja, fixtures padrão). Os testes de REST passam pelos handlers MSW e os de tempo real pelo `socket.io-client`.

| Fluxo do enunciado | Arquivo |
| --- | --- |
| 1. Busca, filtros, ordenação, paginação e histórico | `catalog.spec.ts` |
| 2. Acesso direto ao detalhe e NFT inexistente | `nft-detail.spec.ts` |
| 3. Cadastro, login, expiração, logout e troca de usuário | `auth.spec.ts` |
| 4. Favoritos com falha de mutation e recuperação | `favorites.spec.ts` |
| 5. Carrinho, quantidades, remoção, cupom, refresh e login | `cart.spec.ts`, `auth.spec.ts` |
| 6. Compra completa até o recibo | `checkout.spec.ts` |
| 7. Pagamento recusado, clique repetido e timeout | `checkout.spec.ts` |
| 8. Perfil, avatar, senha e carteiras | `profile.spec.ts` |
| 9. Preço e disponibilidade via Socket.IO durante o checkout | `realtime.spec.ts` |
| 10. Eventos duplicados e antigos, desconexão e pedido pendente | `realtime.spec.ts`, `checkout.spec.ts` |
| 11. Teclado, foco em diálogos e validação | `accessibility.spec.ts`, `auth.spec.ts`, `profile.spec.ts` |
| 12. Skeletons, falha e nova tentativa | `accessibility.spec.ts`, `catalog.spec.ts` |
| Regressão visual (início, detalhe, carrinho, pagamento) | `visual.spec.ts` |

As baselines visuais ficam em `e2e/visual.spec.ts-snapshots/`, com sufixo de plataforma (`-win32`), porque a renderização de fontes muda entre sistemas. Em outro sistema operacional, gere as baselines dele com `npx playwright test e2e/visual.spec.ts --update-snapshots` e versione os arquivos novos.

## Lighthouse

`npm run lighthouse` faz o build, serve com `vite preview`, roda 3 medições de `/` e `/nft/emerald-ape-042` nos perfis mobile e desktop, guarda os relatórios HTML/JSON em `lighthouse/reports/<perfil>/` e escreve as medianas em [lighthouse/RESULTADOS.md](lighthouse/RESULTADOS.md). A configuração fica em `lighthouserc.mobile.cjs`, `lighthouserc.desktop.cjs` e `lighthouse/base.cjs`.

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | `/` | 79 | 100 | 100 | 100 | 4,23 s | 0 | 29 ms |
| Mobile | `/nft/emerald-ape-042` | 80 | 100 | 100 | 100 | 4,15 s | 0 | 17 ms |
| Desktop | `/` | 99 | 100 | 100 | 100 | 0,85 s | 0 | 0 ms |
| Desktop | `/nft/emerald-ape-042` | 99 | 100 | 100 | 100 | 0,90 s | 0 | 0 ms |

A performance mobile fica abaixo da meta de 90. A causa e o que foi feito estão em [ARCHITECTURE.md, seção Performance](ARCHITECTURE.md#performance).

O Lighthouse usa `CHROME_PATH`, se definido, ou o `chrome-headless-shell` instalado pelo Playwright. Em algumas máquinas Windows o `chrome.exe` completo do Playwright não inicia (`spawn UNKNOWN`), e o headless shell resolve.

## Deploy

O projeto está pronto para o Vercel: build `npm run build`, saída `dist/`. O [vercel.json](vercel.json) reescreve para `index.html` toda rota sem extensão, então acesso direto e refresh de qualquer tela funcionam. Os mocks e o tempo real rodam no navegador, no próprio build publicado.

URL pública: _a preencher após a publicação._

## Estrutura

```
assets/nfts/      artes originais exportadas do Figma (PNG 1254 px)
public/nfts/      as mesmas artes em WebP de 480, 640 e 960 px, servidas pela aplicação
src/
  api/            contratos REST e de eventos (tipos) e cliente Axios
  app/            QueryClient, router e sinal de rede pronta
  components/     layout (header, footer, tab bar), formulários e shadcn/ui
  features/       uma pasta por domínio: catalog, nft-detail, cart, auth, checkout,
                  favorites, profile, realtime, home
  lib/            ETH em string decimal (BigInt), validações e search params
  mocks/          fixtures, estado persistido, cenários, handlers REST e Socket.IO
  routes/         rotas por arquivo do TanStack Router (_privado = rotas protegidas)
e2e/              testes Playwright e baselines visuais
lighthouse/       configuração compartilhada, relatórios e resumo
docs/             enunciado original
```

## Limitações conhecidas

- O estado dos mocks vive no `localStorage` de cada navegador. Cada aba carrega esse estado ao abrir e tem o próprio "servidor" de eventos: mudanças feitas em uma aba aparecem na outra só depois de recarregar (detalhes em [ARCHITECTURE.md](ARCHITECTURE.md#transporte-dos-mocks-e-limitações)).
