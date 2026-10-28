# Arquitetura

Este documento descreve como a solução está organizada, os contratos entre as camadas e as decisões que não são óbvias pelo código. Setup, comandos e cenários estão no [README](README.md).

## Visão geral

```
Componentes (src/features, src/components)
   │  useQuery / useMutation (TanStack Query)        ◄── eventos aplicados no cache
   ▼                                                      │
Funções de API (src/api/*.ts) ── Axios (src/api/http.ts)  │  socket.io-client (src/features/realtime)
   │  REST /api/*                                          │  WebSocket /tempo-real/
   ▼                                                       │
MSW (service worker + interceptação de WebSocket no navegador)
   │
Handlers (src/mocks/handlers) ── estado único (src/mocks/db.ts, localStorage) ── barramento de eventos (src/mocks/realtime.ts)
```

- **Dados fictícios só na camada de rede.** Componentes, hooks e o cliente Axios não conhecem fixtures nem cenários. Tudo o que é simulado fica em `src/mocks` e é carregado como um chunk próprio (`import('./mocks/browser')`).
- **Contratos tipados.** `src/api/contracts/*.ts` define os tipos usados pelo cliente e pelos handlers MSW, então uma mudança de contrato quebra a compilação dos dois lados.
- **ETH como string decimal.** Preços, subtotais, descontos, taxas e totais trafegam como `"1.19"`. As contas usam `src/lib/eth.ts` (BigInt em wei, 18 casas), tanto no cliente quanto nos handlers. Quantidades são inteiras. Não há `number` em valores monetários.
- **Inicialização.** A interface aparece antes do MSW terminar de iniciar (cabeçalho, textos e skeletons). A primeira requisição REST e a conexão Socket.IO esperam o sinal `networkReady` (`src/app/network-ready.ts`). Esse sinal é só de sequência de inicialização e não muda nenhuma resposta. Sem mocks, ele é dado imediatamente.

## Rotas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/` | Início e catálogo (`?q&colecao&rede&precoMin&precoMax&aba&ordem&pagina`) | Público |
| `/nft/$nftId` | Detalhe (`?edicao=`) | Público |
| `/carrinho` | Carrinho | Público (visitante tem carrinho) |
| `/pagamento` | Pagamento | Privada |
| `/pedidos/$orderId` | Pedido pendente, recusado ou confirmado (recibo) | Privada |
| `/perfil` | Dados do perfil, avatar e senha | Privada |
| `/perfil/carteiras` | Carteiras principal e secundária | Privada |
| `/perfil/favoritos` | Lista de interesse | Privada |

- **Rotas privadas:** ficam sob `src/routes/_privado/`. O `beforeLoad` garante a sessão (`ensureQueryData`) e, para visitante, redireciona para `/?auth=entrar&redirect=<rota>`. Depois do login, o diálogo volta para `redirect`.
- **Login e cadastro:** são um diálogo controlado pela URL de qualquer página (`?auth=entrar|cadastro`, `&motivo=sessao-expirada`), validado no root. Isso mantém a tela de baixo montada (contexto preservado), sobrevive a refresh e reproduz o Figma, que mostra o login sobre a página. `redirect` só aceita caminhos internos.
- **Busca, filtros, ordenação e página:** são search params validados por `validateCatalogSearch`. Valor inválido cai no padrão e os padrões não aparecem na URL (`stripSearchParams`). Mudar qualquer filtro volta para a página 1, e o histórico do navegador restaura o estado.
- **Rota inexistente:** tem tela própria ("Página não encontrada").

## Contratos REST

Base `/api`. Erros seguem sempre o formato:

```json
{ "error": { "code": "string", "message": "texto para o usuário", "fields": { "campo": "mensagem" }, "details": {} } }
```

O interceptor do Axios converte qualquer falha em `ApiError` (`kind`: `network`, `timeout`, `http` ou `canceled`; `status`, `code`, `fields` e `details`).

### Sessão e conta

