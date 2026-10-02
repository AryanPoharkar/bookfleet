import { z } from "zod";
export const inviteMemberSchema = z.object({ email: z.email().trim().toLowerCase(), role: z.enum(["MANAGER", "STAFF"]) });
export const memberRoleSchema = z.object({ userId: z.string().min(1), role: z.enum(["OWNER", "MANAGER", "STAFF"]) });
export const removeMemberSchema = z.object({ userId: z.string().min(1) });
export const acceptInviteSchema = z.object({ token: z.string().min(1) });
