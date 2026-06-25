import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  KeyRound,
  MousePointerClick,
  Quote,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { getHostels } from '@/lib/api'
import { APP_NAME, UNIVERSITY } from '@/lib/constants'
import { cn, formatNaira } from '@/lib/utils'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/theme-provider'
import { Moon, Sun } from 'lucide-react'

const FEATURES = [
  { icon: Building2, title: 'Gender-matched hostels', desc: 'You only ever see hostels you’re eligible for — female and male blocks are kept separate automatically.' },
  { icon: MousePointerClick, title: 'Pick your exact bed', desc: 'A live colour-coded map lets you click the precise bed space you want, floor by floor and wing by wing.' },
  { icon: Wallet, title: 'Flexible payments', desc: 'Pay in full or in installments. Everything is simulated for this demo — no real money moves.' },
  { icon: KeyRound, title: 'Instant allocation', desc: 'Once payment clears, your bed is confirmed and your allocation shows up on your dashboard immediately.' },
  { icon: ClipboardList, title: 'One clear dashboard', desc: 'Track your application, payment and allocation status — and get notified at every step.' },
  { icon: Sparkles, title: 'No double bookings', desc: 'Real-time reservations mean two students can never grab the same bed.' },
]

const STEPS = [
  { icon: ClipboardList, title: 'Create your account', desc: 'Register with your matric number and details. Your gender decides which hostels you can apply to.' },
  { icon: Building2, title: 'Choose hostel & bed', desc: 'Browse available hostels, then drill down floor → wing → room → bed and reserve your space.' },
  { icon: CreditCard, title: 'Make payment', desc: 'Pay the hostel fee in full or by installment. (Simulated for the demo.)' },
  { icon: KeyRound, title: 'Get allocated', desc: 'Your bed is confirmed instantly and your allocation appears on your dashboard.' },
]

const TESTIMONIALS = [
  { name: 'Amara O.', dept: '300L, Computer Science', quote: 'I picked my exact bed in the hostel I wanted in under five minutes. So much better than queuing.' },
  { name: 'Tonye G.', dept: '200L, Mechanical Engineering', quote: 'The bed map is brilliant — I could see what was free and just clicked the one I liked.' },
  { name: 'Blessing E.', dept: '400L, Law', quote: 'Paid in two installments and my allocation updated right away. Really smooth.' },
]

const FAQS = [
  { q: 'Who can apply for a hostel?', a: 'Any registered student. The system automatically shows female students the female hostels and male students the male hostels.' },
  { q: 'How do I choose my bed space?', a: 'After selecting a hostel you pick a floor, then a wing (A–E), then a room, then click any green (available) bed to reserve it.' },
  { q: 'Can I pay in installments?', a: 'Yes. You can pay the full fee at once, or pay part of it now and the balance later. Payments in this demo are simulated.' },
  { q: 'Can I change my bed after reserving?', a: 'Until you complete payment you can release your reserved bed and pick a different one. After allocation it is fixed.' },
  { q: 'What are the hostel fees?', a: 'The NDDC Hostel is ₦60,000. All other hostels are ₦50,000 per session.' },
]

function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}