| Método e caminho | Entrada | Resposta | Erros |
| --- | --- | --- | --- |
| `GET /session` | cookie `kurio_session` | `Session` (`user: null` para visitante) | 401 `sessao_expirada` |
| `POST /session` | `{ email, password }` | `Session` + `Set-Cookie` | 422 `validation_error`, 401 `credenciais_invalidas` |
| `DELETE /session` | (cookie) | 204 + cookie limpo | (nenhum) |
| `POST /users` | `{ username, email, password }` | 201 `Session` | 422 `validation_error`, 409 `conflito_cadastro` (`fields.email`/`fields.username`) |
| `GET /profile` | (sessão) | `Profile` | 401 |
| `PATCH /profile` | `ProfileUpdate` | `Profile` | 422, 409 `conflito_perfil` |
| `PUT /profile/avatar` | `{ dataUrl }` (PNG, JPEG ou WebP) | `Profile` | 422 (`fields.avatar`) |
| `DELETE /profile/avatar` | (sessão) | `Profile` | 401 |
| `POST /profile/password` | `{ currentPassword, newPassword }` | 204 | 422 `senha_atual_incorreta`, 422 `validation_error` |
| `GET /wallets` | (sessão) | `Wallet[]` | 401 |
| `PUT /wallets/:role` | `WalletInput` (`role`: `principal` ou `secundaria`) | `Wallet` (201 na criação) | 422, 409 `carteira_duplicada` |
| `DELETE /wallets/secundaria` | (sessão) | 204 | 422 `principal_obrigatoria` (para a principal) |

### Catálogo

| Método e caminho | Entrada | Resposta |
| --- | --- | --- |
| `GET /nfts` | `q, category, network, minPrice, maxPrice, tab, sort, page, pageSize` | `Paginated<NftSummary>` (400 para parâmetro inválido) |
| `GET /nfts/facets` | (nenhuma) | contagens por coleção e rede, faixa de preço e NFT em destaque |
| `GET /nfts/:id` | (nenhuma) | `NftDetail` (edições com estoque, máximo por pedido, avaliações agregadas) ou 404 `not_found` |
| `GET /nfts/:id/reviews` | `page` | `Paginated<NftReview>` |
| `GET /nfts/:id/related` | (nenhuma) | `{ items: NftSummary[] }` (mesma coleção) |

Todo NFT tem `version`, que sobe a cada mudança de preço ou estoque. É a referência para os eventos.

### Carrinho

O carrinho de visitante é identificado pelo cookie `kurio_cart`, que a API define na primeira inclusão. Com sessão, vale o carrinho do usuário.

| Método e caminho | Entrada | Resposta | Erros |
| --- | --- | --- | --- |
| `GET /cart` | (nenhuma) | `Cart` (itens, cupom, cotação, `version`) | 401 `sessao_expirada` |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | `Cart` | 404, 409 `esgotado`/`estoque_insuficiente`/`limite_por_pedido` |
| `PATCH /cart/items/:id` | `{ quantity? , acknowledgePrice? }` | `Cart` | 409 de estoque (só para aumentar) |
| `DELETE /cart/items/:id` | (nenhuma) | `Cart` | 404 |
| `PUT /cart/coupon` | `{ code }` | `Cart` | 422 `cupom_invalido`/`cupom_expirado`/`carrinho_vazio` |
| `DELETE /cart/coupon` | (nenhuma) | `Cart` | (nenhum) |

Cada item traz `unitPrice` (preço atual), `acknowledgedPrice` (último preço visto pelo colecionador), `available`, `maxQuantity` e `issue` (`esgotado` ou `estoque-insuficiente`). A cotação (`subtotal`, `discount`, `networkFee`, `total`) é sempre calculada pela API.

### Favoritos

| Método e caminho | Resposta |
| --- | --- |
| `GET /favorites` | `{ items: NftSummary[] }` (mais recente primeiro) |
| `PUT /favorites/:nftId` | lista atualizada (idempotente) |
| `DELETE /favorites/:nftId` | lista atualizada |

### Checkout e pedidos

