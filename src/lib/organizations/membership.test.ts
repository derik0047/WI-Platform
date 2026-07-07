import { describe, expect, it } from "vitest";

import {
  canChangeMemberRole,
  canRemoveMember,
  canTransferOwnership,
  isManagerRole,
} from "./membership";

const owner = { userId: "owner", role: "owner" as const };
const admin = { userId: "admin", role: "admin" as const };
const member = { userId: "member", role: "member" as const };
const otherMember = { userId: "member-2", role: "member" as const };

describe("isManagerRole", () => {
  it("treats owner and admin as managers", () => {
    expect(isManagerRole("owner")).toBe(true);
    expect(isManagerRole("admin")).toBe(true);
    expect(isManagerRole("member")).toBe(false);
  });
});

describe("canChangeMemberRole", () => {
  it("lets a manager change a non-owner member", () => {
    expect(canChangeMemberRole(owner, member)).toBe(true);
    expect(canChangeMemberRole(admin, member)).toBe(true);
  });

  it("never changes the owner's role", () => {
    expect(canChangeMemberRole(admin, owner)).toBe(false);
  });

  it("forbids changing your own role", () => {
    expect(canChangeMemberRole(admin, admin)).toBe(false);
  });

  it("forbids plain members", () => {
    expect(canChangeMemberRole(member, otherMember)).toBe(false);
  });
});

describe("canRemoveMember", () => {
  it("lets a manager remove a non-owner member", () => {
    expect(canRemoveMember(admin, member)).toBe(true);
  });

  it("lets a non-owner remove themselves (leave)", () => {
    expect(canRemoveMember(member, member)).toBe(true);
  });

  it("never removes the owner", () => {
    expect(canRemoveMember(admin, owner)).toBe(false);
    expect(canRemoveMember(owner, owner)).toBe(false);
  });

  it("forbids a member removing someone else", () => {
    expect(canRemoveMember(member, otherMember)).toBe(false);
  });
});

describe("canTransferOwnership", () => {
  it("only the owner can transfer", () => {
    expect(canTransferOwnership(owner)).toBe(true);
    expect(canTransferOwnership(admin)).toBe(false);
    expect(canTransferOwnership(member)).toBe(false);
  });
});
