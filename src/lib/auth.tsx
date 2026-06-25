import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { TABLES } from '@/lib/tables'
import type { Profile, Gender, UserRole } from '@/types'

export interface SignUpInput {
  email: string
  password: string
  full_name: string
  matric_number: string
  gender: Gender
  faculty: string
  department: string
  level: string
  phone: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  role: UserRole | null
  isStaff: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

const STAFF_ROLES: UserRole[] = ['hostel_admin', 'finance_officer', 'super_admin']

/** Map Supabase auth errors to messages a student can actually act on. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email and password do not match. Please check and try again.'
  if (m.includes('email not confirmed'))
    return 'Email confirmation is still ON for this Supabase project. Turn it OFF in Authentication → Sign In / Providers → Email, then sign in again.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('password should be at least')) return 'Your password is too short — use at least 6 characters.'
  if (m.includes('unable to validate email')) return 'That email address looks invalid.'
  if (m.includes('for security purposes')) return 'Too many attempts. Please wait a moment and try again.'
  return message
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(true)

  const loadProfile = React.useCallback(async (userId: string) => {
    // Small retry: the profile row is created by a DB trigger and may lag a beat.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (data) {
        setProfile(data as Profile)
        return
      }
      if (error && error.code !== 'PGRST116') break
      await new Promise((r) => setTimeout(r, 400))
    }
    setProfile(null)
  }, [])

  React.useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => active && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(friendlyAuthError(error.message))
  }, [])

  const signUp = React.useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          full_name: input.full_name.trim(),
          matric_number: input.matric_number.trim(),
          gender: input.gender,
          faculty: input.faculty.trim(),
          department: input.department.trim(),
          level: input.level.trim(),
          phone: input.phone.trim(),
          role: 'student',
        },
      },
    })
    if (error) throw new Error(friendlyAuthError(error.message))

    // With email confirmation OFF, signUp returns a live session immediately.
    // If it didn't, try to sign in straight away (covers projects that just
    // toggled confirmation off).
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      })
      if (signInError) throw new Error(friendlyAuthError(signInError.message))
    }
  }, [])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = React.useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const role = profile?.role ?? null
  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    role,
    isStaff: !!role && STAFF_ROLES.includes(role),
    isAdmin: role === 'super_admin',
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
