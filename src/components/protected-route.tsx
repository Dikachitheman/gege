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

/** Requires a signed-in user. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

/** Redirects already-signed-in users away from auth pages. */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/app" replace />
  return <>{children}</>
}
