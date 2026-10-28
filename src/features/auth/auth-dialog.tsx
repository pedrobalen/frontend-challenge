import { ChevronLeft, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { LoginForm, RegisterForm } from './auth-forms'
import { useAuthDialog, type AuthMode } from './auth-search'
import { OrDivider, SocialSignIn } from './form-fields'
import { useSession } from './session'

const DESCRIPTIONS: Record<AuthMode, string> = {
  entrar: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  cadastro: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
}

function ExpiredNotice({ show }: { show: boolean }) {
  return show ? (
    <p role="alert" className="mb-4 border border-primary/60 px-3 py-2 text-xs text-primary">
      Sua sessão expirou. Entre novamente para continuar de onde parou.
    </p>
  ) : null
}

/**
 * Login e cadastro: diálogo sobre a página atual no desktop (como no Figma) e
 * tela cheia no mobile. O foco fica preso no diálogo enquanto ele está aberto.
 */
export function AuthDialog() {
  const dialog = useAuthDialog()
  const { data: session } = useSession()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const mode = dialog.mode
  const open = mode !== undefined && !session?.user

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : dialog.close())}>
      {mode ? (
        isDesktop ? (
          <DialogContent
            showCloseButton={false}
            className="top-[10.5rem] max-h-[calc(100dvh-11rem)] translate-y-0 gap-0 overflow-y-auto rounded-none border-b-[6px] border-primary bg-card px-[4.9375rem] pt-14 pb-8 ring-0 sm:max-w-[31.125rem]"
          >
            <DialogClose className="absolute top-3 right-3 grid size-8 place-items-center text-primary hover:text-primary-glow">
              <X className="size-4" aria-hidden />
              <span className="sr-only">Fechar</span>
            </DialogClose>
            <DialogTitle className="sr-only">{mode === 'entrar' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>
            <Tabs value={mode} onValueChange={(value) => dialog.switchTo(value as AuthMode)} className="gap-0">
              <TabsList variant="line" className="mx-auto h-auto gap-0 p-0">
                <TabsTrigger
                  value="entrar"
                  className="h-auto rounded-none px-1.5 py-0 text-xl font-medium text-foreground after:hidden data-active:text-primary"
                >
                  Entrar
                </TabsTrigger>
                <span aria-hidden className="mx-0.5 h-5 w-px bg-primary" />
                <TabsTrigger
                  value="cadastro"
                  className="h-auto rounded-none px-1.5 py-0 text-xl font-medium text-foreground after:hidden data-active:text-primary"
                >
                  Criar conta
                </TabsTrigger>
              </TabsList>
              <DialogDescription className="mx-auto mt-8 mb-5 max-w-xs text-center text-[0.8125rem] leading-snug text-foreground">
                {DESCRIPTIONS[mode]}
              </DialogDescription>
              <ExpiredNotice show={dialog.motivo === 'sessao-expirada'} />
              <TabsContent value="entrar">
                <LoginForm variant="desktop" onSuccess={dialog.finish} />
              </TabsContent>
              <TabsContent value="cadastro">
                <RegisterForm variant="desktop" onSuccess={dialog.finish} />
              </TabsContent>
            </Tabs>
            <OrDivider fullBleed />
            <SocialSignIn variant="desktop" />
          </DialogContent>
        ) : (
          <DialogContent
            showCloseButton={false}
            className="top-0 left-0 block h-dvh max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none bg-background px-8 pt-5 pb-10 ring-0 sm:max-w-none"
          >
            <DialogClose className="grid size-9 place-items-center rounded-full bg-accent text-primary">
              <ChevronLeft className="size-5" aria-hidden />
              <span className="sr-only">Voltar</span>
            </DialogClose>
            <p aria-hidden className="mt-16 text-center text-[1.75rem] font-bold tracking-[0.1em]">
              KURIO
            </p>
            <DialogTitle className="mt-20 mb-8 text-center text-lg font-bold">
              {mode === 'entrar' ? 'Entrar' : 'Criar perfil de colecionador'}
            </DialogTitle>
            <DialogDescription className="sr-only">{DESCRIPTIONS[mode]}</DialogDescription>
            <ExpiredNotice show={dialog.motivo === 'sessao-expirada'} />
            {mode === 'entrar' ? (
              <LoginForm variant="mobile" onSuccess={dialog.finish} />
            ) : (
              <RegisterForm variant="mobile" onSuccess={dialog.finish} />
            )}
            <OrDivider />
            <SocialSignIn variant="mobile" />
            <p className="mt-12 text-center text-sm text-muted-foreground">
              {mode === 'entrar' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
              <button
                type="button"
                onClick={() => dialog.switchTo(mode === 'entrar' ? 'cadastro' : 'entrar')}
                className="hover:text-primary hover:underline"
              >
                {mode === 'entrar' ? 'Crie uma conta' : 'Entre'}
              </button>
            </p>
          </DialogContent>
        )
      ) : null}
    </Dialog>
  )
}
