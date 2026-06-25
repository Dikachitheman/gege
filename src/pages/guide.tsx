import { Link } from 'react-router-dom'
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  KeyRound,
  ListChecks,
  MousePointerClick,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
      <span>{children}</span>
    </li>
  )
}

function GuideCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: React.ElementType
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          {title}
          {badge && <Badge variant="accent" className="ml-auto">{badge}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        title="How to use this app"
        description="A simple, step-by-step guide to every feature."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GuideCard icon={UserPlus} title="1. Create your account" badge="Start here">
          <ul className="space-y-2 text-sm">
            <Step>Click <strong>Apply Now</strong> on the home page (or <strong>Create an account</strong> on the sign-in page).</Step>
            <Step>Fill in your details. Every field marked with a red <span className="text-destructive">*</span> is required.</Step>
            <Step>Your <strong>gender</strong> decides which hostels you can apply to — pick carefully.</Step>
            <Step>Click <strong>Create account</strong>. You’re signed in right away (no email to confirm).</Step>
          </ul>
          <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="mb-1 font-medium">Sample details you can use:</p>
            <ul className="text-muted-foreground">
              <li>Name: Jane Doe · Matric: UG/2021/4567</li>
              <li>Email: jane.demo@example.com · Password: password123</li>
              <li>Gender: Female · Faculty: Science · Dept: Computer Science · Level: 300</li>
            </ul>
          </div>
        </GuideCard>

        <GuideCard icon={Building2} title="2. Find a hostel">
          <ul className="space-y-2 text-sm">
            <Step>Open <Link to="/app/hostels" className="text-primary hover:underline">Browse Hostels</Link> from the sidebar.</Step>
            <Step>You’ll only see hostels for your gender (female: NDDC, A, B, C, D, H · male: E, F, G).</Step>
            <Step>Each card shows the fee and how many beds are free. <strong>Click any card</strong> to open it.</Step>
          </ul>
        </GuideCard>

        <GuideCard icon={MousePointerClick} title="3. Pick your bed space">
          <ul className="space-y-2 text-sm">
            <Step>Choose a <strong>Floor</strong>, then a <strong>Wing</strong> (A–E), then a <strong>Room</strong>.</Step>
            <Step>Use the <strong>Back</strong> button at any step to change an earlier choice.</Step>
            <Step>On the bed map: <span className="text-success font-medium">green</span> = free, <span className="text-warning font-medium">yellow</span> = reserved, <span className="text-destructive font-medium">red</span> = taken.</Step>
            <Step>Click a green bed, then <strong>Reserve &amp; continue to payment</strong>.</Step>
          </ul>
        </GuideCard>

        <GuideCard icon={CreditCard} title="4. Make payment">
          <ul className="space-y-2 text-sm">
            <Step>Pick <strong>Pay in full</strong> or <strong>Pay by installment</strong> (at least 50% first).</Step>
            <Step>Payments here are <strong>simulated</strong> — no real card or money is needed.</Step>
            <Step>Click <strong>Pay</strong>. When the fee is fully paid, your bed is confirmed instantly.</Step>
          </ul>
        </GuideCard>

        <GuideCard icon={KeyRound} title="5. See your allocation">
          <ul className="space-y-2 text-sm">
            <Step>Open <Link to="/app/allocation" className="text-primary hover:underline">My Allocation</Link> to view your confirmed hostel, room and bed.</Step>
            <Step>Use the <strong>Print</strong> button to print your allocation slip.</Step>
            <Step>You can’t book a second bed — the app shows your current one instead.</Step>
          </ul>
        </GuideCard>

        <GuideCard icon={ListChecks} title="6. Track everything on your dashboard">
          <ul className="space-y-2 text-sm">
            <Step>The <Link to="/app" className="text-primary hover:underline">Dashboard</Link> shows your hostel, application, payment and balance at a glance.</Step>
            <Step>The <strong>timeline</strong> shows how far along you are.</Step>
            <Step>Want a different bed? Click <strong>Edit selection</strong> to change it (before allocation).</Step>
          </ul>
        </GuideCard>

        <GuideCard icon={Bell} title="7. Notifications & profile">
          <ul className="space-y-2 text-sm">
            <Step>The <Link to="/app/notifications" className="text-primary hover:underline">bell</Link> tells you when your status changes.</Step>
            <Step>Update your details any time on the <Link to="/app/profile" className="text-primary hover:underline">Profile</Link> page.</Step>
            <Step>Use the moon/sun button in the top bar to switch <strong>dark mode</strong> on or off.</Step>
          </ul>
        </GuideCard>
      </div>
    </div>
  )
}
