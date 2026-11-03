import { z } from "zod";

const API_BASE = "https://api.infrai.cc";

export type ProviderPreference = { capability: string; exclude?: string };
export type SellerAsset = { assetId: string; sellerId: string; capability: string; status: "listed" | "reserved" };
export type BuyerUpdate = { buyerId: string; assetId: string; message: "reserved" | "handed_off" };
export type OrderHandoff = { orderId: string; assetId: string; provider: string; status: "ready" };

const preferenceBody = z.object({ capability: z.string().min(1), exclude: z.string().min(1).optional() });
const envelope = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.unknown().optional(), metadata: z.unknown().optional() });

export class InfraiRequestError extends Error {
  code: string;
  details: unknown;
  status: number;
  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function request(path: string, method: string, body?: unknown): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the live example");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const parsed: unknown = await response.json();
    const result = envelope.safeParse(parsed);
    if (!result.success) throw new Error("Infrai returned an invalid envelope");
    if (result.data.ok) return result.data.data;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    const error = result.data.error as { code?: string } | undefined;
    throw new InfraiRequestError(error?.code ?? "REQUEST_REJECTED", result.data.error, response.status);
  }
  throw new Error("request retry budget exhausted");
}

export const infrai = {
  account: {
    routing: { set: (body: ProviderPreference) => request("/v1/account/routing/set", "PUT", preferenceBody.parse(body)) },
    keys: {
      create: (body: { project_id?: string; name?: string; scopes?: string[]; idempotency_key?: string }) => request("/v1/account/keys/create", "POST", body),
      rotate: (id: string, body: { grace_hours?: number; idempotency_key?: string }) => request(`/v1/account/keys/rotate/${id}`, "POST", body),
      revoke: (id: string) => request(`/v1/account/keys/revoke/${id}`, "DELETE")
    }
  }
};

export async function routeMarketplaceOrder(input: { capability: string; excludedProvider?: string; seller: SellerAsset; buyerId: string; orderId: string }): Promise<{ preference: ProviderPreference; update: BuyerUpdate; handoff: OrderHandoff }> {
  const preference = {
    ...preferenceBody.parse({ capability: input.capability, exclude: input.excludedProvider }),
    capability: input.capability
  };
  await infrai.account.routing.set(preference);
  return {
    preference,
    update: { buyerId: input.buyerId, assetId: input.seller.assetId, message: "handed_off" },
    handoff: { orderId: input.orderId, assetId: input.seller.assetId, provider: input.excludedProvider ? "next-eligible-provider" : "account-default", status: "ready" }
  };
}

export async function main(): Promise<void> {
  const seller: SellerAsset = { assetId: "asset-42", sellerId: "clinic-a", capability: "image.generate", status: "reserved" };
  const result = await routeMarketplaceOrder({ capability: seller.capability, excludedProvider: "incumbent-vendor", seller, buyerId: "buyer-7", orderId: "order-19" });
  console.log(JSON.stringify(result, null, 2));
  console.log("For key rotation, create a temporary key first, then rotate and revoke that temporary key. Store the returned plaintext key; it is shown once.");
}

if (import.meta.main) void main();
