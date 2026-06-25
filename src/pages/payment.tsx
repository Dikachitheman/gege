import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useJourney } from '@/hooks/use-journey'
import { simulatePayment } from '@/lib/api'
import { cn, formatNaira, sleep } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/status-badge'

type Method = 'full' | 'installment'

export default function PaymentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { application, allocation, payment, hasAllocation, hasApplication, refetchAll } = useJourney()

  const fee = application?.hostel?.fee ?? 0
  const alreadyPaid = payment?.amount_paid ?? 0
  const balance = Math.max(0, fee - alreadyPaid)

  const [method, setMethod] = React.useState<Method>('full')
  const [amount, setAmount] = React.useState<string>('')
  const [error, setError] = React.useState<string | null>(null)

  const amountToPay = method === 'full' ? balance : Number(amount || 0)

  const pay = useMutation({
    mutationFn: async () => {
      await sleep(1400) // simulate processing
      return simulatePayment({
        profileId: user!.id,
        applicationId: application!.id,
        amountDue: fee,
        plan: method,
        amountThisTime: amountToPay,
        existingPayment: payment,
      })
    },
    onSuccess: (result) => {
      refetchAll()
      if (result.status === 'completed') {
        toast.success('Payment complete — you’re allocated! 🎉')
        navigate('/app/allocation')
      } else {
        toast.success(`Payment received. Balance: ${formatNaira(fee - result.amount_paid)}`)
        setAmount('')
        setMethod('full')
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Payment failed.'),
  })

  function handlePay() {
    setError(null)
    if (method === 'installment') {
      const value = Number(amount)
      if (!value || value <= 0) return setError('Enter how much you want to pay now.')
      if (value > balance) return setError(`You can pay at most ${formatNaira(balance)} (the outstanding balance).`)
      const minFirst = Math.ceil(fee * 0.5)
      if (alreadyPaid + value < minFirst && alreadyPaid + value < fee) {
        return setError(`Your first payment must be at least 50% of the fee (${formatNaira(minFirst)}).`)
      }
    }
    pay.mutate()
  }

  // ---- Guards ----------------------------------------------------------------
  if (hasAllocation) {
    return (
      <div>
        <PageHeader title="Payment" />
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Your fee is fully paid</AlertTitle>
          <AlertDescription>
            You’re allocated to {allocation?.hostel?.name}. Nothing else to pay.
            <Button size="sm" className="mt-2" asChild>
              <Link to="/app/allocation">View allocation</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!hasApplication) {
    return (
      <div>
        <PageHeader title="Payment" />
        <Alert variant="info">
          <BedDouble />
          <AlertTitle>Reserve a bed first</AlertTitle>
          <AlertDescription>
            You need to reserve a bed space before you can pay.
            <Button size="sm" className="mt-2" asChild>
              <Link to="/app/hostels">Browse hostels</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/app">
          <ArrowLeft /> Dashboard
        </Link>
      </Button>
      <PageHeader title="Make payment" description="Pay your hostel fee to confirm your bed space." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Payment method */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose how to pay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MethodCard
                  active={method === 'full'}
                  onClick={() => setMethod('full')}
                  icon={Wallet}
                  title="Pay in full"
                  desc={`Pay the whole balance (${formatNaira(balance)}) and get allocated now.`}
                />
                <MethodCard
                  active={method === 'installment'}
                  onClick={() => setMethod('installment')}
                  icon={CreditCard}
                  title="Pay by installment"
                  desc="Pay part now (min. 50%) and the balance later."
                />
              </div>

              {method === 'installment' && (
                <Field label="Amount to pay now (₦)" htmlFor="amount" error={error ?? undefined}>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={balance}
                    placeholder={`e.g. ${Math.ceil(fee * 0.5)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
              )}
              {method === 'full' && error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Alert variant="info">
                <ShieldCheck />
                <AlertTitle>Simulated payment</AlertTitle>
                <AlertDescription>
                  This is a demo — no real card or money is involved. Clicking “Pay” instantly records
                  the payment.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Hostel" value={application?.hostel?.name ?? '—'} />
            <Row label="Room" value={application?.room?.room_number ?? '—'} />
            <Row label="Bed" value={application?.bed?.position ?? '—'} />
            <Separator />
            <Row label="Hostel fee" value={formatNaira(fee)} />
            <Row label="Already paid" value={formatNaira(alreadyPaid)} />
            {payment && (
              <Row label="Payment status" value={<StatusBadge status={payment.status} />} />
            )}
            <Separator />
            <Row label="You’ll pay now" value={<strong>{formatNaira(amountToPay)}</strong>} />
            <Row
              label="Balance after"
              value={formatNaira(Math.max(0, balance - amountToPay))}
            />

            <Button
              size="lg"
              className="mt-2 w-full"
              onClick={handlePay}
              disabled={pay.isPending || balance <= 0}
            >
              {pay.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Processing…
                </>
              ) : (
                <>
                  Pay {formatNaira(amountToPay)} <ArrowRight />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MethodCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
  desc: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:border-primary cursor-pointer',
        active ? 'border-primary ring-2 ring-primary/20' : 'border-border',
      )}
    >
      <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
