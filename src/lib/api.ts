import { supabase } from '@/lib/supabase'
import { TABLES, VIEWS, RPC } from '@/lib/tables'
import { shortRef } from '@/lib/utils'
import type {
  AcademicSession,
  AdminApplicationDetail,
  Allocation,
  AllocationDetail,
  Application,
  ApplicationDetail,
  BedSpace,
  Floor,
  Gender,
  Hostel,
  HostelAvailability,
  HostelWithStats,
  Notification,
  Payment,
  PaymentPlan,
  Room,
  RoomWithCounts,
  Wing,
} from '@/types'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---------------------------------------------------------------------------
// Sessions & settings
// ---------------------------------------------------------------------------
export async function getActiveSession(): Promise<AcademicSession | null> {
  const { data } = await supabase
    .from(TABLES.academicSessions)
    .select('*')
    .eq('is_active', true)
    .maybeSingle()
  return (data as AcademicSession) ?? null
}

// ---------------------------------------------------------------------------
// Hostels (+ live availability)
// ---------------------------------------------------------------------------
export async function getHostels(gender?: Gender | null): Promise<HostelWithStats[]> {
  let q = supabase.from(TABLES.hostels).select('*').order('code')
  if (gender) q = q.eq('gender', gender)
  const hostels = unwrap<Hostel[]>(await q)

  const stats = unwrap<HostelAvailability[]>(
    await supabase.from(VIEWS.hostelAvailability).select('*'),
  )
  const byId = new Map(stats.map((s) => [s.hostel_id, s]))
  return hostels.map((h) => ({ ...h, stats: byId.get(h.id) }))
}

export async function getHostel(id: string): Promise<HostelWithStats> {
  const hostel = unwrap<Hostel>(
    await supabase.from(TABLES.hostels).select('*').eq('id', id).single(),
  )
  const { data: stat } = await supabase
    .from(VIEWS.hostelAvailability)
    .select('*')
    .eq('hostel_id', id)
    .maybeSingle()
  return { ...hostel, stats: (stat as HostelAvailability) ?? undefined }
}

// ---------------------------------------------------------------------------
// Floors -> Wings -> Rooms -> Beds
// ---------------------------------------------------------------------------
export async function getFloors(hostelId: string): Promise<Floor[]> {
  return unwrap<Floor[]>(
    await supabase.from(TABLES.floors).select('*').eq('hostel_id', hostelId).order('number'),
  )
}

export async function getWings(floorId: string): Promise<Wing[]> {
  return unwrap<Wing[]>(
    await supabase.from(TABLES.wings).select('*').eq('floor_id', floorId).order('letter'),
  )
}

export async function getRooms(wingId: string): Promise<RoomWithCounts[]> {
  const rooms = unwrap<Room[]>(
    await supabase.from(TABLES.rooms).select('*').eq('wing_id', wingId).order('room_number'),
  )
  if (rooms.length === 0) return []
  type RoomCount = {
    room_id: string
    capacity: number
    available_beds: number
    occupied_beds: number
    reserved_beds: number
  }
  const counts = unwrap<RoomCount[]>(
    await supabase
      .from(VIEWS.roomAvailability)
      .select('*')
      .in('room_id', rooms.map((r) => r.id)),
  )
  const byId = new Map(counts.map((c) => [c.room_id, c]))
  return rooms.map((r) => {
    const c = byId.get(r.id)
    return {
      ...r,
      available_beds: c?.available_beds ?? 0,
      occupied_beds: c?.occupied_beds ?? 0,
      reserved_beds: c?.reserved_beds ?? 0,
    }
  })
}

export async function getBeds(roomId: string): Promise<BedSpace[]> {
  return unwrap<BedSpace[]>(
    await supabase.from(TABLES.bedSpaces).select('*').eq('room_id', roomId).order('bed_number'),
  )
}

export async function getBed(bedId: string): Promise<BedSpace> {
  return unwrap<BedSpace>(await supabase.from(TABLES.bedSpaces).select('*').eq('id', bedId).single())
}

/** The bed this student is currently holding (reserved) but not yet allocated. */
export async function getMyReservedBed(userId: string): Promise<BedSpace | null> {
  const { data } = await supabase
    .from(TABLES.bedSpaces)
    .select('*')
    .eq('occupant_id', userId)
    .maybeSingle()
  return (data as BedSpace) ?? null
}

export async function reserveBed(bedId: string): Promise<BedSpace> {
  const { data, error } = await supabase.rpc(RPC.reserveBed, { p_bed_id: bedId })
  if (error) throw new Error(error.message)
  return data as BedSpace
}

export async function releaseMyBed(): Promise<void> {
  const { error } = await supabase.rpc(RPC.releaseMyBed)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
const APPLICATION_SELECT = `*, hostel:${TABLES.hostels}(id,name,code,fee,gender), room:${TABLES.rooms}(id,room_number), bed:${TABLES.bedSpaces}(id,bed_number,position)`

export async function getMyApplication(userId: string): Promise<ApplicationDetail | null> {
  const { data, error } = await supabase
    .from(TABLES.applications)
    .select(APPLICATION_SELECT)
    .eq('profile_id', userId)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as ApplicationDetail) ?? null
}

export async function createApplication(input: {
  profileId: string
  hostelId: string
  roomId: string
  bedId: string
  sessionId: string | null
}): Promise<Application> {
  return unwrap<Application>(
    await supabase
      .from(TABLES.applications)
      .insert({
        profile_id: input.profileId,
        hostel_id: input.hostelId,
        room_id: input.roomId,
        bed_id: input.bedId,
        session_id: input.sessionId,
      })
      .select()
      .single(),
  )
}

