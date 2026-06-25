import { Database, ExternalLink } from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Logo } from '@/components/brand'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Blocks the app with friendly setup instructions until `.env` has a real
 * Supabase URL + anon key. Prevents confusing "failed to fetch" errors.
 */
export function SupabaseGate({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) return <>{children}</>

  return (
    <div className="min-h-svh bg-grid grid place-items-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <Logo />
          <CardTitle className="mt-4 flex items-center gap-2 text-xl">
            <Database className="size-5 text-primary" /> Connect your Supabase project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            The app is ready, but it needs your Supabase keys to load data. Two quick steps:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open <code className="rounded bg-muted px-1.5 py-0.5">.env</code> in the project root.
            </li>
            <li>
              Paste your <strong>anon public</strong> key into{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code>, then
              restart the dev server.
            </li>
          </ol>
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            Where do I find my anon key? <ExternalLink className="size-3.5" />
          </a>
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            Also remember to turn <strong>off</strong> “Confirm email” in Authentication → Sign In /
            Providers → Email, so sign up works instantly (see <code>GUIDE.md</code>).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
