import { Badge } from '@/components/ui/badge'
import { titleCase } from '@/lib/utils'
import type {
  AllocationStatus,
  ApplicationStatus,
  BedStatus,
  PaymentStatus,
} from '@/types'

type AnyStatus = ApplicationStatus | PaymentStatus | AllocationStatus | BedStatus | string

const VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  // applications
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'secondary',
  // payments
  partial: 'warning',
  completed: 'success',
  failed: 'destructive',
  // allocations / beds
  active: 'success',
  released: 'secondary',
  available: 'success',
  reserved: 'warning',
  occupied: 'destructive',
  maintenance: 'secondary',
}

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  return (
    <Badge variant={VARIANT[status] ?? 'secondary'} className={className}>
      {titleCase(String(status))}
    </Badge>
  )
}
