import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePassword, deleteWallet, removeAvatar, saveWallet, updateProfile, uploadAvatar } from '@/api/account'
import type { Profile, Wallet, WalletInput, WalletRole } from '@/api/contracts/account'
import type { Session } from '@/api/contracts/auth'
import { sessionKey } from '@/features/auth/session'
import { accountKeys } from '@/features/checkout/queries'

/** Perfil salvo: atualiza o cache do perfil e o usuário da sessão (header, menu). */
function useProfileSync(userId: string) {
  const queryClient = useQueryClient()
  return (profile: Profile) => {
    queryClient.setQueryData(accountKeys.profile(userId), profile)
    queryClient.setQueryData<Session>(sessionKey, (session) =>
      session?.user
        ? {
            ...session,
            user: {
              ...session.user,
              displayName: profile.displayName,
              username: profile.username,
              email: profile.email,
              avatarUrl: profile.avatarUrl,
            },
          }
        : session,
    )
  }
}

export function useUpdateProfile(userId: string) {
  const sync = useProfileSync(userId)
  return useMutation({ mutationFn: updateProfile, onSuccess: sync })
}

export function useUploadAvatar(userId: string) {
  const sync = useProfileSync(userId)
  return useMutation({ mutationFn: uploadAvatar, onSuccess: sync })
}

export function useRemoveAvatar(userId: string) {
  const sync = useProfileSync(userId)
  return useMutation({ mutationFn: removeAvatar, onSuccess: sync })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}

export function useSaveWallet(userId: string, role: WalletRole) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WalletInput) => saveWallet(role, input),
    onSuccess: (saved) =>
      queryClient.setQueryData<Wallet[]>(accountKeys.wallets(userId), (wallets = []) => [
        ...wallets.filter((wallet) => wallet.role !== role),
        saved,
      ]),
  })
}

export function useDeleteWallet(userId: string, role: WalletRole) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteWallet(role),
    onSuccess: () =>
      queryClient.setQueryData<Wallet[]>(accountKeys.wallets(userId), (wallets = []) =>
        wallets.filter((wallet) => wallet.role !== role),
      ),
  })
}
