# Flutterwave Edge Function — required deployment patch

The poster payment page and database repair have been updated to retire manual payment. The Edge Function deployed in Supabase must also be updated; otherwise it can still reject a poster who has an old manual proof record.

## 1. Fix settings lookup

In `settings()`, replace:

```ts
.from("platform_settings")
.select("*")
.eq("id", 1)
.maybeSingle();
```

with:

```ts
.from("platform_settings")
.select("*")
.limit(1)
.maybeSingle();
```

This avoids assuming the only settings row has `id = 1`. Keep the project’s settings table limited to the intended single configuration row.

## 2. Remove the legacy manual-proof blocker

Inside `initiatePosterPayment()`, find the check that throws:

```ts
"A manual payment proof is already awaiting review. Contact support before paying again."
```

Remove that entire `if (hasManualProof && ...)` block. Keep the separate guard that rejects a payment record already marked `APPROVED` or `payment_status = "paid"`.

The frontend now allows Flutterwave checkout for old unverified manual-proof records. The Edge Function must match that behavior. Do not remove transaction verification, exact-amount checks, task ownership checks, duplicate-paid checks, or the separate task moderation process.

## 3. Deploy and test

Deploy the updated `flutterwave-payments` Edge Function in Supabase. Then test with a low-value test transaction:
- new poster task payment opens Flutterwave checkout;
- a legacy pending manual proof no longer blocks checkout;
- a successful return is verified by the server using the transaction ID and reference;
- task remains inactive until admin task moderation;
- a failed or cancelled transaction does not mark the task paid;
- a payment already verified as paid cannot be charged again.

Never test by entering a fake successful transaction or manually setting a task/payment to paid.
