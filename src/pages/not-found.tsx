import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-svh place-items-center bg-grid p-6 text-center">
      <div className="space-y-6">
        <Logo className="justify-center" />
        <div className="space-y-2">
          <p className="text-6xl font-bold text-primary">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground">The page you’re looking for doesn’t exist.</p>
        </div>
        <Button asChild>
          <Link to="/">
            <Home /> Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
