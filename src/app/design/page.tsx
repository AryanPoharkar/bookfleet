"use client";

// TEMPORARY - delete in chunk 17
import { useState } from "react";
import { CalendarDaysIcon, CheckIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { Footer } from "@/components/layout/footer";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeading } from "@/components/layout/section-heading";

const swatches = [
  ["Background", "#FBF9F6", "bg-background"],
  ["Foreground", "#1B1A17", "bg-foreground"],
  ["Primary", "#1F5F4F", "bg-primary"],
  ["Accent", "#D9822B", "bg-accent"],
  ["Muted", "#F3EFE8", "bg-muted"],
  ["Muted text", "#6B665C", "bg-muted-foreground"],
  ["Border", "#E0DACF", "bg-border"],
  ["Destructive", "#C62828", "bg-destructive"],
] as const;

export default function DesignPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Container className="space-y-16 py-12 sm:py-16">
          <PageHeader
            eyebrow="Temporary design system"
            title="Bookfleet design system"
            description="The working visual language for the product: warm surfaces, pine actions, amber accents, and editorial typography."
            actions={<Button variant="accent"><PlusIcon />Add sample</Button>}
          />

          <section className="space-y-6">
            <SectionHeading title="Colour tokens" description="Core light-theme tokens used throughout the interface." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {swatches.map(([name, value, className]) => (
                <div key={name} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className={`h-20 ${className}`} />
                  <div className="space-y-1 p-4">
                    <p className="text-small font-medium">{name}</p>
                    <p className="font-mono text-caption text-muted-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading title="Type scale" description="Seven named sizes for headings, body copy, and supporting text." />
            <div className="space-y-5 rounded-lg border border-border bg-card p-6">
              <p className="text-display">Display — 3.5rem</p>
              <p className="text-h1">Heading 1 — 2.5rem</p>
              <p className="text-h2">Heading 2 — 1.875rem</p>
              <p className="text-h3">Heading 3 — 1.375rem</p>
              <p className="text-body">Body — 1rem. Clear, comfortable copy for everyday product interfaces.</p>
              <p className="text-small">Small — 0.875rem. Supporting labels and secondary information.</p>
              <p className="text-caption">Caption — 0.75rem. Compact metadata and utility text.</p>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeading title="Buttons" description="Primary actions, accents, secondary actions, and destructive actions." />
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm"><CheckIcon />Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-6">
              <SectionHeading title="Input & badges" description="Controls with the shared 2px pine focus treatment." />
              <div className="space-y-4 rounded-lg border border-border bg-card p-6">
                <Input placeholder="Your booking name" aria-label="Your booking name" />
                <div className="flex flex-wrap gap-2">
                  <Badge>Confirmed</Badge>
                  <Badge variant="accent">New</Badge>
                  <Badge variant="outline">Pending</Badge>
                  <Badge variant="ghost">Draft</Badge>
                  <Badge variant="destructive">Cancelled</Badge>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Booking summary</CardTitle>
                <CardDescription>A small example of the shared card treatment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                  <CalendarDaysIcon className="size-5 text-primary" />
                  <div>
                    <p className="text-small font-medium">Wednesday, 14 October</p>
                    <p className="text-caption text-muted-foreground">10:30 AM · 2 guests</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3">
                <Badge>Confirmed</Badge>
                <Button variant="outline" size="sm">View booking</Button>
              </CardFooter>
            </Card>
          </section>

          <section className="space-y-6">
            <SectionHeading title="Dialog" description="Overlay uses a 40% foreground tint with no backdrop blur." />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm your sample</DialogTitle>
                  <DialogDescription>This demonstrates the standard dialog surface and actions.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <section className="space-y-6">
            <SectionHeading title="Shared layout components" description="Reusable page structure for product screens." />
            <div className="space-y-8">
              <PageHeader
                eyebrow="Example page"
                title="Appointments"
                description="Keep the page introduction focused and leave room for contextual actions."
                actions={<Button>New appointment</Button>}
              />
              <SectionHeading title="Upcoming appointments" description="A compact section heading with an optional action." action={<Button variant="ghost" size="sm">See all</Button>} />
              <EmptyState
                icon={FileTextIcon}
                title="No appointments yet"
                description="Create your first appointment to see it appear here."
                action={<Button><PlusIcon />Create appointment</Button>}
              />
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
