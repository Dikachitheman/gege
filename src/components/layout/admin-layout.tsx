import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="hidden items-center gap-1.5 sm:flex">
            <Shield className="size-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{profile?.email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