/**
 * Create a new application, or (edit mode) point the student's existing open
 * application at a newly chosen hostel/room/bed. Used by the booking wizard so
 * a student can change their bed instead of creating a second application.
 */
export async function upsertApplicationSelection(input: {
  existingId?: string | null
  profileId: string
  hostelId: string
  roomId: string
  bedId: string
  sessionId: string | null
}): Promise<Application> {
  if (input.existingId) {
    return unwrap<Application>(
      await supabase
        .from(TABLES.applications)
        .update({
          hostel_id: input.hostelId,
          room_id: input.roomId,
          bed_id: input.bedId,
          status: 'pending',
        })
        .eq('id', input.existingId)
        .select()
        .single(),
    )
  }
  return createApplication({
    profileId: input.profileId,
    hostelId: input.hostelId,
    roomId: input.roomId,
    bedId: input.bedId,
    sessionId: input.sessionId,
  })
}

export async function cancelApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.applications)
    .update({ status: 'cancelled' })
    .eq('id', applicationId)
  if (error) throw new Error(error.message)
  await releaseMyBed()
}

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------
const ALLOCATION_SELECT = `*, hostel:${TABLES.hostels}(id,name,code), room:${TABLES.rooms}(id,room_number), bed:${TABLES.bedSpaces}(id,bed_number,position)`

export async function getMyAllocation(userId: string): Promise<AllocationDetail | null> {
  const { data, error } = await supabase
    .from(TABLES.allocations)
    .select(ALLOCATION_SELECT)
    .eq('profile_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as AllocationDetail) ?? null
}

export async function finalizeMyAllocation(applicationId: string): Promise<Allocation> {
  const { data, error } = await supabase.rpc(RPC.finalizeMyAllocation, {
    p_application_id: applicationId,
  })
  if (error) throw new Error(error.message)
  return data as Allocation
}

// ---------------------------------------------------------------------------
// Payments (SIMULATED — no external provider)
// ---------------------------------------------------------------------------
export async function getMyPayment(applicationId: string): Promise<Payment | null> {
  const { data } = await supabase
    .from(TABLES.payments)
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Payment) ?? null
}

export async function simulatePayment(input: {
  profileId: string
  applicationId: string
  amountDue: number
  plan: PaymentPlan
  amountThisTime: number
  existingPayment?: Payment | null
}): Promise<Payment> {
  const reference = shortRef('PAY')
  const transactionId = shortRef('TXN')

  const alreadyPaid = input.existingPayment?.amount_paid ?? 0
  const amountPaid = Math.min(alreadyPaid + input.amountThisTime, input.amountDue)
  const status = amountPaid >= input.amountDue ? 'completed' : 'partial'

  let payment: Payment
  if (input.existingPayment) {
    payment = unwrap<Payment>(
      await supabase
        .from(TABLES.payments)
        .update({ amount_paid: amountPaid, status, transaction_id: transactionId })
        .eq('id', input.existingPayment.id)
        .select()
        .single(),
    )
  } else {
    payment = unwrap<Payment>(
      await supabase
        .from(TABLES.payments)
        .insert({
          profile_id: input.profileId,
          application_id: input.applicationId,
          amount_due: input.amountDue,
          amount_paid: amountPaid,
          plan: input.plan,
          method: 'simulated',
          reference,
          transaction_id: transactionId,
          status,
        })
        .select()
        .single(),
    )
  }

  // Record the installment line.
  const seq =
    (
      await supabase
        .from(TABLES.paymentInstallments)
        .select('id', { count: 'exact', head: true })
        .eq('payment_id', payment.id)
    ).count ?? 0
  await supabase.from(TABLES.paymentInstallments).insert({
    payment_id: payment.id,
    sequence: seq + 1,
    amount: input.amountThisTime,
    reference,
  })

  // Fully paid -> confirm the allocation (admin approval UI is deferred).
  if (status === 'completed') {
    await finalizeMyAllocation(input.applicationId)
  }

  return payment
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function getNotifications(userId: string): Promise<Notification[]> {
  return unwrap<Notification[]>(
    await supabase
      .from(TABLES.notifications)
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  )
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from(TABLES.notifications).update({ is_read: true }).eq('id', id)
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
const ADMIN_APPLICATION_SELECT = `*, profile:${TABLES.profiles}(id,full_name,matric_number,email,gender,faculty,department,level,phone), hostel:${TABLES.hostels}(id,name,code,fee,gender), room:${TABLES.rooms}(id,room_number), bed:${TABLES.bedSpaces}(id,bed_number,position)`

export async function getAdminApplications(): Promise<AdminApplicationDetail[]> {
  const { data, error } = await supabase
    .from(TABLES.applications)
    .select(ADMIN_APPLICATION_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown as AdminApplicationDetail[]) ?? []
}

export async function adminApproveApplication(applicationId: string): Promise<void> {
  const { error } = await supabase.rpc(RPC.approveApplication, { p_application_id: applicationId })
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from(TABLES.notifications)
    .update({ is_read: true })
    .eq('profile_id', userId)
    .eq('is_read', false)
}

export async function updateProfile(
  userId: string,
  patch: Partial<{
    full_name: string
    matric_number: string
    gender: Gender
    faculty: string
    department: string
    level: string
    phone: string
  }>,
): Promise<void> {
  const { error } = await supabase.from(TABLES.profiles).update(patch).eq('id', userId)
  if (error) throw new Error(error.message)
}
