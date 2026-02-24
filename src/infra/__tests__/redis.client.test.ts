/**
 * Unit tests for RedisService.isAvailable()
 *
 * Regression coverage for the bug where isAvailable() returned true as soon
 * as a REDIS_URL was present — even before the underlying TCP connection was
 * established — causing every Redis command to block for connectTimeout ms
 * (≈10 s) before falling back to the in-memory store.
 *
 * The fix: track the 'ready' event from ioredis and only return true once the
 * connection is actually live.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── ioredis mock ──────────────────────────────────────────────────────────────
// We need a controllable fake that lets us fire 'ready', 'close', 'end' events
// and track whether connect() was called.

type Listener = (...args: unknown[]) => void;
type EventName = 'ready' | 'close' | 'end' | 'error';

// Shared mutable state — reset in freshClient() before each test.
const state = vi.hoisted(() => ({
  listeners: {} as Partial<Record<EventName, Listener[]>>,
  connectCalled: 0,
  // Override in individual tests to control when connect() settles.
  connectImpl: (): Promise<void> => Promise.resolve(),
}));

// A stable fake ioredis instance shared across module reloads.
const fakeRedis = vi.hoisted(() => ({
  on(event: EventName, fn: Listener) {
    state.listeners[event] = [...(state.listeners[event] ?? []), fn];
    return this;
  },
  connect(): Promise<void> {
    state.connectCalled++;
    return state.connectImpl();
  },
  emit(event: EventName, ...args: unknown[]) {
    (state.listeners[event] ?? []).forEach(fn => fn(...args));
  },
  // Stub the ioredis commands used by RedisService
  ping:   vi.fn().mockResolvedValue('PONG'),
  get:    vi.fn().mockResolvedValue(null),
  set:    vi.fn().mockResolvedValue('OK'),
  incr:   vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  del:    vi.fn().mockResolvedValue(1),
  keys:   vi.fn().mockResolvedValue([]),
  ttl:    vi.fn().mockResolvedValue(-2),
}));

// Use the class constructor pattern (same as llm-gateway.test.ts) so that
// `new Redis(...)` returns fakeRedis instead of a plain empty object.
vi.mock('ioredis', () => {
  class Redis {
    constructor(_url: string, _opts?: unknown) {
      return fakeRedis as unknown as Redis;
    }
  }
  return { default: Redis };
});

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── freshClient ───────────────────────────────────────────────────────────────
// Resets all shared state and re-imports redis.client so we always get a
// freshly constructed RedisService for each test.

async function freshClient(url?: string) {
  // Reset shared event listeners & counters
  state.listeners = {};
  state.connectCalled = 0;
  state.connectImpl = () => Promise.resolve();
  vi.clearAllMocks();

  if (url !== undefined) {
    process.env.REDIS_URL = url;
  } else {
    delete process.env.REDIS_URL;
  }

  vi.resetModules();
  const { redisClient } = await import('../redis.client');
  return redisClient;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RedisService.isAvailable()', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('returns false when REDIS_URL is not set', async () => {
    const client = await freshClient();
    expect(client.isAvailable()).toBe(false);
  });

  it('returns false before the ready event fires (connection still pending)', async () => {
    // connect() never settles — simulates a slow / unreachable Redis
    state.connectImpl = () => new Promise(() => {});
    const client = await freshClient('redis://127.0.0.1:6379');

    expect(client.isAvailable()).toBe(false);
  });

  it('returns true after the ready event fires', async () => {
    const client = await freshClient('redis://127.0.0.1:6379');
    expect(client.isAvailable()).toBe(false); // not yet ready

    fakeRedis.emit('ready');
    expect(client.isAvailable()).toBe(true);
  });

  it('returns false again after the close event fires', async () => {
    const client = await freshClient('redis://127.0.0.1:6379');
    fakeRedis.emit('ready');
    expect(client.isAvailable()).toBe(true);

    fakeRedis.emit('close');
    expect(client.isAvailable()).toBe(false);
  });

  it('returns false again after the end event fires', async () => {
    const client = await freshClient('redis://127.0.0.1:6379');
    fakeRedis.emit('ready');
    expect(client.isAvailable()).toBe(true);

    fakeRedis.emit('end');
    expect(client.isAvailable()).toBe(false);
  });

  it('calls connect() eagerly during construction', async () => {
    await freshClient('redis://127.0.0.1:6379');
    expect(state.connectCalled).toBe(1);
  });

  it('uses in-memory fallback for get/set when not ready', async () => {
    state.connectImpl = () => new Promise(() => {}); // never ready
    const client = await freshClient('redis://127.0.0.1:6379');

    expect(client.isAvailable()).toBe(false);

    await client.set('key', 'value', 60);
    const result = await client.get<string>('key');
    expect(result).toBe('value');

    // ioredis.set / ioredis.get must NOT have been called
    expect(fakeRedis.set).not.toHaveBeenCalled();
    expect(fakeRedis.get).not.toHaveBeenCalled();
  });
});
