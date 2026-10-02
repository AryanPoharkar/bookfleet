"use client";

import { useState, useTransition } from "react";
import { inviteMemberAction, changeRoleAction, removeMemberAction } from "@/features/members/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
};
type Invite = {
  id: string;
  email: string;
  role: "MANAGER" | "STAFF";
  expiresAt: string;
};

export function MembersManager({
  slug,
  members,
  invites,
}: {
  slug: string;
  members: Member[];
  invites: Invite[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  function run(
    action: (formData: FormData) => Promise<{ error?: string }>,
    formData: FormData,
  ) {
    setError("");
    start(async () => {
      const result = await action(formData);
      if (result.error) setError(result.error);
      else window.location.reload();
    });
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-xl font-semibold">Invite member</h2>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            const formData = new FormData(event.currentTarget);
            start(async () => {
              const result = await inviteMemberAction(slug, formData);
              if (result.error) setError(result.error);
              else if (result.token) {
                setInviteLink(`${window.location.origin}/invite/${result.token}`);
              }
            });
          }}
        >
          <Input name="email" type="email" placeholder="invitee@example.com" required />
          <select
            name="role"
            defaultValue="STAFF"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="STAFF">STAFF</option>
            <option value="MANAGER">MANAGER</option>
          </select>
          <Button disabled={pending}>Invite</Button>
        </form>
        {inviteLink && (
          <div className="mt-4 flex gap-2">
            <Input readOnly value={inviteLink} />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(inviteLink)}
            >
              Copy
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          STUB - replaced by email in chunk 13
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Team</h2>
        <div className="mt-4 divide-y rounded-lg border border-border bg-card">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium">{member.name ?? member.email}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex gap-2">
                <select
                  defaultValue={member.role}
                  onChange={(event) => {
                    const formData = new FormData();
                    formData.set("userId", member.userId);
                    formData.set("role", event.target.value);
                    run((data) => changeRoleAction(slug, data), formData);
                  }}
                  className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option>OWNER</option>
                  <option>MANAGER</option>
                  <option>STAFF</option>
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const formData = new FormData();
                    formData.set("userId", member.userId);
                    run((data) => removeMemberAction(slug, data), formData);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Pending invites</h2>
        <div className="mt-4 space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              {invite.email} · {invite.role}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
