import { redirect } from "next/navigation";
import { getInvitePreview } from "@/server/tenancy/invites";
import { getCurrentUser } from "@/server/auth/session";
import { AcceptInviteForm } from "@/features/members/components/accept-invite-form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  const preview = await getInvitePreview(token);
  if (preview.status === "INVALID") return <Message text="This invite is invalid." />;
  if (preview.status === "EXPIRED") return <Message text="This invite has expired." />;
  return <main className="mx-auto max-w-[640px] px-5 py-20"><h1 className="font-heading text-4xl font-semibold">Join {preview.business.name}</h1><p className="mt-3 text-muted-foreground">Invite for {preview.email} as {preview.role}.</p><AcceptInviteForm token={token} /></main>;
}
function Message({ text }: { text: string }) { return <main className="mx-auto max-w-[640px] px-5 py-20"><p role="alert" className="text-destructive">{text}</p></main>; }
