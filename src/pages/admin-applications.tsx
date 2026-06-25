import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAdminApplications, adminApproveApplication } from '@/lib/api'
import { formatNaira } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { AdminApplicationDetail, ApplicationStatus } from '@/types'

const TABS: { label: string; value: ApplicationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
]

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  )
}

export default function AdminApplicationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = React.useState<ApplicationStatus | 'all'>('pending')
  const [selected, setSelected] = React.useState<AdminApplicationDetail | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: getAdminApplications,
  })

  const approve = useMutation({
    mutationFn: (id: string) => adminApproveApplication(id),
    onSuccess: () => {
      toast.success('Application approved — allocation created.')
      qc.invalidateQueries({ queryKey: ['admin-applications'] })
      setSelected(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to approve.'),
  })

  const filtered = React.useMemo(() => {
    if (!data) return []
    if (tab === 'all') return data
    return data.filter((a) => a.status === tab)
  }, [data, tab])

  const counts = React.useMemo(
    () =>
      (data ?? []).reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1
        return acc
      }, {}),
    [data],
  )

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Review and approve student hostel applications."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicationStatus | 'all')} className="mb-4">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value !== 'all' && counts[t.value] ? (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                  {counts[t.value]}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No {tab === 'all' ? '' : tab} applications.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Matric No.</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Hostel</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Room / Bed</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr
                      key={app.id}
                      className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
                      onClick={() => setSelected(app)}
                    >
                      <td className="px-4 py-3 font-medium">{app.profile?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {app.profile?.matric_number ?? '—'}
                      </td>
                      <td className="px-4 py-3">{app.hostel?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {app.room?.room_number} / Bed {app.bed?.bed_number} ({app.bed?.position})
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(app.created_at), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            {selected && (
              <DialogDescription>
                Submitted {format(new Date(selected.created_at), 'dd MMM yyyy, HH:mm')}
              </DialogDescription>
            )}
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Student
                </p>
                <DetailRow label="Name" value={selected.profile?.full_name} />
                <DetailRow label="Email" value={selected.profile?.email} />
                <DetailRow label="Matric No." value={selected.profile?.matric_number} />
                <DetailRow label="Gender" value={selected.profile?.gender} />
                <DetailRow label="Faculty" value={selected.profile?.faculty} />
                <DetailRow label="Department" value={selected.profile?.department} />
                <DetailRow label="Level" value={selected.profile?.level} />
                <DetailRow label="Phone" value={selected.profile?.phone} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Hostel / Room
                </p>
                <DetailRow
                  label="Hostel"
                  value={`${selected.hostel?.name ?? '—'} (${selected.hostel?.code ?? '—'})`}
                />
                <DetailRow label="Room" value={selected.room?.room_number} />
                <DetailRow
                  label="Bed"
                  value={`Bed ${selected.bed?.bed_number} — ${selected.bed?.position}`}
                />
                <DetailRow
                  label="Fee"
                  value={selected.hostel?.fee ? formatNaira(selected.hostel.fee) : '—'}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <StatusBadge status={selected.status} />
                {selected.status === 'pending' && (
                  <Button onClick={() => approve.mutate(selected.id)} disabled={approve.isPending}>
                    {approve.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 />
                    )}
                    Approve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
