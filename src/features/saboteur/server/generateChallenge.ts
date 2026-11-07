import "server-only";
import { callStructured } from "@/lib/codex/client";
import { SABOTEUR_SYSTEM, SABOTEUR_VERSION, buildSaboteurInput } from "@/lib/codex/prompts/saboteur";
import mockFixture from "@/lib/codex/fixtures/saboteur.json";
import { SaboteurOutput, type SaboteurInput } from "../schema";
export async function generateChallenge(input: SaboteurInput) {
  const { data: output, meta } = await callStructured({ role: "saboteur", promptVersion: SABOTEUR_VERSION,
    system: SABOTEUR_SYSTEM, input: buildSaboteurInput(input), schema: SaboteurOutput, schemaName: "SaboteurOutput",
    timeoutMs: 50_000, retries: 0, mockFixture });
  return { output, meta };
}