| Método e caminho | Entrada | Resposta | Erros |
| --- | --- | --- | --- |
| `POST /checkout/quote` | `{ network }` | `CheckoutQuote` (`quoteId`, linhas, totais e taxa da rede) | 422 `carrinho_vazio` |
| `POST /wallet-connections` | `{ provider, network, address }` | `WalletConnection` | 409 `conexao_recusada`, 422 |
| `DELETE /wallet-connections/:id` | (nenhuma) | 204 | (nenhum) |
| `POST /orders` | `CreateOrderInput` + cabeçalho `Idempotency-Key` | 201 `Order` (`pendente`) ou 200 com o mesmo pedido | 400 sem chave, 409 `idempotencia_conflito`, `carteira_desconectada`, `cotacao_desatualizada`, `indisponivel` (os dois últimos com `details.quote`), 422 |
| `GET /orders?status=` | (nenhuma) | `Order[]` do usuário | 401 |
| `GET /orders/:id` | (nenhuma) | `Order` | 404, 403 `sem_permissao` |

- **`quoteId`:** é um hash de rede, linhas, quantidades, preços, disponibilidade, cupom, desconto e taxa. Qualquer mudança gera outro id.
- **Taxa de rede:** Ethereum 0.016, Polygon 0.002 e Solana 0.0005 ETH.
- **`Order`:** é o recibo, uma cópia das linhas e dos totais no momento do pedido, que não muda depois.

### Gatilhos do ambiente simulado

`POST /__mock/nfts/:id` (`price`; `editionId` + `available`), `POST /__mock/realtime/replay` (`duplicate` | `stale`) e `POST /__mock/realtime/disconnect` (`outageMs`). Eles mudam o estado do servidor simulado e publicam os eventos normalmente. São usados nos testes e na demonstração.

## Eventos Socket.IO

O cliente conecta em `path: '/tempo-real/'`, `transports: ['websocket']`. Todo evento tem o mesmo envelope:

```ts
{
  id: string                     // estável e único: descarte de duplicatas
  type: 'nft.updated' | 'order.updated'
  resource: { type: 'nft' | 'order'; id: string }
  version: number                // versão do recurso: descarte de eventos antigos
  occurredAt: string
  data: NftUpdatedData | Order
}
```

| Evento | Público | `data` | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | todos os clientes | `name, price, previousPrice, inStock, editions` | Atualiza detalhe, listas, relacionados, destaque e favoritos se a versão for maior. Se o NFT está no carrinho, invalida carrinho e cotação e avisa o usuário (toast com live region). |
| `order.updated` | só o dono do pedido | `Order` completo | Atualiza o pedido se a versão for maior. Em estado terminal, invalida carrinho e pedidos pendentes. |

**Quem publica:** mudanças de estoque na confirmação de pedido, os cenários `preco-alterado` e `edicao-esgotada`, criação e finalização de pedidos e os gatilhos `__mock`.

## Política de sessão

- **Cookie e duração:** a sessão fica no cookie `kurio_session`, que vale 2 h. Um refresh mantém a sessão (`GET /session`).
- **Sessão expirada:** qualquer 401 com `sessao_expirada` ou `nao_autenticado`, em consulta ou mutation, chega ao `QueryCache`/`MutationCache` e daí a `SessionWatcher`. Ele apaga os dados privados do cache, marca a sessão como visitante e abre o login sobre a tela atual (`motivo=sessao-expirada`). A tela continua montada. No pagamento, o rascunho do formulário fica no `sessionStorage` por usuário e volta depois do login. Se a expiração é descoberta no carregamento da página, o usuário vira visitante com um aviso.
- **Isolamento por usuário:**
  - Toda query key privada leva o dono (`useDataOwner()`: id do usuário ou `visitante`).
  - Login, logout, cadastro e expiração removem as chaves privadas (`PRIVATE_KEYS`: carrinho, perfil, carteiras, checkout, pedidos e favoritos).
  - O logout limpa também o rascunho do pagamento e a chave de idempotência.
  - A conexão Socket.IO é recriada por dono dos dados e os listeners da anterior são removidos.
  - O servidor só envia `order.updated` ao dono, e a API responde 403 a pedido de outra conta.
