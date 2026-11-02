# Flutterwave Edge Function patch for poster Business Jobs and promotion fees

This is an additive patch for the uploaded `flutterwave-payments` Edge Function. Keep the existing Flutterwave checkout, server transaction verification, duplicate-payment checks, and all other payment purposes.

## 1. Pass the authenticated user-scoped client into poster payment functions

The uploaded function creates a service-role client named `db` and a user-scoped client named `userClient` inside `Deno.serve`. The SQL RPCs `get_poster_task_payment_amount` check `auth.uid()`, so calls made with the service-role-only `db` client have no authenticated user context.

Change the function signature:

```ts
async function initiatePosterPayment(
  user: { id: string; email?: string },
  taskId: string,
  redirectUrl: string,
  userClient: ReturnType<typeof createClient>,
) {
```

Inside this function, change only the amount RPC client from:

```ts
const { data: amountData, error: amountError } = await db.rpc(
  "get_poster_task_payment_amount",
  { p_task_id: taskId },
);
```

to:

```ts
const { data: amountData, error: amountError } = await userClient.rpc(
  "get_poster_task_payment_amount",
  { p_task_id: taskId },
);
```

At the `initiatePosterPayment` call inside `Deno.serve`, add `userClient` as the fourth argument:

```ts
await initiatePosterPayment(
  user,
  String(metadata.task_id || ""),
  redirectUrl,
  userClient,
)
```

## 2. Apply the same authenticated context during verification

Change the signature:

```ts
async function verifyPosterPayment(
  userId: string,
  txRef: string,
  transactionId: string,
  paymentId: string,
  userClient: ReturnType<typeof createClient>,
) {
```

Inside `verifyPosterPayment`, change the expected-amount RPC from `db.rpc` to `userClient.rpc`:

```ts
const { data: expectedAmount, error: amountError } = await userClient.rpc(
  "get_poster_task_payment_amount",
  { p_task_id: String(payment.task_id) },
);
```

At the `verifyPosterPayment` call inside `Deno.serve`, add `userClient` as the fifth argument:

```ts
await verifyPosterPayment(
  user.id,
  txRef,
  transactionId,
  String(metadata.payment_id || ""),
  userClient,
)
```

Do not change the other reads/writes that intentionally use the service-role `db` client.

## 3. Business Job and promotion pricing

The new migration `2026_11_02_business_jobs_promotions.sql` adds the task metadata and updates both SQL RPCs. The existing Edge Function already obtains the expected amount from `get_poster_task_payment_amount`, so after the migration and authenticated-client patch, Flutterwave initiation and verification automatically use the server-calculated Business Job and promotion fees. Do not calculate or accept the amount from browser-supplied metadata.

## 4. AI comment suggestions

The uploaded function does not currently contain an AI provider integration. The comment-suggestion feature needs an AI provider secret (for example `OPENAI_API_KEY`) and a separate authenticated action. It should return editable suggestions for real users to personalize; it must not auto-post comments or generate fake reviews/endorsements.
