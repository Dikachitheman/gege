import * as React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  Building2,
  Compass,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/components/theme-provider'
import { getNotifications } from '@/lib/api'
import { cn, initials } from '@/lib/utils'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/hostels', label: 'Browse Hostels', icon: Building2, end: false },
  { to: '/app/allocation', label: 'My Allocation', icon: KeyRound, end: false },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, end: false },
  { to: '/app/guide', label: 'How to use', icon: Compass, end: false },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )
          }
        >
          <item.icon className="size-4.5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}

export function AppLayout() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  })
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const Sidebar = (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <div className="px-2 pt-2">
        <Logo className="text-sidebar-foreground [&_.text-muted-foreground]:text-sidebar-foreground/50" />
      </div>
      <NavItems onNavigate={() => setMobileOpen(false)} />
      <div className="mt-auto rounded-lg bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground/70">
        Need help? Open <span className="font-semibold text-sidebar-foreground">How to use</span> for
        a step-by-step guide.
      </div>
    </div>
  )

  return (
    <div className="min-h-svh bg-muted/30 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-svh">{Sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-72 shadow-xl">
            <button
              className="absolute right-3 top-3 z-10 text-sidebar-foreground/70"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            {Sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/app/notifications')}
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-secondary cursor-pointer">
                  <Avatar>
                    <AvatarFallback>{initials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left text-sm leading-tight sm:block">
                    <span className="block font-medium">{profile?.full_name ?? 'Student'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {profile?.matric_number ?? profile?.email}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>{profile?.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                  {profile?.role && profile.role !== 'student' && (
                    <Badge variant="accent" className="mt-1 w-fit capitalize">
                      {profile.role.replace('_', ' ')}
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/profile')}>
                  <UserIcon /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
