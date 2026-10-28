import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ProfileNav } from '@/features/profile/profile-nav'

export const Route = createFileRoute('/_privado/perfil')({
  component: ProfileLayout,
})

function ProfileLayout() {
  return (
    <div className="site-container pt-6 md:pt-8">
      <div className="grid gap-6 lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:gap-5">
        {/* min-w-0: sem ele a faixa de abas do mobile alarga a coluna e a página. */}
        <div className="min-w-0 lg:self-start">
          <ProfileNav />
        </div>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
