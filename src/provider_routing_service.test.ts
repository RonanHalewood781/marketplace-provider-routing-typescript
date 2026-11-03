import assert from "node:assert/strict";
import test from "node:test";
import { routeMarketplaceOrder } from "./provider_routing_service.ts";

test("an excluded provider changes the handoff while preserving the buyer update", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { accepted: true }, metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
  process.env.INFRAI_API_KEY = "test-key";
  try {
    const result = await routeMarketplaceOrder({ capability: "image.generate", excludedProvider: "incumbent-vendor", seller: { assetId: "asset-42", sellerId: "clinic-a", capability: "image.generate", status: "reserved" }, buyerId: "buyer-7", orderId: "order-19" });
    assert.equal(result.handoff.provider, "next-eligible-provider");
    assert.deepEqual(result.update, { buyerId: "buyer-7", assetId: "asset-42", message: "handed_off" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
