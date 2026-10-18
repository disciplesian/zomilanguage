/**
 * End-to-end check of the admin block list against the live backend.
 *
 * Usage (needs SUPABASE_DB_URL and the `postgres` package resolvable):
 *   bun scripts/verify-block-list.ts block   <deviceId>
 *   bun scripts/verify-block-list.ts probe   <deviceId> [count]
 *   bun scripts/verify-block-list.ts unblock <deviceId>
 *
 * "block"/"unblock" write the persisted list directly (same table the
 * admin RPCs use); "probe" calls the public translate endpoint with that
 * device id and reports how many requests were refused with 403.
 */
import postgres from "postgres";

const API = "https://zomilanguage-backend.rork.app/api/translate/stream";
const [cmd, deviceId, countArg] = process.argv.slice(2);

async function main(): Promise<void> {
  if (!cmd || !deviceId) throw new Error("usage: <block|probe|unblock> <deviceId> [count]");

  if (cmd === "probe") {
    const count = Number(countArg ?? 10);
    const codes: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Anonymous-Id": deviceId },
        body: JSON.stringify({ text: "water", sourceLanguage: "english", targetLanguage: "zomi" }),
      });
      await res.text();
      codes[res.status] = (codes[res.status] ?? 0) + 1;
    }
    console.log(JSON.stringify({ deviceId, codes }));
    return;
  }

  const sql = postgres(process.env.SUPABASE_DB_URL ?? "", { ssl: "require", max: 1 });
  try {
    if (cmd === "block") {
      await sql`insert into public.blocked_clients (value, kind, note)
                values (${deviceId}, 'device', 'qa block-list test')
                on conflict (value) do update set note = excluded.note`;
    } else if (cmd === "unblock") {
      await sql`delete from public.blocked_clients where value = ${deviceId}`;
    }
    const rows = await sql`select value, kind, note, created_at from public.blocked_clients order by created_at desc`;
    const fns = await sql`select proname from pg_proc where proname in
      ('list_blocked_clients','admin_block_client','admin_unblock_client') order by proname`;
    console.log(JSON.stringify({ rows, rpcs: fns.map((f) => f.proname) }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
