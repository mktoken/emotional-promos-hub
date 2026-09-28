import { describe, expect, it } from "vitest";
import { advanceAgent, newAgentSession } from "./agent-workflow";

describe("shared agent workflow", () => {
  it("understands the client request and invokes the same catalog search", async () => {
    const calls: Array<[string, number]> = [];
    const search = async (interest: string, quantity: number) => { calls.push([interest, quantity]); return []; };
    const result = await advanceAgent(newAgentSession(), "Quiero 50 libretas para un evento corporativo", search);
    expect(calls).toEqual([["libreta", 50]]);
    expect(result.session.state.opportunity.eventType).toBe("corporativo");
    expect(result.session.messages.at(-1)?.text).toContain("opción verificada");
  });
  it("does not expose a raw tool error to the conversation", async () => {
    const result = await advanceAgent(newAgentSession(), "Quiero 50 libretas", async () => { throw new Error("secret db details"); });
    expect(result.searchFailed).toBe(true);
    expect(JSON.stringify(result.session.messages)).not.toContain("secret db details");
  });
});
