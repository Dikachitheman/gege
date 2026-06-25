import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { FACULTIES, GENDERS, LEVELS, UNIVERSITY } from '@/lib/constants'
import { Logo } from '@/components/brand'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z
  .object({
    full_name: z.string().trim().min(3, 'Enter your full name (at least 3 characters).'),
    matric_number: z.string().trim().min(3, 'Enter your matric number, e.g. UG/2021/1234.'),
    email: z.email('Enter a valid email address, e.g. name@example.com.'),
    gender: z.enum(['female', 'male'], { message: 'Select your gender.' }),
    faculty: z.string().min(1, 'Select your faculty.'),
    department: z.string().trim().min(2, 'Enter your department.'),
    level: z.string().min(1, 'Select your level.'),
    phone: z
      .string()
      .trim()
      .min(7, 'Enter a valid phone number.')
      .regex(/^[0-9+\-\s]+$/, 'Phone number can only contain digits, +, - and spaces.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirm: z.string().min(1, 'Re-enter your password to confirm.'),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match.',
  })

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      matric_number: '',
      email: '',
      faculty: '',
      department: '',
      level: '',
      phone: '',
      password: '',
      confirm: '',
    },
  })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      await signUp({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        matric_number: values.matric_number,
        gender: values.gender,
        faculty: values.faculty,
        department: values.department,
        level: values.level,
        phone: values.phone,
      })
      navigate('/app', { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-svh bg-grid">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft /> Home
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create your student account</CardTitle>
            <CardDescription>
              Register to apply for hostel accommodation at {UNIVERSITY}. Fields marked
              <span className="text-destructive"> *</span> are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle />
                <AlertTitle>We couldn't create your account</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Full name" htmlFor="full_name" required error={errors.full_name?.message} className="sm:col-span-2">
                <Input id="full_name" placeholder="John Doe" aria-invalid={!!errors.full_name} {...register('full_name')} />
              </Field>

              <Field label="Matric number" htmlFor="matric_number" required error={errors.matric_number?.message}>
                <Input id="matric_number" placeholder="UG/2021/1234" aria-invalid={!!errors.matric_number} {...register('matric_number')} />
              </Field>

              <Field label="Phone number" htmlFor="phone" required error={errors.phone?.message}>
                <Input id="phone" placeholder="080 1234 5678" aria-invalid={!!errors.phone} {...register('phone')} />
              </Field>

              <Field label="Email address" htmlFor="email" required error={errors.email?.message} className="sm:col-span-2">
                <Input id="email" type="email" placeholder="name@example.com" aria-invalid={!!errors.email} {...register('email')} />
              </Field>

              <Field label="Gender" required error={errors.gender?.message} hint="This decides which hostels you can apply to.">
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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

              <Field label="Level" required error={errors.level?.message}>
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

              <Field label="Faculty" required error={errors.faculty?.message}>
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

              <Field label="Department" htmlFor="department" required error={errors.department?.message}>
                <Input id="department" placeholder="Computer Science" aria-invalid={!!errors.department} {...register('department')} />
              </Field>

              <Field label="Password" htmlFor="password" required error={errors.password?.message}>
                <Input id="password" type="password" placeholder="At least 6 characters" aria-invalid={!!errors.password} {...register('password')} />
              </Field>

              <Field label="Confirm password" htmlFor="confirm" required error={errors.confirm?.message}>
                <Input id="confirm" type="password" placeholder="Re-enter password" aria-invalid={!!errors.confirm} {...register('confirm')} />
              </Field>

              <Button type="submit" size="lg" className="mt-2 sm:col-span-2" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
