import { afterEach, expect, it, vi } from "vitest";
const provider = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  signInWithOtp: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: provider }),
}));
vi.mock("../src/lib/db", () => ({
  prisma: { user: { findUnique: async () => ({ id: "existing-member" }) } },
}));
import { verifyEmailCode, sendEmailCode } from "../src/lib/email-auth";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("requires a verified identity for exactly the requested email", async () => {
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable");
  provider.verifyOtp.mockResolvedValue({
    data: {
      user: {
        id: "identity",
        email: "OTHER@example.test",
        email_confirmed_at: "2026-10-23",
      },
    },
    error: null,
  });
  await expect(
    verifyEmailCode("member@example.test", "123456"),
  ).rejects.toMatchObject({ status: 400 });
  provider.verifyOtp.mockResolvedValue({
    data: { user: { id: "identity", email: "member@example.test" } },
    error: null,
  });
  await expect(
    verifyEmailCode("member@example.test", "123456"),
  ).rejects.toMatchObject({ status: 400 });
  provider.verifyOtp.mockResolvedValue({
    data: {
      user: {
        id: "identity",
        email: "MEMBER@example.test",
        email_confirmed_at: "2026-10-23",
      },
    },
    error: null,
  });
  await expect(
    verifyEmailCode("member@example.test", "123456"),
  ).resolves.toEqual({ email: "member@example.test", authUserId: "identity" });
  expect(provider.verifyOtp).toHaveBeenLastCalledWith({
    email: "member@example.test",
    token: "123456",
    type: "email",
  });
});
it("lets an admitted member request a code without reusing an invite", async () => {
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable");
  provider.signInWithOtp.mockResolvedValue({ error: null });
  await expect(
    sendEmailCode("member@example.test", ""),
  ).resolves.toBeUndefined();
  expect(provider.signInWithOtp).toHaveBeenCalledWith({
    email: "member@example.test",
    options: { shouldCreateUser: true },
  });
});
it("fails closed if email provider settings are missing", async () => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
  await expect(sendEmailCode("member@example.test", "")).rejects.toMatchObject({
    status: 503,
  });
  expect(provider.signInWithOtp).not.toHaveBeenCalled();
});