- **Senhas:** as fixtures e as contas novas guardam só PBKDF2-SHA256 (100 mil iterações) com sal.

## Estado do carrinho

- **Servidor como fonte da verdade.** O cliente nunca calcula subtotal, desconto, taxa ou total. Ele mostra a cotação que a API devolve.
- **Visitante e login.** O visitante tem carrinho próprio (cookie). No login ou cadastro, a API mescla os itens do visitante no carrinho do usuário, respeitando estoque e máximo por pedido, e remove o carrinho de visitante.
- **Atualização otimista com rollback.** Quantidade e remoção mudam a lista na hora (`onMutate`). Se a API recusar, o estado anterior volta (`onError`) e o cache é invalidado. Enquanto há escrita pendente, o resumo fica marcado como "atualizando".
- **Ordem das escritas.** Todas as mutations do carrinho usam `scope: { id: 'cart' }`, então o servidor recebe na ordem dos cliques. Só a última resposta da fila é aplicada no cache.
- **Preço ou estoque alterado.** O item mostra o aviso ("Preço atualizado de X para Y", "Só restam N unidades") com a ação que resolve ("Entendi", "Ajustar para N"). "Conectar e finalizar" fica bloqueado até resolver.
- **Depois da confirmação.** O servidor tira do carrinho só as quantidades compradas. Em falha ou recusa, nada sai do carrinho.

## Cache, retries e cancelamento

| Consulta | `staleTime` | Observação |
| --- | --- | --- |
| Padrão | 30 s | `gcTime` 5 min |
| Catálogo (lista) | 30 s | `placeholderData: keepPreviousData`; chave = todos os parâmetros |
| Facetas, avaliações | 5 min | (nenhuma) |
| Sessão | 60 s | (nenhuma) |
| Carrinho | 10 s | chave por dono |
| Cotação do checkout | 0, `gcTime` 0 | chave por dono, rede e versão do carrinho; refeita ao abrir a revisão |
| Pedido | (padrão) | atualizado por `order.updated`; consulta a cada 3 s só enquanto o socket está fora e o pedido pendente |

- **Retries:** as consultas tentam de novo até 2 vezes (espera de 1 s e 2 s), só em falha transitória (rede, timeout ou 5xx). Erros 4xx não repetem. As mutations não repetem, com uma exceção: a criação de pedido repete até 2 vezes em falha transitória com a mesma chave de idempotência.
- **Timeouts do Axios:** 10 s no geral e 6 s para criar pedido.
- **Respostas obsoletas:** toda `queryFn` passa o `signal` ao Axios. Mudar de filtro cancela a requisição anterior, e uma resposta atrasada de outra chave não afeta a tela (cenário `fora-de-ordem`).
- **Invalidação:** cada mutation grava a resposta da API no cache (`setQueryData`). Eventos e mutations que mudam o servidor invalidam só as chaves afetadas.

## Checkout e idempotência

1. "Confirmar compra" valida os campos do layout (no desktop, todo o perfil do colecionador; no mobile, carteira e rede).
2. A carteira é conectada (`POST /wallet-connections`). A conexão pode ser recusada (`carteira-recusada`).
3. A revisão abre com uma cotação nova da API e mostra os preços que mudaram desde o carrinho.
4. "Confirmar e pagar" envia `POST /orders` com `Idempotency-Key`. A chave é derivada de usuário, `quoteId`, carteira e dados do colecionador, e fica no `sessionStorage`. Clique repetido, nova tentativa após timeout e refresh reaproveitam a mesma chave. Se a cotação muda, a chave muda.
5. Se a API responder `cotacao_desatualizada`, a nova cotação substitui a da revisão e o usuário precisa confirmar de novo. Com `indisponivel`, a revisão bloqueia e aponta para o carrinho.
6. O pedido nasce `pendente`, e o servidor simulado o finaliza 3 s depois (confirmado ou recusado, conforme o cenário ativo na criação). `/pedidos/$id` mostra "Processando seu pagamento" e abre o recibo só quando o pedido está `confirmado`. `recusado` mostra o motivo e "Voltar ao pagamento". Os dois estados são terminais.
7. Refresh com pedido pendente mantém o mesmo pedido (a URL tem o id). O pagamento também mostra "Você tem um pedido em processamento". Durante o envio, a tela de pagamento continua montada mesmo que um `order.updated` esvazie o carrinho antes de a resposta chegar.

