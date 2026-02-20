import { describe, it, expect } from "vitest";

describe("env", () => {
  it("loads env module", async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "12345678901234567890";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://user:pass@localhost:3306/db";
    process.env.SEED_TOKEN = process.env.SEED_TOKEN ?? "seedtoken123";
    const m = await import("../env");
    expect(m.env).toBeTruthy();
  });
});
