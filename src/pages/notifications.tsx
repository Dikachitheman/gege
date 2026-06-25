import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationType } from '@/types'

const ICON: Record<NotificationType, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
}
const COLOR: Record<NotificationType, string> = {
  info: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  error: 'text-destructive bg-destructive/10',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !!user,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] })

  const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate })
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: invalidate,
  })

  const unread = data?.filter((n) => !n.is_read).length ?? 0

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'You’re all caught up.'}
        actions={
          unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((n) => {
            const Icon = ICON[n.type]
            const body = (
              <Card className={cn('transition-colors', !n.is_read && 'border-primary/30 bg-primary/[0.03]')}>
                <CardContent className="flex items-start gap-3 py-4">
                  <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg', COLOR[n.type])}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            )
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markOne.mutate(n.id)}
                className="cursor-pointer"
              >
                {n.link ? <Link to={n.link}>{body}</Link> : body}
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <p className="font-medium">No notifications yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              We’ll let you know here when your application, payment or allocation status changes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