export default function LandingPage() {
  const { data: hostels, isLoading } = useQuery({ queryKey: ['hostels', 'all'], queryFn: () => getHostels() })

  const totals = (hostels ?? []).reduce(
    (acc, h) => {
      acc.beds += h.stats?.total_beds ?? 0
      acc.available += h.stats?.available_beds ?? 0
      acc.rooms += h.stats?.total_rooms ?? 0
      return acc
    },
    { beds: 0, available: 0, rooms: 0 },
  )

  const stats = [
    { label: 'Hostels', value: hostels?.length ?? 9 },
    { label: 'Rooms', value: totals.rooms || '—' },
    { label: 'Bed spaces', value: totals.beds || '—' },
    { label: 'Available now', value: totals.available || '—' },
  ]

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#hostels" className="hover:text-foreground">Hostels</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Apply Now</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-grid">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <Badge variant="accent" className="gap-1.5">
              <Sparkles className="size-3.5" /> {UNIVERSITY}
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Hostel allocation, <span className="text-primary">done online.</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Browse hostels, pick your exact bed space, pay, and get allocated — all in one place. The
              modern way to get a room at {UNIVERSITY}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/register">
                  Apply Now <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#hostels">View Available Hostels</a>
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-success" /> No paperwork
              <CheckCircle2 className="ml-3 size-4 text-success" /> Instant allocation
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <BedDouble className="size-5 text-primary" /> NDDC Hostel · Room F2-A03
                </div>
                <Badge variant="success">2 free</Badge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: 'Bunk 1 · Bottom', s: 'occupied' },
                  { label: 'Bunk 1 · Top', s: 'available' },
                  { label: 'Bunk 2 · Bottom', s: 'reserved' },
                  { label: 'Bunk 2 · Top', s: 'available' },
                ].map((b) => (
                  <div
                    key={b.label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium',
                      b.s === 'available' && 'border-success/40 bg-success/10',
                      b.s === 'reserved' && 'border-warning/40 bg-warning/10',
                      b.s === 'occupied' && 'border-destructive/30 bg-destructive/5 text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 rounded-full',
                        b.s === 'available' && 'bg-success',
                        b.s === 'reserved' && 'bg-warning',
                        b.s === 'occupied' && 'bg-destructive',
                      )}
                    />
                    {b.label}
                  </div>
                ))}
              </div>
              <Button className="mt-5 w-full">Reserve selected bed</Button>
            </div>
            <div className="absolute -right-4 -top-4 -z-10 size-40 rounded-full bg-accent/30 blur-3xl" />
            <div className="absolute -bottom-6 -left-6 -z-10 size-44 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-primary md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need to get a room</h2>
          <p className="mt-3 text-muted-foreground">Built for students, not bureaucracy.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5.5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">Four steps from sign up to allocation.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <s.icon className="size-6" />
                </div>
                <span className="absolute right-0 top-0 text-5xl font-bold text-primary/10">{i + 1}</span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hostels */}
      <section id="hostels" className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Available hostels</h2>
            <p className="mt-3 text-muted-foreground">
              Six female blocks (NDDC, A, B, C, D, H) and three male blocks (E, F, G).
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/register">
              Apply for a space <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          {hostels?.map((h) => (
            <Card key={h.id} className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
              <div className="relative h-40 w-full overflow-hidden">
                <img src={h.image_url ?? ''} alt={h.name} className="size-full object-cover" loading="lazy" />
                <Badge
                  variant={h.gender === 'female' ? 'accent' : 'default'}
                  className="absolute left-3 top-3 capitalize shadow"
                >
                  {h.gender}
                </Badge>
              </div>
              <CardContent className="space-y-3 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{h.name}</h3>
                  <span className="font-semibold text-primary">{formatNaira(h.fee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="size-4" />
                    {h.stats?.available_beds ?? 0} of {h.stats?.total_beds ?? 0} beds free
                  </span>
                  <span>{h.stats?.total_rooms ?? 0} rooms</span>
                </div>
                <Button variant="secondary" className="w-full" asChild>
                  <Link to="/register">View & apply</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 lg:py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">What students say</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="space-y-4">
                  <Quote className="size-7 text-accent" />
                  <p className="text-sm leading-relaxed">“{t.quote}”</p>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.dept}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-lg border bg-card p-4 [&_summary]:cursor-pointer">
              <summary className="flex items-center justify-between font-medium marker:content-['']">
                {f.q}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <div className="overflow-hidden rounded-2xl bg-sidebar px-6 py-12 text-center text-sidebar-foreground md:px-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to get your room?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sidebar-foreground/70">
            Create your account and reserve a bed space in minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="accent" asChild>
              <Link to="/register">
                Apply Now <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-sidebar-foreground/20 bg-transparent text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-sidebar-foreground/60">
            Questions? Email{' '}
            <a href="mailto:hostels@rsu.edu.ng" className="underline">hostels@rsu.edu.ng</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} {APP_NAME}. Demo project.</p>
        </div>
      </footer>
    </div>
  )
}
