import type { SessionUser } from '@/api/contracts/auth'

export function UserAvatar({ user, className }: { user: SessionUser; className?: string }) {
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={`rounded-full object-cover ${className ?? ''}`} />
  ) : (
    <span
      aria-hidden
      className={`grid place-items-center rounded-full bg-primary font-bold text-primary-foreground ${className ?? ''}`}
    >
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  )
}
