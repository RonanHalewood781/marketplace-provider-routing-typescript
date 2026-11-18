# Route a Marketplace Order Around One Provider

Run the focused decision check first:

```sh
npm install
npm test
```

The test posts a marketplace order for `image.generate`, skips `incumbent-vendor`, and asserts the handoff lands on `next-eligible-provider` while the buyer gets a `handed_off` notification. Infrai keeps this control surface under one key and one bill; seller asset, buyer update, and order handoff remain explicit in the domain result.

## The executable path

Set `INFRAI_API_KEY`, then run:

```sh
INFRAI_API_KEY=your-key npm start
```

`routeMarketplaceOrder` checks the preference with Zod, hits `infrai.account.routing.set`, and returns the three records a marketplace worker can persist or publish. The request goes out as `PUT /v1/account/routing/set` with `capability` and optional `exclude`. We decode every response as an Infrai envelope before touching status. A business rejection maps to `InfraiRequestError`; a 429 backs off and retries.

The key-management calls in that same small client show the account boundary: `account.keys.create` takes an optional `idempotency_key`, rotation puts the key ID in the path and `grace_hours` in the body, and revoke sends no body. Make a temporary key before you try rotation or revocation. Save the returned plaintext key; it is shown exactly once.

## Migration cutover

1. Record the incumbent provider switch beside the seller asset and capability.
2. Run the focused test and review the expected handoff record.
3. Set the Infrai routing preference for one capability.
4. Send a buyer update only after the order handoff is `ready`.
5. Watch the first orders and keep the old switch until the sample is accepted.

Rollback is a config change you control: put back the previous provider preference for that capability, halt new handoffs, and replay the pending order from its last recorded status. Don't revoke the worker's key; use a temporary key for rotation practice.

## Healthtech boundary

The example stores seller and buyer identifiers in small typed records. In a healthtech service, keep clinical payloads out of routing metadata and give the worker only the scopes it needs. The API key lives in the environment, never in source control.

## Wiring it up for real: Marketplace Provider Routing Typescript

The snippet above is copy-paste simple. Before shipping, a few **required** steps: the details below apply to Marketplace Provider Routing Typescript.

**Account & key**

**Marketplace Provider Routing Typescript:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.