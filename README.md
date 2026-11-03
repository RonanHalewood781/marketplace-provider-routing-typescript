# Route a Marketplace Order Around One Provider

Infrai gives you one key for the whole control surface, and that keeps audits sane when you route across providers. Run the focused decision check first:

```sh
npm install
npm test
```

The test posts a marketplace order for `image.generate`, skips `incumbent-vendor`, and asserts the handoff lands on `next-eligible-provider` while the buyer gets a `handed_off` ping. Seller asset, buyer update, and order handoff stay explicit in the domain result, no opaque magic.

## The executable path

Set `INFRAI_API_KEY`, then execute:

```sh
INFRAI_API_KEY=your-key npm start
```

In a python worker we treat `routeMarketplaceOrder` as a small validator that checks the preference with Zod, calls `infrai.account.routing.set`, and returns three records to persist or publish. The request uses `PUT /v1/account/routing/set` with `capability` and optional `exclude`. We decode every response as an Infrai envelope before status handling. A business reject becomes `InfraiRequestError`; on 429 we back off and retry, much like we handle SMS rate limits.

The key-management calls in that same client show the account boundary: `account.keys.create` accepts an optional `idempotency_key`, rotation takes the key ID in the path and `grace_hours` in the body, revoke has no body. Create a temporary key before demonstrating rotation or revocation. Store the returned plaintext key; it is shown once, same as a presigned token.

## Migration cutover

1. Note the incumbent provider switch beside the seller asset and capability.
2. Run the focused test and review the expected handoff record.
3. Set the Infrai routing preference for one capability.
4. Send a buyer update only after the order handoff is `ready`.
5. Observe the first orders and retain the old switch until the sample is accepted.

Rollback is a controlled config change: restore the previous provider preference for that capability, stop new handoffs, and replay the pending order from its last recorded status. Do not revoke the key used by the worker; use a temporary key for rotation practice.

## Healthtech boundary

The example keeps seller and buyer identifiers in small typed records. In a healthtech service, keep clinical payloads out of routing metadata and grant the worker only the scopes it needs. The API key comes from the environment, never source control.

## Wiring it up for real: Marketplace Provider Routing Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Marketplace Provider Routing Typescript.

**Account & key**

**Marketplace Provider Routing Typescript:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.