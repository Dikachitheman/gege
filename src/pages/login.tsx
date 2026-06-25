import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { UNIVERSITY } from '@/lib/constants'
import { Logo } from '@/components/brand'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/app'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  function fillAdmin() {
    setValue('email', 'admin@email.com')
    setValue('password', 'AdminPassword123')
  }

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in.')
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Logo className="text-sidebar-foreground [&_.text-muted-foreground]:text-sidebar-foreground/50" />
        <div className="space-y-4">
          <h1 className="text-balance text-3xl font-bold leading-tight">
            Your hostel, sorted in minutes.
          </h1>
          <p className="text-sidebar-foreground/70">
            Browse available hostels, pick your exact bed space, pay, and get allocated — all online
            at {UNIVERSITY}.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">© {new Date().getFullYear()} {UNIVERSITY}</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-grid p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between lg:hidden">
            <Logo />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft /> Home
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to manage your hostel application.</CardDescription>
            </CardHeader>
            <CardContent>
              {formError && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle />
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <button
                type="button"
                onClick={fillAdmin}
                className="mb-4 w-full rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/10"
              >
                <span className="block font-medium text-primary">Sign in as Admin</span>
                <span className="text-xs text-muted-foreground">admin@email.com · AdminPassword123</span>
              </button>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Field label="Email address" htmlFor="email" error={errors.email?.message}>
                  <Input id="email" type="email" placeholder="name@example.com" aria-invalid={!!errors.email} {...register('email')} />
                </Field>
                <Field label="Password" htmlFor="password" error={errors.password?.message}>
                  <Input id="password" type="password" placeholder="Your password" aria-invalid={!!errors.password} {...register('password')} />
                </Field>
                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Sign in
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                New here?{' '}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
