import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Layers,
  Loader2,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useJourney } from '@/hooks/use-journey'
import { supabase } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'
import {
  getBeds,
  getFloors,
  getHostel,
  getRooms,
  getWings,
  reserveBed,
  upsertApplicationSelection,
} from '@/lib/api'
import { cn, formatNaira } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { BedSpace, Floor, RoomWithCounts, Wing } from '@/types'

type Step = 'floor' | 'wing' | 'room' | 'bed'
const STEP_ORDER: Step[] = ['floor', 'wing', 'room', 'bed']
const STEP_LABELS: Record<Step, string> = { floor: 'Floor', wing: 'Wing', room: 'Room', bed: 'Bed space' }

function Stepper({ step }: { step: Step }) {
  const current = STEP_ORDER.indexOf(step)
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
      {STEP_ORDER.map((s, i) => (
        <React.Fragment key={s}>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium',
              i < current && 'bg-success/10 text-success',
              i === current && 'bg-primary text-primary-foreground',
              i > current && 'bg-muted text-muted-foreground',
            )}
          >
            <span className="grid size-5 place-items-center rounded-full bg-background/20 text-xs">
              {i < current ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            {STEP_LABELS[s]}
          </span>
          {i < STEP_ORDER.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function HostelDetailPage() {
  const { hostelId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { application, allocation, session, hasAllocation, refetchAll } = useJourney()

  const [step, setStep] = React.useState<Step>('floor')
  const [floor, setFloor] = React.useState<Floor | null>(null)
  const [wing, setWing] = React.useState<Wing | null>(null)
  const [room, setRoom] = React.useState<RoomWithCounts | null>(null)
  const [bed, setBed] = React.useState<BedSpace | null>(null)

  const hostel = useQuery({ queryKey: ['hostel', hostelId], queryFn: () => getHostel(hostelId) })
  const floors = useQuery({ queryKey: ['floors', hostelId], queryFn: () => getFloors(hostelId), enabled: !!hostelId })
  const wings = useQuery({ queryKey: ['wings', floor?.id], queryFn: () => getWings(floor!.id), enabled: !!floor })
  const rooms = useQuery({ queryKey: ['rooms', wing?.id], queryFn: () => getRooms(wing!.id), enabled: !!wing })
  const beds = useQuery({
    queryKey: ['beds', room?.id],
    queryFn: () => getBeds(room!.id),
    enabled: !!room,
    refetchInterval: 8000,
  })

  // Realtime: keep the bed map in sync as others reserve/release.
  React.useEffect(() => {
    if (!room?.id) return
    const channel = supabase
      .channel(`beds-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.bedSpaces, filter: `room_id=eq.${room.id}` },
        () => qc.invalidateQueries({ queryKey: ['beds', room.id] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [room?.id, qc])

  const reserve = useMutation({
    mutationFn: async (target: BedSpace) => {
      await reserveBed(target.id)
      await upsertApplicationSelection({
        existingId: application?.id ?? null,
        profileId: user!.id,
        hostelId,
        roomId: room!.id,
        bedId: target.id,
        sessionId: session?.id ?? null,
      })
    },
    onSuccess: () => {
      refetchAll()
      qc.invalidateQueries({ queryKey: ['beds', room?.id] })
      toast.success('Bed reserved! Continue to payment to confirm your space.')
      navigate('/app/payment')
    },
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ['beds', room?.id] })
      setBed(null)
      toast.error(err instanceof Error ? err.message : 'Could not reserve that bed.')
    },
  })

  function goTo(target: Step) {
    setStep(target)
  }
  function selectFloor(f: Floor) {
    setFloor(f)
    setWing(null)
    setRoom(null)
    setBed(null)
    goTo('wing')
  }
  function selectWing(w: Wing) {
    setWing(w)
    setRoom(null)
    setBed(null)
    goTo('room')
  }
  function selectRoom(r: RoomWithCounts) {
    setRoom(r)
    setBed(null)
    goTo('bed')
  }

  if (hasAllocation) {
    return (
      <div>
        <PageHeader title="Booking closed" />
        <Alert variant="success">
          <Lock />
          <AlertTitle>You’re already allocated</AlertTitle>
          <AlertDescription>
            You have an active allocation in {allocation?.hostel?.name}. You can’t reserve another bed.
            <Button size="sm" className="mt-2" asChild>
              <Link to="/app/allocation">View my allocation</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const h = hostel.data

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/app/hostels">
          <ArrowLeft /> All hostels
        </Link>
      </Button>

      <PageHeader
        title={h?.name ?? 'Hostel'}
        description={h ? `${formatNaira(h.fee)} per session · ${h.stats?.available_beds ?? 0} beds available` : undefined}
        actions={h && <Badge variant={h.gender === 'female' ? 'accent' : 'default'} className="capitalize">{h.gender}</Badge>}
      />

      {application && (
        <Alert variant="warning" className="mb-6">
          <BedDouble />
          <AlertTitle>You’re changing your reserved bed</AlertTitle>
          <AlertDescription>
            You currently hold {application.hostel?.name} · Room {application.room?.room_number} ·{' '}
            {application.bed?.position}. Pick a new bed below to move — your old one is freed automatically.
          </AlertDescription>
        </Alert>
      )}

      <Stepper step={step} />

      {/* STEP: Floor */}
      {step === 'floor' && (
        <Section title="Select a floor" icon={Layers}>
          {floors.isLoading ? (
            <GridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {floors.data?.map((f) => (
                <ChoiceButton key={f.id} active={floor?.id === f.id} onClick={() => selectFloor(f)}>
                  <Layers className="size-5 text-primary" />
                  <span className="font-semibold">{f.label}</span>
                </ChoiceButton>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* STEP: Wing */}
      {step === 'wing' && (
        <Section
          title={`Select a wing — ${floor?.label}`}
          icon={DoorOpen}
          onBack={() => goTo('floor')}
        >
          {wings.isLoading ? (
            <GridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {wings.data?.map((w) => (
                <ChoiceButton key={w.id} active={wing?.id === w.id} onClick={() => selectWing(w)}>
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                    {w.letter}
                  </span>
                  <span className="font-medium">{w.label}</span>
                </ChoiceButton>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* STEP: Room */}
      {step === 'room' && (
        <Section
          title={`Select a room — ${floor?.label}, ${wing?.label}`}
          icon={DoorOpen}
          onBack={() => goTo('wing')}
        >
          {rooms.isLoading ? (
            <GridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {rooms.data?.map((r) => {
                const full = r.available_beds === 0
                return (
                  <button
                    key={r.id}
                    disabled={full}
                    onClick={() => selectRoom(r)}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all',
                      full
                        ? 'cursor-not-allowed border-border bg-muted/40 opacity-60'
                        : 'cursor-pointer border-border hover:border-primary hover:shadow-md',
                      room?.id === r.id && 'border-primary ring-2 ring-primary/30',
                    )}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="font-semibold">{r.room_number}</span>
                      <DoorOpen className="size-4 text-muted-foreground" />
                    </span>
                    <Badge variant={full ? 'destructive' : r.available_beds < r.capacity ? 'warning' : 'success'}>
                      {full ? 'Full' : `${r.available_beds}/${r.capacity} free`}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {/* STEP: Bed */}
      {step === 'bed' && (
        <Section
          title={`Pick your bed — Room ${room?.room_number}`}
          icon={BedDouble}
          onBack={() => goTo('room')}
        >
          <BedLegend />
          {beds.isLoading ? (
            <GridSkeleton />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {beds.data?.map((b) => {
                const mine = b.occupant_id === user?.id
                const selectable = b.status === 'available' || (b.status === 'reserved' && mine)
                const selected = bed?.id === b.id
                return (
                  <button
                    key={b.id}
                    disabled={!selectable || reserve.isPending}
                    onClick={() => setBed(b)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all',
                      b.status === 'available' && 'border-success/40 bg-success/5 hover:border-success hover:shadow-md cursor-pointer',
                      b.status === 'reserved' && !mine && 'cursor-not-allowed border-warning/40 bg-warning/5 opacity-70',
                      b.status === 'reserved' && mine && 'border-primary bg-primary/5 cursor-pointer',
                      b.status === 'occupied' && 'cursor-not-allowed border-destructive/30 bg-destructive/5 opacity-70',
                      selected && 'ring-2 ring-primary ring-offset-2',
                    )}
                  >
                    <BedDouble
                      className={cn(
                        'size-7',
                        b.status === 'available' && 'text-success',
                        b.status === 'reserved' && 'text-warning',
                        b.status === 'occupied' && 'text-destructive',
                        mine && 'text-primary',
                      )}
                    />
                    <span className="text-sm font-semibold">Bed {b.bed_number}</span>
                    <span className="text-center text-xs text-muted-foreground">{b.position}</span>
                    <Badge
                      variant={
                        mine ? 'default' : b.status === 'available' ? 'success' : b.status === 'reserved' ? 'warning' : 'destructive'
                      }
                    >
                      {mine ? 'Your hold' : b.status}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {/* Sticky reserve bar */}
      {step === 'bed' && bed && (
        <div className="sticky bottom-4 mt-6">
          <Card className="border-primary/40 shadow-lg">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <BedDouble className="size-5" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold">
                    {h?.name} · Room {room?.room_number} · Bed {bed.bed_number}
                  </p>
                  <p className="text-muted-foreground">{bed.position} · {formatNaira(h?.fee)}</p>
                </div>
              </div>
              <Button size="lg" onClick={() => reserve.mutate(bed)} disabled={reserve.isPending}>
                {reserve.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                Reserve & continue to payment
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  onBack,
  children,
}: {
  title: string
  icon: React.ElementType
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon className="size-5 text-primary" /> {title}
          </h2>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft /> Back
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 transition-all hover:border-primary hover:shadow-md cursor-pointer',
        active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
      )}
    >
      {children}
    </button>
  )
}

function BedLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {[
        { c: 'bg-success', l: 'Available' },
        { c: 'bg-warning', l: 'Reserved' },
        { c: 'bg-destructive', l: 'Occupied' },
      ].map((x) => (
        <span key={x.l} className="flex items-center gap-1.5">
          <span className={cn('size-3 rounded-full', x.c)} /> {x.l}
        </span>
      ))}
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
