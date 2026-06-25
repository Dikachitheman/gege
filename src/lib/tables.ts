/**
 * Central registry of every database table / view / RPC name the app touches.
 *
 * If the live Supabase tables use a prefix (e.g. `gege_hostels`) or a custom
 * schema, you only change things HERE — never across the app.
 *
 *   - Name prefix:  set PREFIX = 'gege_'
 *   - Hyphen names: set PREFIX = 'gege-'
 *   - Separate schema: set SCHEMA = 'gege' and use db()/from helpers
 */
export const PREFIX = ''

const t = (name: string) => `${PREFIX}${name}`

export const TABLES = {
  profiles: t('profiles'),
  hostels: t('hostels'),
  floors: t('floors'),
  wings: t('wings'),
  rooms: t('rooms'),
  bedSpaces: t('bed_spaces'),
  applications: t('applications'),
  allocations: t('allocations'),
  payments: t('payments'),
  paymentInstallments: t('payment_installments'),
  complaints: t('complaints'),
  notifications: t('notifications'),
  auditLogs: t('audit_logs'),
  academicSessions: t('academic_sessions'),
  settings: t('settings'),
} as const

export const VIEWS = {
  hostelAvailability: t('hostel_availability'),
  roomAvailability: t('room_availability'),
} as const

/** RPC (Postgres function) names. */
export const RPC = {
  reserveBed: 'reserve_bed',
  releaseMyBed: 'release_my_bed',
  finalizeMyAllocation: 'finalize_my_allocation',
  approveApplication: 'approve_application',
} as const