## Reconciliação REST × Socket.IO

- **Rastreador de eventos:** `event-tracker.ts` guarda os ids vistos (limite de 500) e a maior versão por recurso. Duplicata ou versão menor ou igual é descartada sem efeito colateral.
- **Versão no cache:** cada entrada do cache só muda se `entry.version < event.version`. Uma resposta REST mais nova nunca regride por causa de um evento atrasado.
- **Valores calculados no servidor:** carrinho e cotação não são remendados com o evento. Eles são invalidados e a API responde com os valores corretos.
- **Reconexão:** após uma queda (`disconnect` ou `connect_error` seguido de `connect`), o cliente invalida catálogo, carrinho, pedidos e cotação ativos, porque eventos podem ter se perdido. O aviso "Reconectando as atualizações em tempo real…" aparece se a queda passar de 1,2 s.
- **Fim do ciclo de vida:** a desmontagem (troca de usuário) remove todos os listeners e fecha o socket.

## Transporte dos mocks e limitações

- **REST:** MSW 2 com service worker (`public/mockServiceWorker.js`). Requisições fora de `/api` passam direto.
- **Socket.IO:** `ws.link` do MSW com `@mswjs/socket.io-binding`. O MSW intercepta o `WebSocket` do navegador, e o `socket.io-client` usa só o transporte websocket (long-polling não passa pelo interceptador).
- **Caminho `/tempo-real/`:** o MSW remove o prefixo `/socket.io/` antes de comparar a URL com o handler. Com o caminho padrão, sobraria só a raiz, que é também a URL do WebSocket de HMR do Vite. Daí o caminho próprio.
- **Handshake e ping:** com o MSW 2.15, o binding não envia o handshake do Engine.IO (`0{...}`) nem o do namespace (`40`), e nunca envia ping. O handler envia os dois e pinga a cada 20 s. Sem o ping, o cliente derrubaria a conexão por timeout.
- **Ordem de carregamento:** o `engine.io-client` guarda a referência ao `WebSocket` global quando o módulo carrega. Por isso o `socket.io-client` é importado dinamicamente, depois de o MSW iniciar.
- **Queda simulada:** durante uma queda, a tentativa de reconexão recebe `error` antes do `close`. Só o `close`, sem erro, deixa o gerenciador de reconexão do cliente travado.
- **Cookies:** o MSW repassa `Set-Cookie` para `document.cookie`, então os cookies `kurio_session` e `kurio_cart` não podem ser `httpOnly` como seriam num servidor real.
- **Estado por navegador:** o estado do "servidor" vive no `localStorage` (`kurio:mock-db:v8`) e é carregado quando a aba abre. Cada aba tem o próprio servidor de eventos, então uma mudança feita em uma aba aparece na outra só depois de recarregar. `?mock-reset` restaura as fixtures.
- **Processamento de pedido:** depende de `setTimeout` na própria página. Se a página recarrega com um pedido pendente, o processamento é retomado quando o socket do usuário reconecta (`resumePendingOrders`), e qualquer `GET` do pedido também o finaliza se o prazo já passou.
- **Service worker por contexto:** o MSW reinstala o service worker em cada contexto novo do navegador. Por isso os testes Playwright usam timeout de 10 s nas asserções.

## Performance

Medianas de 3 execuções, build de produção, cenário padrão. A tabela completa e o ambiente estão em [lighthouse/RESULTADOS.md](lighthouse/RESULTADOS.md).

| Perfil | Página | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | `/` | 79 | 100 | 100 | 100 | 3,19 s | 4,23 s | 0 | 29 ms |
| Mobile | `/nft/emerald-ape-042` | 80 | 100 | 100 | 100 | 3,19 s | 4,15 s | 0 | 17 ms |
| Desktop | `/` | 99 | 100 | 100 | 100 | 0,68 s | 0,85 s | 0 | 0 ms |
| Desktop | `/nft/emerald-ape-042` | 99 | 100 | 100 | 100 | 0,70 s | 0,90 s | 0 | 0 ms |

