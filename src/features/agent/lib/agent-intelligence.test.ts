import { describe, expect, it } from "vitest";
import { createOpportunityState } from "./agent-state";
import { composeCommercialContext, createMinimalCompanyProfile, crossSellSuggestions, findSectorPlaybook, loadKnownCompanyProfile, PILOT_SECTOR_PLAYBOOKS, qaCommercialContext, conceptualKit, recommendationRationale } from "./agent-intelligence";

describe("commercial intelligence contracts", () => {
  it("keeps sector, company and opportunity as separate layers", () => {
    const initial = qaCommercialContext();
    const state = { ...createOpportunityState("qa-session"), ...initial, opportunity: { eventType: "corporativo" } };
    const context = composeCommercialContext(state);
    expect(PILOT_SECTOR_PLAYBOOKS.length).toBe(2);
    expect(context.sector?.id).toBe("corporate-events");
    expect(context.company?.profileId).toBe("qa-promohub");
    expect(context.opportunity).toEqual({ eventType: "corporativo" });
  });

  it("does not infer sector intelligence from opportunity wording alone", () => {
    const state = { ...createOpportunityState("plain"), opportunity: { useCase: "evento corporativo" } };
    expect(composeCommercialContext(state).sector).toBeNull();
  });

  it("reuses a known company only from controlled evidence", () => {
    expect(loadKnownCompanyProfile({ name: "QA Automatizado" })?.profileId).toBe("qa-promohub");
    expect(loadKnownCompanyProfile({ name: "Empresa inventada" })).toBeNull();
  });

  it("creates a minimal unknown-company profile without invented facts", () => {
    const profile = createMinimalCompanyProfile({ name: "Nueva Empresa", domain: "nueva.example" });
    expect(profile.companyName).toBe("Nueva Empresa");
    expect(profile.sector).toBeUndefined();
    expect(profile.locations).toBeUndefined();
    expect(profile.provenance[0]).toMatchObject({ source: "USER_PROVIDED", confidence: "high" });
  });

  it("provides traceable rationale, conceptual kit and cross-sell without SKUs", () => {
    const context = composeCommercialContext({ ...createOpportunityState("qa"), ...qaCommercialContext() });
    expect(findSectorPlaybook("Eventos corporativos")?.id).toBe("corporate-events");
    expect(recommendationRationale(context, "libreta")).toContain("evento");
    expect(conceptualKit(context)?.components).not.toContain("T671");
    expect(crossSellSuggestions(context, "libreta")).toContain("libreta → bolígrafo");
  });
});
