import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import {
  getActiveSession,
  getMyAllocation,
  getMyApplication,
  getMyPayment,
  getMyReservedBed,
} from '@/lib/api'

/**
 * The student's whole hostel journey in one place: their open application,
 * confirmed allocation, current payment, any bed they're holding, and the
 * active session. Powers the dashboard, the "already reserved → edit instead of
 * book again" guard, and the payment/allocation pages.
 */
export function useJourney() {
  const { user } = useAuth()
  const uid = user?.id
  const qc = useQueryClient()

  const application = useQuery({
    queryKey: ['my-application', uid],
    queryFn: () => getMyApplication(uid!),
    enabled: !!uid,
  })

  const allocation = useQuery({
    queryKey: ['my-allocation', uid],
    queryFn: () => getMyAllocation(uid!),
    enabled: !!uid,
  })

  const reservedBed = useQuery({
    queryKey: ['my-bed', uid],
    queryFn: () => getMyReservedBed(uid!),
    enabled: !!uid,
  })

  const session = useQuery({ queryKey: ['active-session'], queryFn: getActiveSession })

  const payment = useQuery({
    queryKey: ['my-payment', application.data?.id],
    queryFn: () => getMyPayment(application.data!.id),
    enabled: !!application.data?.id,
  })

  const refetchAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['my-application', uid] })
    qc.invalidateQueries({ queryKey: ['my-allocation', uid] })
    qc.invalidateQueries({ queryKey: ['my-bed', uid] })
    qc.invalidateQueries({ queryKey: ['my-payment'] })
  }, [qc, uid])

  const isLoading = application.isLoading || allocation.isLoading || reservedBed.isLoading

  const hasAllocation = !!allocation.data
  const hasApplication = !!application.data
  const paymentDone = payment.data?.status === 'completed'

  return {
    application: application.data ?? null,
    allocation: allocation.data ?? null,
    reservedBed: reservedBed.data ?? null,
    payment: payment.data ?? null,
    session: session.data ?? null,
    isLoading,
    hasAllocation,
    hasApplication,
    paymentDone,
    /** Student may start a brand-new application only when none is in progress. */
    canStartNew: !hasAllocation && !hasApplication,
    refetchAll,
  }
}
