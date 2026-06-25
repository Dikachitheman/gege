import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CheckCircle2, Clock, DoorOpen, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useJourney } from '@/hooks/use-journey'
import { getHostels } from '@/lib/api'
import { formatNaira } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function HostelsPage() {
  const { profile } = useAuth()
  const gender = profile?.gender ?? null
  const { hasApplication, hasAllocation, application, allocation } = useJourney()

  const { data: hostels, isLoading } = useQuery({
    queryKey: ['hostels', gender],
    queryFn: () => getHostels(gender),
    enabled: !!profile,
  })

  return (
    <div>
      <PageHeader
        title="Browse hostels"
        description={
          gender
            ? `Showing ${gender} hostels you’re eligible to apply to.`
            : 'Set your gender in your profile to see the hostels you can apply to.'
        }
      />

      {/* Guard: already allocated */}
      {hasAllocation && (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 />
          <AlertTitle>You already have an allocation</AlertTitle>
          <AlertDescription>
            You’re allocated to {allocation?.hostel?.name} · Room {allocation?.room?.room_number}. You
            can’t book another bed.
            <Button size="sm" className="mt-2" asChild>
              <Link to="/app/allocation">View my allocation</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Guard: reservation in progress */}
      {!hasAllocation && hasApplication && (
        <Alert variant="warning" className="mb-6">
          <Clock />
          <AlertTitle>You have a bed reserved</AlertTitle>
          <AlertDescription>
            You reserved a bed in <strong>{application?.hostel?.name}</strong> (Room{' '}
            {application?.room?.room_number} · {application?.bed?.position}). Continue to payment, or
            open that hostel to change your bed.
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/app/payment">Continue to payment</Link>
              </Button>
              {application?.hostel?.id && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/app/hostels/${application.hostel.id}`}>Change my bed</Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!gender && (
        <Alert variant="info" className="mb-6">
          <Info />
          <AlertTitle>Add your gender first</AlertTitle>
          <AlertDescription>
            Female and male hostels are kept separate.{' '}
            <Link to="/app/profile" className="font-medium text-primary hover:underline">
              Update your profile
            </Link>{' '}
            to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Hostel grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}

        {hostels?.map((h) => {
          const available = h.stats?.available_beds ?? 0
          const locked = hasAllocation
          const inner = (
            <>
                <div className="relative h-40 w-full overflow-hidden">
                  <img src={h.image_url ?? ''} alt={h.name} className="size-full object-cover" loading="lazy" />
                  <Badge
                    variant={h.gender === 'female' ? 'accent' : 'default'}
                    className="absolute left-3 top-3 capitalize shadow"
                  >
                    {h.gender}
                  </Badge>
                  <Badge
                    variant={available > 0 ? 'success' : 'destructive'}
                    className="absolute right-3 top-3 shadow"
                  >
                    {available > 0 ? `${available} free` : 'Full'}
                  </Badge>
                </div>
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{h.name}</h3>
                    <span className="font-semibold text-primary">{formatNaira(h.fee)}</span>
                  </div>
                  {h.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble className="size-4" /> {h.stats?.total_beds ?? 0} beds
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <DoorOpen className="size-4" /> {h.stats?.total_rooms ?? 0} rooms
                    </span>
                  </div>
                  {h.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {h.amenities.slice(0, 3).map((a) => (
                        <Badge key={a} variant="outline" className="font-normal">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {!locked && (
                    <div className="flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                      Select hostel <ArrowRight className="size-4" />
                    </div>
                  )}
                </CardContent>
            </>
          )
          return (
            <Card key={h.id} className="overflow-hidden p-0 transition-shadow hover:shadow-lg">
              {locked ? (
                <div className="block">{inner}</div>
              ) : (
                <Link to={`/app/hostels/${h.id}`} className="block focus:outline-none">
                  {inner}
                </Link>
              )}
            </Card>
          )
        })}
      </div>

      {hostels && hostels.length === 0 && !isLoading && (
        <p className="py-12 text-center text-muted-foreground">No hostels available for your profile yet.</p>
      )}
    </div>
  )
}
