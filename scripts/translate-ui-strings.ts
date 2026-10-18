/**
 * Drafts Zomi values in content/ui-strings.json using the production
 * translator (verified dictionary first, then Gemini with the Standard Zomi
 * rules). Only keys whose value is "?" are drafted; an empty string means
 * "keep English" and reviewed wording is never overwritten. Drafts need a
 * fluent reviewer before release. Then run scripts/sync-info-pages.sh.
 * Run: bun scripts/translate-ui-strings.ts
 */
const FILE = new URL("../content/ui-strings.json", import.meta.url);
const ENDPOINT = "https://zomilanguage-backend.rork.app/api/translate/stream";

async function translate(text: string, i: number): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Anonymous-Id": `ui-strings-build-${Math.floor(i / 25)}` },
    body: JSON.stringify({ text, sourceLanguage: "english", targetLanguage: "zomi" }),
  });
  const body = await res.text();
  const done = body.split("\n\n").find((block) => block.startsWith("event: done"));
  const data = done?.split("\n").find((l) => l.startsWith("data: "));
  if (!data) throw new Error(`no result for "${text}" (${res.status}): ${body.slice(0, 200)}`);
  return String(JSON.parse(data.slice(6)).text ?? "").trim();
}

const strings: Record<string, string> = await Bun.file(FILE).json();
let i = 0;
for (const [en, zo] of Object.entries(strings)) {
  if (zo !== "?") continue;
  strings[en] = await translate(en, i++);
  console.log(`${en}  →  ${strings[en]}`);
  await Bun.sleep(3500);
}
await Bun.write(FILE, JSON.stringify(strings, null, 2) + "\n");
