// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { getSeededSecret } from "@challenges/secrets";
import { createDemoAssessment, getAssessmentBundle, useAssessmentBundle } from "../bundle";
import { hydrateManagerStores, useAssessmentStore, useSecretStore } from "../store";

beforeEach(async () => {
  localStorage.clear();
  await hydrateManagerStores();
  useAssessmentStore.setState({ assessments: {}, challenges: {} });
  useSecretStore.setState({ secrets: {} });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ token: "signed-token" })));
});
describe("H5b assessment bundle", () => {
  it("creates the configured demo and keeps reference fixes in a separate store", async () => {
    const id = await createDemoAssessment();
    const bundle = getAssessmentBundle(id)!;
    expect(bundle.assessment).toMatchObject({ candidateAlias: "Candidate A — Rani (fictional)", level: "mid", aiAssistance: true, durationMin: 45, locale: "en", proctoring: { mode: "browser", required: false, captureSnapshots: false } });
    const secret = getSeededSecret(bundle.challenge.id)!;
    expect(useSecretStore.getState().secrets[bundle.challenge.id]).toEqual(secret);
    expect(JSON.stringify(bundle)).not.toContain(secret.referenceFix);
    expect(localStorage.getItem("he:assessments")).not.toContain("referenceFix");
    expect(localStorage.getItem("he:secrets")).toContain("referenceFix");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not read secret storage when resolving a public bundle", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem");
    expect(getAssessmentBundle("unknown")).toBeNull();
    expect(spy).not.toHaveBeenCalledWith("he:secrets");
    spy.mockRestore();
  });
  it("reports unknown IDs only after hydration and observes new assessments", async () => {
    const { result, rerender } = renderHook(({ id }) => useAssessmentBundle(id), { initialProps: { id: "unknown" } });
    await waitFor(() => expect(result.current.status).toBe("not_found"));
    const id = await createDemoAssessment();
    rerender({ id });
    expect(result.current.status).toBe("ready");
  });
  it("removes unused secrets and updates tokens", async () => {
    const id = await createDemoAssessment();
    await useAssessmentStore.getState().setToken(id, "replacement");
    expect(getAssessmentBundle(id)?.assessment.token).toBe("replacement");
    await useAssessmentStore.getState().removeAssessment(id);
    expect(getAssessmentBundle(id)).toBeNull();
    expect(useSecretStore.getState().secrets).toEqual({});
  });
});
