import { BedDouble } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <BedDouble className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight">RSU Hostels</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Allocation System
          </span>
        </span>
      )}
    </span>
  )
}
