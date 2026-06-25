import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { updateProfile } from '@/lib/api'
import { FACULTIES, GENDERS, LEVELS } from '@/lib/constants'
import { initials } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  full_name: z.string().trim().min(3, 'Enter your full name.'),
  matric_number: z.string().trim().min(3, 'Enter your matric number.'),
  gender: z.enum(['female', 'male'], { message: 'Select your gender.' }),
  faculty: z.string().min(1, 'Select your faculty.'),
  department: z.string().trim().min(2, 'Enter your department.'),
  level: z.string().min(1, 'Select your level.'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number.')
    .regex(/^[0-9+\-\s]+$/, 'Phone number can only contain digits, +, - and spaces.'),
})

type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [genderLocked] = useState(!!profile?.gender)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      matric_number: profile?.matric_number ?? '',
      gender: (profile?.gender as 'female' | 'male') ?? undefined,
      faculty: profile?.faculty ?? '',
      department: profile?.department ?? '',
      level: profile?.level ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => updateProfile(user!.id, values),
    onSuccess: async () => {
      await refreshProfile()
      toast.success('Profile updated.')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update profile.'),
  })

  return (
    <div>
      <PageHeader title="My profile" description="Keep your details up to date." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Avatar className="size-20">
              <AvatarFallback className="text-2xl">{initials(profile?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            {genderLocked && (
              <Alert variant="info" className="mb-5">
                <Lock />
                <AlertTitle>Gender can’t be changed here</AlertTitle>
                <AlertDescription>
                  Your gender decides your eligible hostels and is locked once set. Contact the hostel
                  office if it’s wrong.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message} className="sm:col-span-2">
                <Input id="full_name" aria-invalid={!!errors.full_name} {...register('full_name')} />
              </Field>

              <Field label="Email" className="sm:col-span-2">
                <Input value={profile?.email ?? ''} disabled />
              </Field>

              <Field label="Matric number" htmlFor="matric_number" error={errors.matric_number?.message}>
                <Input id="matric_number" aria-invalid={!!errors.matric_number} {...register('matric_number')} />
              </Field>

              <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" aria-invalid={!!errors.phone} {...register('phone')} />
              </Field>

              <Field label="Gender" error={errors.gender?.message}>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={genderLocked}>
                      <SelectTrigger aria-invalid={!!errors.gender}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Level" error={errors.level?.message}>
                <Controller
                  control={control}
                  name="level"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.level}>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l} Level
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Faculty" error={errors.faculty?.message}>
                <Controller
                  control={control}
                  name="faculty"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={!!errors.faculty}>
                        <SelectValue placeholder="Select faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTIES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Department" htmlFor="department" error={errors.department?.message}>
                <Input id="department" aria-invalid={!!errors.department} {...register('department')} />
              </Field>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting || save.isPending || !isDirty}>
                  {(isSubmitting || save.isPending) && <Loader2 className="animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
