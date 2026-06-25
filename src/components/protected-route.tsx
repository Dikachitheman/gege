import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'

function FullScreenLoader() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )
}

/** Requires a signed-in student (non-admin). Redirects admins to /admin. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

/** Requires a signed-in admin/staff user. */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isAdmin, isStaff } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin && !isStaff) return <Navigate to="/app" replace />
  return <>{children}</>
}

/** Redirects already-signed-in users away from auth pages. */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isAdmin } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to={isAdmin ? '/admin' : '/app'} replace />
  return <>{children}</>
}
