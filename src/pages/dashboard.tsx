import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  KeyRound,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useJourney } from '@/hooks/use-journey'
import { getNotifications } from '@/lib/api'
import { cn, formatNaira } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-xl font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile, user } = useAuth()
  const journey = useJourney()
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !!user,
  })

  const { application, allocation, payment, hasAllocation, hasApplication, paymentDone } = journey
  const hostelName = allocation?.hostel?.name ?? application?.hostel?.name ?? '—'
  const fee = application?.hostel?.fee ?? 0
  const paid = payment?.amount_paid ?? 0
  const balance = Math.max(0, fee - paid)
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const steps = [
    { title: 'Account created', done: true, hint: 'Your student profile is set up.' },
    {
      title: 'Bed reserved & application submitted',
      done: hasApplication || hasAllocation,
      hint: hasApplication || hasAllocation ? `${hostelName}` : 'Pick a hostel and a bed space.',
    },
    {
      title: 'Payment completed',
      done: paymentDone || hasAllocation,
      hint: paymentDone || hasAllocation ? 'Hostel fee paid.' : 'Pay your hostel fee to confirm.',
    },
    {
      title: 'Allocation confirmed',
      done: hasAllocation,
      hint: hasAllocation ? `Room ${allocation?.room?.room_number}` : 'Your bed will be confirmed here.',
    },
  ]

  if (journey.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Welcome back, ${firstName} 👋`} description="Here’s the status of your hostel application." />

      {/* Primary status banner */}
      {hasAllocation ? (
        <Card className="mb-6 border-success/40 bg-success/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-success/15 text-success">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="font-semibold">You’re allocated! 🎉</p>
                <p className="text-sm text-muted-foreground">
                  {hostelName} · Room {allocation?.room?.room_number} · {allocation?.bed?.position}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/app/allocation">
                View allocation <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : hasApplication ? (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-warning/15 text-warning">
                <Clock className="size-6" />
              </div>
              <div>
                <p className="font-semibold">Almost there — complete your payment</p>
                <p className="text-sm text-muted-foreground">
                  You reserved a bed in {hostelName}. Pay {formatNaira(balance)} to confirm your space.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/app/hostels">Change selection</Link>
              </Button>
              <Button asChild>
                <Link to="/app/payment">
                  Make payment <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="size-6" />
              </div>
              <div>
                <p className="font-semibold">You haven’t applied yet</p>
                <p className="text-sm text-muted-foreground">
                  Browse available hostels and reserve your bed space.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/app/hostels">
                Apply for hostel <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Hostel"
          value={<span className="truncate">{hostelName}</span>}
          sub={allocation?.bed?.position ?? application?.bed?.position ?? 'Not selected'}
        />
        <StatCard
          icon={KeyRound}
          label="Application"
          value={
            hasAllocation ? (
              <StatusBadge status="approved" />
            ) : hasApplication ? (
              <StatusBadge status={application!.status} />
            ) : (
              <span className="text-muted-foreground">Not started</span>
            )
          }
        />
        <StatCard
          icon={CreditCard}
          label="Payment"
          value={payment ? <StatusBadge status={payment.status} /> : <span className="text-muted-foreground">Not started</span>}
          sub={fee ? `${formatNaira(paid)} of ${formatNaira(fee)}` : undefined}
        />
        <StatCard
          icon={Wallet}
          label="Outstanding balance"
          value={<span className={cn(balance > 0 ? 'text-destructive' : 'text-success')}>{formatNaira(balance)}</span>}
          sub={balance > 0 && hasApplication ? 'Payment required' : 'Nothing due'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your application timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
              {steps.map((s) => (
                <li key={s.title} className="relative flex gap-4 pl-0">
                  <span
                    className={cn(
                      'z-10 grid size-6 shrink-0 place-items-center rounded-full border-2 bg-background',
                      s.done ? 'border-success text-success' : 'border-muted-foreground/30 text-muted-foreground/40',
                    )}
                  >
                    {s.done ? <CheckCircle2 className="size-5" /> : <Circle className="size-3" />}
                  </span>
                  <div className="pt-0.5">
                    <p className={cn('font-medium', !s.done && 'text-muted-foreground')}>{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.hint}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/app/hostels">
                <span className="flex items-center gap-2">
                  <Building2 className="size-4" /> {hasApplication ? 'Edit selection' : 'Browse hostels'}
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              disabled={!hasApplication || paymentDone || hasAllocation}
              asChild={hasApplication && !paymentDone && !hasAllocation}
            >
              {hasApplication && !paymentDone && !hasAllocation ? (
                <Link to="/app/payment">
                  <span className="flex items-center gap-2">
                    <CreditCard className="size-4" /> Make payment
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <span className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="size-4" /> Make payment
                  </span>
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/app/allocation">
                <span className="flex items-center gap-2">
                  <KeyRound className="size-4" /> My allocation
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link to="/app/notifications">
                <span className="flex items-center gap-2">
                  <Bell className="size-4" /> Notifications
                </span>
                {unread > 0 ? (
                  <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-white">
                    {unread}
                  </span>
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
