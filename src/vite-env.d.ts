/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base das chamadas REST. Padrão: "/api". */
  readonly VITE_API_BASE_URL?: string
  /** "enabled" (padrão) liga os mocks MSW; "disabled" desliga. */
  readonly VITE_API_MOCKING?: 'enabled' | 'disabled'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
