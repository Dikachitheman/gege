import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useJourney } from '@/hooks/use-journey'
import { formatDate } from '@/lib/utils'
import { UNIVERSITY } from '@/lib/constants'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/brand'
import { Separator } from '@/components/ui/separator'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  )
}

export default function AllocationPage() {
  const { profile } = useAuth()
  const { allocation, application, session, hasAllocation, hasApplication, isLoading } = useJourney()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (!hasAllocation) {
    return (
      <div>
        <PageHeader title="My allocation" />
        {hasApplication ? (
          <Alert variant="warning">
            <Clock />
            <AlertTitle>Allocation pending payment</AlertTitle>
            <AlertDescription>
              You reserved a bed in {application?.hostel?.name} (Room {application?.room?.room_number}).
              Complete your payment to confirm the allocation.
              <Button size="sm" className="mt-2" asChild>
                <Link to="/app/payment">
                  Make payment <ArrowRight />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="info">
            <BedDouble />
            <AlertTitle>No allocation yet</AlertTitle>
            <AlertDescription>
              You haven’t been allocated a bed. Browse hostels and reserve one to get started.
              <Button size="sm" className="mt-2" asChild>
                <Link to="/app/hostels">Browse hostels</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My allocation"
        description="Your bed space is confirmed. You can print this page as your allocation slip."
        actions={
          <Button onClick={() => window.print()} className="no-print">
            <Printer /> Print
          </Button>
        }
      />

      <Alert variant="success" className="mb-6 no-print">
        <CheckCircle2 />
        <AlertTitle>You’re allocated 🎉</AlertTitle>
        <AlertDescription>
          A printable PDF letter with a verification QR code is coming soon. For now you can print
          this allocation slip.
        </AlertDescription>
      </Alert>

      {/* Printable allocation card */}
      <Card className="print-area overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-sidebar px-6 py-5 text-sidebar-foreground">
          <Logo className="text-sidebar-foreground [&_.text-muted-foreground]:text-sidebar-foreground/60" />
          <div className="text-right text-sm">
            <p className="font-semibold">Hostel Allocation Slip</p>
            <p className="text-sidebar-foreground/70">{UNIVERSITY}</p>
          </div>
        </div>

        <CardContent className="space-y-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
              <p className="text-lg font-bold text-primary">{allocation?.letter_ref}</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
              <ShieldCheck className="size-4" /> Active
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold">Student</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Full name" value={profile?.full_name} />
              <DetailRow label="Matric number" value={profile?.matric_number} />
              <DetailRow label="Gender" value={<span className="capitalize">{profile?.gender}</span>} />
              <DetailRow label="Faculty" value={profile?.faculty} />
              <DetailRow label="Department" value={profile?.department} />
              <DetailRow label="Level" value={profile?.level ? `${profile.level} Level` : '—'} />
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-sm font-semibold">Accommodation</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Hostel" value={allocation?.hostel?.name} />
              <DetailRow label="Room" value={allocation?.room?.room_number} />
              <DetailRow label="Bed space" value={allocation?.bed?.position} />
              <DetailRow label="Academic session" value={session?.name} />
              <DetailRow label="Date allocated" value={formatDate(allocation?.allocated_at)} />
              <DetailRow label="Bed number" value={`Bed ${allocation?.bed?.bed_number}`} />
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-md text-xs text-muted-foreground">
              This slip confirms the above student has been allocated the stated bed space for the
              {' '}{session?.name} academic session at {UNIVERSITY}. Keep it for your records.
            </p>
            <div className="text-center">
              <div className="mb-1 h-12 w-40 border-b border-dashed border-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Hostel Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
