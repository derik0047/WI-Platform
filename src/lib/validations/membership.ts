import { z } from "zod";

/** Roles that can be assigned to a member or offered in an invitation. */
export const assignableRoleSchema = z.enum(["admin", "member"]);

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  role: assignableRoleSchema,
});

export const changeMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: assignableRoleSchema,
});

export const memberIdSchema = z.object({
  userId: z.string().uuid(),
});

export const transferOwnershipSchema = z.object({
  userId: z.string().uuid(),
});

export const invitationTokenSchema = z.object({
  token: z.string().min(1),
});

export const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type AssignableRole = z.infer<typeof assignableRoleSchema>;
