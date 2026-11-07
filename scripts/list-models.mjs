// node starter-kit/codex/list-models.mjs  → prints models your key can use (pick OPENAI_MODEL from here)
// Requires: OPENAI_API_KEY in env, `pnpm add openai` done in the project root.
import OpenAI from "openai";
const client = new OpenAI();
const ids = [];
for await (const m of client.models.list()) ids.push(m.id);
ids.sort();
console.log("Codex-family models:\n " + (ids.filter((i) => /codex/i.test(i)).join("\n ") || "(none found)"));
console.log("\nAll models:\n " + ids.join("\n "));
