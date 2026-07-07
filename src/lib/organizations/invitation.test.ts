import { describe, expect, it } from "vitest";

import {
  invitationDisplayStatus,
  invitationExpiryFrom,
  isInvitationActionable,
  isInvitationExpired,
  INVITATION_TTL_DAYS,
} from "./invitation";

const NOW = new Date("2026-01-15T12:00:00.000Z");
const FUTURE = new Date("2026-01-20T12:00:00.000Z");
const PAST = new Date("2026-01-10T12:00:00.000Z");

describe("isInvitationExpired", () => {
  it("is false before expiry", () => {
    expect(isInvitationExpired(FUTURE, NOW)).toBe(false);
  });

  it("is true after expiry", () => {
    expect(isInvitationExpired(PAST, NOW)).toBe(true);
  });
});

describe("invitationDisplayStatus", () => {
  it("reports a live pending invitation as pending", () => {
    expect(invitationDisplayStatus({ status: "pending", expiresAt: FUTURE }, NOW)).toBe("pending");
  });

  it("reports an elapsed pending invitation as expired", () => {
    expect(invitationDisplayStatus({ status: "pending", expiresAt: PAST }, NOW)).toBe("expired");
  });

  it("keeps a settled status even when past the expiry window", () => {
    expect(invitationDisplayStatus({ status: "accepted", expiresAt: PAST }, NOW)).toBe("accepted");
    expect(invitationDisplayStatus({ status: "revoked", expiresAt: PAST }, NOW)).toBe("revoked");
  });
});

describe("isInvitationActionable", () => {
  it("is true only while pending and unexpired", () => {
    expect(isInvitationActionable({ status: "pending", expiresAt: FUTURE }, NOW)).toBe(true);
    expect(isInvitationActionable({ status: "pending", expiresAt: PAST }, NOW)).toBe(false);
    expect(isInvitationActionable({ status: "accepted", expiresAt: FUTURE }, NOW)).toBe(false);
  });
});

describe("invitationExpiryFrom", () => {
  it("adds the TTL window to the creation time", () => {
    const expiry = invitationExpiryFrom(NOW);
    const expectedDays = (expiry.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000);
    expect(expectedDays).toBe(INVITATION_TTL_DAYS);
  });
});