**Por que o mobile fica abaixo de 90.** O elemento de LCP é a imagem do primeiro card no início e a imagem do NFT no detalhe. Os arquivos chegam cedo (14 a 47 KB); o que atrasa a pintura é esperar os dados. Os dois dependem de dados da API, e a API desta entrega é o MSW rodando no navegador. Antes de qualquer dado, o aparelho simulado (4G lento, CPU 4× mais lenta) precisa:

1. baixar e executar o JS principal (145 KB gzip: React DOM, TanStack Router e Query, Axios, Sonner);
2. baixar e executar o MSW (172 KB gzip);
3. registrar e ativar o service worker;
4. só então responder ao catálogo ou ao detalhe.

Os passos 2 e 3 são exclusivos do ambiente simulado: com um backend real, o LCP passaria a depender só do JS da aplicação e da resposta da API. A configuração não foi simplificada para a auditoria: os mocks, as fontes e o tempo real estão ativos nas medições.

**O que foi feito nesta etapa:**

- **Renderização antes do MSW:** a interface é desenhada antes de o MSW iniciar (sinal `networkReady`), e o chunk do MSW é pedido logo depois da primeira pintura. TBT caiu de cerca de 280 ms para cerca de 30 ms e o FCP melhorou.
- **Zod removido:** a validação de search params passou para funções pequenas (`src/lib/search-params.ts`).
- **Carregamento sob demanda:** o diálogo de login e cadastro só carrega quando a URL pede, a busca quando é aberta e o menu da conta quando há sessão. Um clique antes do carregamento abre o menu assim que ele chega. O `socket.io-client` também carrega sob demanda.
- **`content-visibility: auto`** nas seções abaixo da dobra (banners, diário, footer).
- **CLS:** `<main>` com altura mínima de uma tela, para o footer não ser empurrado quando o conteúdo carrega (o detalhe desktop tinha CLS de 0,25). O status de carregamento do catálogo foi tirado de dentro do grid, o que invertia o mosaico do mobile durante o skeleton.
- **SEO:** `public/robots.txt` (antes o rewrite de SPA devolvia o HTML no lugar dele).
- **Fonte própria:** Roboto Mono variável servida pelo próprio site (`@fontsource-variable`), com `font-display: swap`.
- **Artes do Figma em WebP:** os originais (`assets/nfts/`, PNG 1254 px, cerca de 2 MB cada) viram WebP de 480, 640 e 960 px em `public/nfts/` (14 a 61 KB). A API devolve `image.src` (480 px, usado nas miniaturas) e `image.srcSet`, e cada `<img>` grande declara `sizes` com a largura real no layout. Só existem 4 artes, então o navegador as baixa uma vez e reaproveita em todas as telas.

## Acessibilidade

- **Navegação:** link "Pular para o conteúdo", foco visível em todos os controles, foco preso e devolvido nos diálogos e drawers (Radix), e Esc fecha.
- **Campos:** todos têm `label`, mesmo quando o Figma mostra só placeholder (o rótulo fica visível só para leitores de tela). Erros ficam ligados por `aria-describedby`, `aria-invalid` é aplicado, e o foco vai para o primeiro campo inválido, inclusive quando o erro vem da API.
- **Estados:** abas e filtros do catálogo usam `aria-current`; favoritos usam `aria-pressed`; edições são rádios nativos com navegação por setas; a quantidade usa `output` com live region.
- **Avisos:** mutations e eventos em tempo real são anunciados por toasts (Sonner, `aria-live`) e regiões `role="status"`. Carregamentos têm `aria-busy` e texto para leitores de tela.
- **Movimento:** skeletons com shimmer preservam as dimensões e param com `prefers-reduced-motion`. O carrossel também respeita a preferência, assim como a rolagem suave até o catálogo nos links com `#catalogo` (`defaultHashScrollIntoView` no router).
- **Largura:** sem rolagem horizontal em 390, 768 e 1440 px nas telas conferidas durante o desenvolvimento (início, detalhe, carrinho, pagamento, login, perfil, carteiras e favoritos).

