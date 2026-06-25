export const APP_NAME = import.meta.env.VITE_APP_NAME || 'RSU Hostel Allocation System'
export const UNIVERSITY = 'Rivers State University'

export const FACULTIES = [
  'Agriculture',
  'Education',
  'Engineering',
  'Environmental Sciences',
  'Humanities',
  'Law',
  'Management Sciences',
  'Medical Sciences',
  'Science',
  'Social Sciences',
] as const

export const LEVELS = ['100', '200', '300', '400', '500', '600'] as const

export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
] as const
