import { describe, expect, it } from "vitest";
import { createOpportunityState } from "./agent-state";
import { safeQaContext } from "./agent-crm";

describe("QA CRM handoff context", () => {
  it("records the reused prospect on the new opportunity without replacing historical web_lead_id", () => {
    const state = createOpportunityState("qa-session");
    const context = safeQaContext(state, "qa-prospect") as Record<string, unknown>;
    expect(context.crm).toEqual({ prospectId: "qa-prospect" });
    expect(context.sessionId).toBe("qa-session");
    expect(context.customer).toEqual({ name: "QA Automatizado", email: "qa-promohub@example.com", phone: "5500000000" });
  });
});
