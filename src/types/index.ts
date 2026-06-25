// Domain types — mirror the Supabase schema (see supabase/migrations).

export type UserRole = 'student' | 'hostel_admin' | 'finance_officer' | 'super_admin'
export type Gender = 'male' | 'female'
export type RoomStatus = 'available' | 'reserved' | 'occupied' | 'maintenance'
export type BedStatus = 'available' | 'reserved' | 'occupied'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type AllocationStatus = 'active' | 'released'
export type PaymentStatus = 'pending' | 'partial' | 'completed' | 'failed'
export type PaymentPlan = 'full' | 'installment'
export type ComplaintStatus = 'open' | 'under_review' | 'resolved' | 'closed'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Profile {
  id: string
  full_name: string
  matric_number: string | null
  email: string
  gender: Gender | null
  faculty: string | null
  department: string | null
  level: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Hostel {
  id: string
  name: string
  code: string
  gender: Gender
  description: string | null
  fee: number
  amenities: string[]
  image_url: string | null
  created_at: string
}

export interface HostelAvailability {
  hostel_id: string
  total_beds: number
  available_beds: number
  reserved_beds: number
  occupied_beds: number
  total_rooms: number
}

/** Hostel joined with its live availability counts (used on cards). */
export type HostelWithStats = Hostel & { stats?: HostelAvailability }

export interface Floor {
  id: string
  hostel_id: string
  number: number
  label: string
  created_at: string
}

export interface Wing {
  id: string
  hostel_id: string
  floor_id: string
  letter: string
  label: string
  created_at: string
}

export interface Room {
  id: string
  hostel_id: string
  floor_id: string
  wing_id: string
  room_number: string
  capacity: number
  status: RoomStatus
  created_at: string
}

export type RoomWithCounts = Room & {
  available_beds: number
  occupied_beds: number
  reserved_beds: number
}

export interface BedSpace {
  id: string
  hostel_id: string
  room_id: string
  bed_number: number
  position: string
  status: BedStatus
  occupant_id: string | null
  reserved_at: string | null
  created_at: string
}

export interface Application {
  id: string
  profile_id: string
  hostel_id: string
  room_id: string
  bed_id: string
  session_id: string | null
  status: ApplicationStatus
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface Allocation {
  id: string
  application_id: string
  profile_id: string
  hostel_id: string
  room_id: string
  bed_id: string
  session_id: string | null
  letter_ref: string
  qr_payload: string
  status: AllocationStatus
  allocated_at: string
}

export interface Payment {
  id: string
  profile_id: string
  application_id: string | null
  amount_due: number
  amount_paid: number
  plan: PaymentPlan
  method: string
  reference: string
  transaction_id: string | null
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface PaymentInstallment {
  id: string
  payment_id: string
  sequence: number
  amount: number
  reference: string
  paid_at: string
}

export interface Notification {
  id: string
  profile_id: string
  title: string
  body: string | null
  type: NotificationType
  link: string | null
  is_read: boolean
  created_at: string
}

export interface AcademicSession {
  id: string
  name: string
  is_active: boolean
  starts_on: string | null
  ends_on: string | null
  created_at: string
}

/** Rich view of the current student's application (joined). */
export interface ApplicationDetail extends Application {
  hostel: Pick<Hostel, 'id' | 'name' | 'code' | 'fee' | 'gender'> | null
  room: Pick<Room, 'id' | 'room_number'> | null
  bed: Pick<BedSpace, 'id' | 'bed_number' | 'position'> | null
}


export interface AllocationDetail extends Allocation {
  hostel: Pick<Hostel, 'id' | 'name' | 'code'> | null
  room: Pick<Room, 'id' | 'room_number'> | null
  bed: Pick<BedSpace, 'id' | 'bed_number' | 'position'> | null
}
