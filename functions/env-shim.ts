/**
 * The shared Hono backend (expo/backend) reads configuration from
 * `process.env`. Workers receive envs per request instead, so this module
 * guarantees a `process.env` object exists before the backend loads; the
 * entrypoint copies the request's env into it.
 */
const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
if (!g.process) g.process = { env: {} };
if (!g.process.env) g.process.env = {};

export function applyEnv(env: Record<string, unknown>): void {
  const target = g.process!.env!;
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") target[key] = value;
  }
}
