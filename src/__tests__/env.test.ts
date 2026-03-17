import { describe, it, expect, vi, beforeEach } from "vitest";

// All required env vars must satisfy Zod min-length constraints in src/env.ts
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('AUTH_SECRET', 'test-secret-at-least-16-chars');
  vi.stubEnv('DATABASE_URL', 'mysql://user:pass@localhost:3306/db');
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACa280e6de983fcb7c60d72f73c476b04c');
  vi.stubEnv('TWILIO_AUTH_TOKEN', 'd9e823eee961cf2bb1740596b9f9782c');
  vi.stubEnv('TWILIO_WEBHOOK_BASE_URL', 'http://localhost:3000');
  vi.stubEnv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886');
});

describe("env", () => {
  it("loads env module and returns validated config", async () => {
    const m = await import("../env");
    expect(m.env).toBeTruthy();
    expect(m.env.DATABASE_URL).toBe('mysql://user:pass@localhost:3306/db');
    expect(m.env.REDIS_URL).toBe('redis://localhost:6379');
  });
});