## Decisões de UX para estados não desenhados

- **Skeletons:** catálogo, filtros, destaque, detalhe, avaliações, relacionados, carrinho, pagamento, perfil, carteiras e favoritos usam o mesmo `bg-card` com shimmer.
- **Vazio, erro e indisponível:** estados vazios trazem a próxima ação ("Explorar NFTs", "Limpar filtros"). Erros explicam o que houve e oferecem "Tentar novamente". Edição esgotada aparece riscada e não pode ser escolhida, e NFT esgotado mostra o selo "Esgotado" no card e o botão "Esgotado" desabilitado.
- **Ações fora do escopo:** Criadores, Aprenda, Diário da Cunhagem, newsletter, redes sociais, recuperação de senha, login social, Atividade, Ofertas, Arquivos baixados, Suporte e o botão de QR code mostram "… não está disponível nesta demonstração". Não simulam sucesso.
- **"Ver no Etherscan":** avisa que a transação é simulada, em vez de abrir um link que não existe na rede real.
- **Compartilhar:** abre os serviços reais (LinkedIn, Twitter, e-mail) com a URL do NFT.
- **Posição dos toasts:** no desktop ficam 80 px abaixo do topo, logo abaixo do header, para não cobrir os links nem pausar enquanto o mouse está no menu; no mobile, 72 px, para não cobrir as barras com voltar e favoritar.
- **Mobile sem frame no Figma:** perfil, carteiras e favoritos usam o mesmo layout do desktop em uma coluna, com o menu "Meu perfil" virando uma faixa rolável. A confirmação é um diálogo em largura cheia. Detalhe, carrinho e pagamento usam barra própria (voltar) sem tab bar, como nos frames.
- **Tablet (768 px):** header desktop e catálogo com filtros em drawer ("Filtros") em vez da coluna lateral.

## Desvios do Figma

| Onde | Figma | Implementação | Motivo |
| --- | --- | --- | --- |
| Artes das NFTs | Ilustrações quadradas | Mesmas ilustrações, recortadas em 6:7 nos cards (`object-cover`) | Proporção dos cards no layout |
| Contagem por rede | Ethereum 119, Polygon 78, Solana 86 | Contagens reais das fixtures (103, 68, 68) | Os números do Figma somam 283, mas o catálogo tem 239 itens (as contagens por coleção do Figma foram mantidas) |
| Faixa de preço | "0,02 - 12,30 ETH" | "0.02 - 12.30 ETH" | Mesmo formato dos demais valores em ETH |
| Linha do carrinho (desktop) | "ID do token" | "ID do token · Edição 1/50" | Duas edições do mesmo NFT ficariam iguais |
| Hover do card (desktop) | Ícones de carrinho, coração e lupa | Só o coração | A lupa repete o clique no card, e o carrinho exigiria escolher a edição no card |
| Header com sessão | Sempre "Entrar" | Avatar e primeiro nome com menu da conta | Estado logado não desenhado |
| Item ativo no header em Perfil/Carteiras | "Início" | Nenhum | O perfil não faz parte do Início |
| Busca no desktop | Ícone no header | Ícone que abre um diálogo de busca | Comportamento não desenhado |
| Login e cadastro no desktop | Diálogo sobre o Início | Diálogo sobre a página atual | Preserva o contexto do fluxo |
| Detalhe mobile | Painel com informações | Mesmo painel, com abas (detalhes e avaliações) e relacionados abaixo | Conteúdo do desktop acessível no mobile |
| Seletor ".eth" | Lista | Lista com uma opção | Só o domínio .eth é suportado |
| "Código de indicação" e "Nome ENS" | Obrigatórios | Obrigatórios | Mantidos como no Figma, com formato validado |
| Opção "WalletConnect" no pagamento desktop | Selo "METAMASK · WALLETCONNECT · COINBASE" | Mesmo selo, com o nome WalletConnect para leitores de tela | Fidelidade com nome acessível |
