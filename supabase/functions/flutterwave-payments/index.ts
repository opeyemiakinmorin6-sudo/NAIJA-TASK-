import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FLW_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") ||
    Deno.env.get("FLW_SECRET_KEY") ||
    "";
const ALLOWED_ORIGINS = new Set([
    "https://naijatask.com.ng",
    "https://www.naijatask.com.ng",
]);
const db = createClient(SUPABASE_URL, SERVICE_KEY);
function cors(req: Request) {
    const origin = req.headers.get("Origin") || "";
    const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
    return {
        ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Vary": "Origin",
        "Content-Type": "application/json",
    };
}
function response(req: Request, data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: cors(req),
    });
}
function errorResponse(req: Request, message: string, status = 400) {
    return response(req, { success: false, error: message }, status);
}
function amountOf(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error("The payment amount is invalid.");
    }
    return Math.round(n * 100) / 100;
}
function newReference() {
    return "NT-" + crypto.randomUUID();
}
function safeUrl(value: unknown): string {
    let url: URL;
    try {
        url = new URL(String(value || ""));
    }
    catch {
        throw new Error("A valid payment return URL is required.");
    }
    if (url.protocol !== "https:" ||
        !ALLOWED_ORIGINS.has(url.origin)) {
        throw new Error("The payment return URL must belong to the official NAIJA TASK website.");
    }
    return url.toString();
}
function safeExternalUrl(value: unknown, field: string): string {
    let url: URL;
    try {
        url = new URL(String(value || ""));
    }
    catch {
        throw new Error("Enter a valid " + field + " URL.");
    }
    if (url.protocol !== "https:") {
        throw new Error(field + " URL must use HTTPS.");
    }
    return url.toString();
}
async function settings() {
    const { data, error } = await db
        .from("platform_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
    if (error || !data) {
        throw new Error("Could not load platform settings.");
    }
    return data;
}
async function flutterwave(path: string, options: RequestInit = {}) {
    if (!FLW_SECRET_KEY) {
        throw new Error("Flutterwave secret key is not configured.");
    }
    const result = await fetch("https://api.flutterwave.com/v3" + path, {
        ...options,
        headers: {
            Authorization: "Bearer " + FLW_SECRET_KEY,
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
    let data: any;
    try {
        data = await result.json();
    }
    catch {
        throw new Error("Flutterwave returned an unreadable response.");
    }
    if (!result.ok) {
        console.error("Flutterwave API error:", data);
        throw new Error(data?.message || "Flutterwave request failed.");
    }
    return data;
}
async function checkout(userId: string, email: string, purpose: string, txRef: string, amount: number, redirectUrl: string, metadata: Record<string, unknown> = {}) {
    if (!email || !email.includes("@")) {
        throw new Error("Your account needs a valid email address.");
    }
    const result = await flutterwave("/payments", {
        method: "POST",
        body: JSON.stringify({
            tx_ref: txRef,
            amount,
            currency: "NGN",
            redirect_url: redirectUrl,
            payment_options: "card,banktransfer,ussd",
            customer: {
                email,
                name: "NAIJA TASK user",
            },
            customizations: {
                title: "NAIJA TASK",
                description: "Payment for " + purpose,
            },
            meta: {
                user_id: userId,
                purpose,
                ...metadata,
            },
        }),
    });
    if (result.status !== "success" || !result.data?.link) {
        throw new Error("Flutterwave did not return a checkout link.");
    }
    return {
        success: true,
        payment_url: result.data.link,
        tx_ref: txRef,
    };
}
/* =========================================================
MEMBERSHIP: ACTIVATION AND VIP
========================================================= */
async function initiateMembership(user: {
    id: string;
    email?: string;
}, purpose: string, redirectUrl: string) {
    const s = await settings();
    let fee: number;
    if (purpose === "activation") {
        if (s.activation_enabled !== true) {
            throw new Error("Account activation is disabled.");
        }
        fee = amountOf(s.activation_fee);
    }
    else if (purpose === "vip") {
        if (s.vip_enabled !== true) {
            throw new Error("VIP membership is disabled.");
        }
        fee = amountOf(s.vip_price);
    }
    else {
        throw new Error("Unsupported membership type.");
    }
    const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("is_activated, is_vip")
        .eq("id", user.id)
        .maybeSingle();
    if (profileError || !profile) {
        throw new Error("Your user profile could not be found.");
    }
    if (purpose === "activation" && profile.is_activated) {
        throw new Error("Your account is already activated.");
    }
    if (purpose === "vip") {
        if (!profile.is_activated) {
            throw new Error("Activate your account before buying VIP.");
        }
        if (profile.is_vip) {
            throw new Error("Your account already has VIP.");
        }
    }
    // Re-open the existing pending payment instead of locking the user out.
    // Reusing its reference keeps one payment record and avoids silently creating
    // a second independent activation/VIP charge.
    const { data: pending, error: pendingError } = await db
        .from("membership_payments")
        .select("id, amount, tx_ref, status")
        .eq("user_id", user.id)
        .eq("purpose", purpose)
        .in("status", ["pending", "PENDING"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (pendingError) {
        throw new Error("Could not refresh your previous membership payment.");
    }
    let txRef: string;
    if (pending) {
        const oldAmount = Number(pending.amount);
        const oldRef = String(pending.tx_ref || "").trim();
        if (!oldRef ||
            !Number.isFinite(oldAmount) ||
            Math.round(oldAmount * 100) !== Math.round(fee * 100)) {
            throw new Error("Your previous payment needs a support check because its reference or amount does not match the current price. Please contact support before paying again.");
        }
        txRef = oldRef;
    }
    else {
        txRef = newReference();
        const { error: insertError } = await db
            .from("membership_payments")
            .insert({
            user_id: user.id,
            purpose,
            amount: fee,
            currency: "NGN",
            tx_ref: txRef,
            status: "pending",
        });
        if (insertError) {
            console.error("Membership insert error:", insertError);
            throw new Error("Could not create the membership payment record.");
        }
    }
    return await checkout(user.id, user.email || "", purpose, txRef, fee, redirectUrl);
}
/* =========================================================
POSTER TASK PAYMENT
========================================================= */
async function initiatePosterPayment(user: {
    id: string;
    email?: string;
}, taskId: string, redirectUrl: string, userClient: ReturnType<typeof createClient>) {
    if (!taskId || !/^\d+$/.test(taskId)) {
        throw new Error("A valid task ID is required.");
    }
    const { data: task, error: taskError } = await db
        .from("tasks")
        .select("id, created_by, slots, active, payment_status")
        .eq("id", taskId)
        .eq("created_by", user.id)
        .maybeSingle();
    if (taskError || !task) {
        throw new Error("Your task was not found, or it does not belong to your account.");
    }
    if (task.active === true ||
        String(task.payment_status || "").toUpperCase() === "PAID") {
        throw new Error("This task is already paid or active. Do not submit another payment.");
    }
    const { data: amountData, error: amountError } = await userClient.rpc("get_poster_task_payment_amount", { p_task_id: taskId });
    if (amountError) {
        throw new Error("Could not calculate the task funding amount securely.");
    }
    const fee = amountOf(amountData);
    const { data: existing, error: existingError } = await db
        .from("poster_payments")
        .select("*")
        .eq("task_id", taskId)
        .eq("poster_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (existingError) {
        throw new Error("Could not check the existing poster payment record.");
    }
    let paymentId: string;
    let txRef: string;
    if (existing) {
        const oldStatus = String(existing.status || "").toUpperCase();
        const oldPaymentStatus = String(existing.payment_status || "").toLowerCase();
        if (oldStatus === "APPROVED" ||
            oldPaymentStatus === "paid" ||
            String(existing.flw_transaction_id || "").trim() !== "") {
            throw new Error("This task already has a paid or approved payment record.");
        }
        const oldRef = String(existing.tx_ref || "").trim();
        const oldAmount = Number(existing.amount);
        const sameAmount = Number.isFinite(oldAmount) &&
            Math.round(oldAmount * 100) === Math.round(fee * 100);
        const alreadyFlutterwave = String(existing.payment_method || "").toLowerCase() === "flutterwave";
        // Reuse a pending Flutterwave reference only when its amount is still exact.
        // Legacy manual-transfer references and stale-price references are rotated
        // into a fresh Flutterwave reference instead of permanently blocking checkout.
        if (oldRef && alreadyFlutterwave && sameAmount) {
            txRef = oldRef;
        }
        else {
            txRef = newReference();
            const { data: updatedPayment, error: updateError } = await db
                .from("poster_payments")
                .update({
                amount: fee,
                payment_method: "FLUTTERWAVE",
                payment_reference: txRef,
                proof_url: null,
                status: "PENDING",
                payment_status: "pending",
                tx_ref: txRef,
            })
                .eq("id", existing.id)
                .eq("poster_id", user.id)
                .is("flw_transaction_id", null)
                .neq("payment_status", "paid")
                .select("id")
                .maybeSingle();
            if (updateError || !updatedPayment) {
                throw new Error("Could not safely prepare this pending payment for Flutterwave. Refresh the page or contact support before trying again.");
            }
        }
        paymentId = String(existing.id);
    }
    else {
        txRef = newReference();
        const { data: inserted, error: insertError } = await db
            .from("poster_payments")
            .insert({
            poster_id: user.id,
            task_id: taskId,
            amount: fee,
            payment_method: "FLUTTERWAVE",
            payment_reference: txRef,
            status: "UNDER_REVIEW",
            payment_status: "pending",
            tx_ref: txRef,
        })
            .select("id")
            .single();
        if (insertError || !inserted) {
            throw new Error("Could not create the poster payment record.");
        }
        paymentId = String(inserted.id);
    }
    const returnUrl = new URL(redirectUrl);
    returnUrl.searchParams.set("nt_poster_return", "1");
    returnUrl.searchParams.set("nt_poster_payment_id", paymentId);
    returnUrl.searchParams.set("task_id", taskId);
    const result = await checkout(user.id, user.email || "", "poster_task", txRef, fee, returnUrl.toString(), {
        payment_id: paymentId,
        task_id: taskId,
    });
    return {
        ...result,
        payment_id: paymentId,
        amount: fee,
    };
}
/* =========================================================
MARKETPLACE PAYMENT
========================================================= */
async function initiateMarketplacePayment(_user: { id: string; email?: string }, _orderId: string, _redirectUrl: string) {
    // Fail closed: standard Flutterwave checkout is not protected escrow.
    throw new Error("Marketplace checkout is temporarily disabled until protected settlement is configured.");
}
/* =========================================================
ADVERTISEMENT PAYMENT
========================================================= */
async function initiateAdCampaign(user: {
    id: string;
    email?: string;
}, body: Record<string, unknown>, redirectUrl: string) {
    const s = await settings();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const imageUrl = body.image_url
        ? safeExternalUrl(body.image_url, "Advertisement image")
        : "";
    const targetUrl = safeExternalUrl(body.target_url, "Advertisement destination");
    const placement = String(body.placement || "");
    const days = Number(body.days);
    if (!title || !description) {
        throw new Error("Enter the campaign name and description.");
    }
    if (title.length > 150 || description.length > 3000) {
        throw new Error("The advertisement text is too long.");
    }
    if (!["dashboard", "ads_page", "both"].includes(placement)) {
        throw new Error("Choose a valid ad placement.");
    }
    if (![1, 3, 7, 14, 30].includes(days)) {
        throw new Error("Choose a supported campaign duration.");
    }
    const dashboardFee = Number(s.ad_dashboard_placement_fee);
    const pageFee = Number(s.ad_page_placement_fee);
    const dailyFee = Number(s.ad_daily_fee);
    if (!Number.isFinite(dashboardFee) ||
        !Number.isFinite(pageFee) ||
        !Number.isFinite(dailyFee) ||
        dashboardFee < 0 ||
        pageFee < 0 ||
        dailyFee < 0) {
        throw new Error("The administrator has not configured valid advertisement prices.");
    }
    let placementFee = 0;
    if (placement === "dashboard" || placement === "both") {
        placementFee += dashboardFee;
    }
    if (placement === "ads_page" || placement === "both") {
        placementFee += pageFee;
    }
    const total = amountOf(placementFee + dailyFee * days);
    const txRef = newReference();
    const now = new Date();
    const end = new Date(now.getTime() + days * 86400000);
    const { data: ad, error: adError } = await db
        .from("platform_ads")
        .insert({
        title,
        description,
        image_url: imageUrl || null,
        target_url: targetUrl,
        placement,
        active: false,
        priority: 0,
        start_at: now.toISOString(),
        end_at: end.toISOString(),
        created_by: user.id,
    })
        .select("id")
        .single();
    if (adError || !ad) {
        throw new Error("Could not create the pending ad campaign.");
    }
    const { error: paymentError } = await db
        .from("ad_campaign_payments")
        .insert({
        ad_id: ad.id,
        payer_user_id: user.id,
        amount: total,
        currency: "NGN",
        status: "pending",
        payment_reference: txRef,
        provider: "flutterwave",
    });
    if (paymentError) {
        await db
            .from("platform_ads")
            .delete()
            .eq("id", ad.id)
            .eq("created_by", user.id);
        throw new Error("Could not create the ad payment record.");
    }
    const result = await checkout(user.id, user.email || "", "advertisement", txRef, total, redirectUrl, { ad_id: ad.id });
    return {
        ...result,
        ad_id: ad.id,
        amount: total,
    };
}
/* =========================================================
FLUTTERWAVE TRANSACTION VERIFICATION
========================================================= */
async function verifyTransaction(transactionId: string, txRef: string) {
    if (!transactionId || !txRef) {
        throw new Error("The transaction ID and reference are required.");
    }
    const result = await flutterwave("/transactions/" + encodeURIComponent(transactionId) + "/verify");
    const t = result?.data;
    if (result.status !== "success" ||
        t?.status !== "successful" ||
        String(t?.id) !== String(transactionId) ||
        String(t?.tx_ref) !== txRef ||
        String(t?.currency).toUpperCase() !== "NGN") {
        throw new Error("Flutterwave has not verified this payment.");
    }
    return t;
}
function requireExactAmount(paid: unknown, expected: unknown) {
    const a = amountOf(paid);
    const b = amountOf(expected);
    if (Math.round(a * 100) !== Math.round(b * 100)) {
        throw new Error("The verified amount does not match the required price.");
    }
}
/* =========================================================
GLOBAL TRANSACTION LEDGER
========================================================= */
async function claimFlutterwaveTransaction(transactionId: string, paymentTable: string, paymentRecordId: string, txRef: string, userId: string, amount: unknown) {
    const row = {
        transaction_id: String(transactionId),
        payment_table: paymentTable,
        payment_record_id: String(paymentRecordId),
        tx_ref: txRef,
        user_id: userId,
        amount: amountOf(amount),
        currency: "NGN",
    };
    const { error: insertError } = await db
        .from("flutterwave_transaction_ledger")
        .insert(row);
    if (!insertError)
        return;
    if (insertError.code !== "23505") {
        console.error("Ledger insert error:", insertError);
        throw new Error("Could not securely record this Flutterwave transaction.");
    }
    // A retry is permitted only for the exact same payment.
    const { data: byTransaction, error: transactionError } = await db
        .from("flutterwave_transaction_ledger")
        .select("transaction_id, payment_table, payment_record_id, tx_ref, user_id, amount")
        .eq("transaction_id", String(transactionId))
        .maybeSingle();
    if (transactionError) {
        throw new Error("Could not verify the existing transaction record.");
    }
    if (byTransaction &&
        byTransaction.payment_table === paymentTable &&
        String(byTransaction.payment_record_id) === String(paymentRecordId) &&
        byTransaction.tx_ref === txRef &&
        byTransaction.user_id === userId &&
        Math.round(Number(byTransaction.amount) * 100) ===
            Math.round(amountOf(amount) * 100)) {
        return;
    }
    const { data: byPayment, error: paymentError } = await db
        .from("flutterwave_transaction_ledger")
        .select("transaction_id")
        .eq("payment_table", paymentTable)
        .eq("payment_record_id", String(paymentRecordId))
        .maybeSingle();
    if (paymentError) {
        throw new Error("Could not check the payment transaction history.");
    }
    if (byPayment) {
        throw new Error("This payment record already has a different verified transaction.");
    }
    throw new Error("This Flutterwave transaction has already been used for another payment.");
}
/* =========================================================
VERIFY MEMBERSHIP
========================================================= */
async function verifyMembership(userId: string, purpose: string, txRef: string, transactionId: string) {
    const { data: payment, error } = await db
        .from("membership_payments")
        .select("*")
        .eq("tx_ref", txRef)
        .eq("user_id", userId)
        .eq("purpose", purpose)
        .maybeSingle();
    if (error || !payment) {
        throw new Error("The membership payment record was not found.");
    }
    const t = await verifyTransaction(transactionId, txRef);
    requireExactAmount(t.amount, payment.amount);
    const alreadyVerified = ["successful", "verified"].includes(String(payment.status).toLowerCase());
    if (alreadyVerified &&
        String(payment.flw_transaction_id || "") !== String(t.id)) {
        throw new Error("This membership payment was already verified with a different transaction.");
    }
    await claimFlutterwaveTransaction(String(t.id), "membership_payments", String(payment.id), txRef, userId, payment.amount);
    if (!alreadyVerified) {
        const { data: updated, error: updateError } = await db
            .from("membership_payments")
            .update({
            status: "successful",
            flw_transaction_id: String(t.id),
            verified_at: new Date().toISOString(),
        })
            .eq("id", payment.id)
            .eq("user_id", userId)
            .eq("tx_ref", txRef)
            .is("flw_transaction_id", null)
            .select("id");
        if (updateError) {
            throw new Error("Could not save the verified membership payment.");
        }
        if (!updated || updated.length !== 1) {
            const { data: latest, error: latestError } = await db
                .from("membership_payments")
                .select("status, flw_transaction_id")
                .eq("id", payment.id)
                .maybeSingle();
            if (latestError ||
                String(latest?.flw_transaction_id || "") !== String(t.id) ||
                !["successful", "verified"].includes(String(latest?.status || "").toLowerCase())) {
                throw new Error("The membership payment changed during verification. Please retry.");
            }
        }
    }
    // Apply membership even if a previous attempt failed after saving payment.
    const profileUpdate = purpose === "activation"
        ? { is_activated: true }
        : purpose === "vip"
            ? { is_vip: true }
            : null;
    if (!profileUpdate) {
        throw new Error("Unsupported membership type.");
    }
    const { error: profileError } = await db
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);
    if (profileError) {
        throw new Error("Payment verified, but the membership update failed. Retry verification or contact support.");
    }
    return {
        success: true,
        already_verified: alreadyVerified,
    };
}
/* =========================================================
VERIFY POSTER PAYMENT
========================================================= */
async function verifyPosterPayment(userId: string, txRef: string, transactionId: string, paymentId: string, userClient: ReturnType<typeof createClient>) {
    if (!paymentId || !/^\d+$/.test(paymentId)) {
        throw new Error("A valid poster payment ID is required.");
    }
    if (!txRef || !transactionId) {
        throw new Error("The transaction reference and ID are required.");
    }
    const { data: payment, error } = await db
        .from("poster_payments")
        .select("*")
        .eq("id", paymentId)
        .eq("poster_id", userId)
        .eq("tx_ref", txRef)
        .maybeSingle();
    if (error || !payment) {
        throw new Error("The poster payment record was not found.");
    }
    if (String(payment.payment_method || "").toLowerCase() !== "flutterwave") {
        throw new Error("Only Flutterwave payments can be verified here.");
    }
    const t = await verifyTransaction(transactionId, txRef);
    const alreadyPaid = String(payment.payment_status || "").toLowerCase() === "paid";
    if (alreadyPaid &&
        String(payment.flw_transaction_id || "") !== String(t.id)) {
        throw new Error("This payment was already verified with a different transaction.");
    }
    const { data: task, error: taskError } = await db
        .from("tasks")
        .select("id, created_by, active, payment_status")
        .eq("id", payment.task_id)
        .eq("created_by", userId)
        .maybeSingle();
    if (taskError || !task) {
        throw new Error("The task was not found or does not belong to this poster.");
    }
    const { data: expectedAmount, error: amountError } = await userClient.rpc("get_poster_task_payment_amount", { p_task_id: String(payment.task_id) });
    if (amountError) {
        throw new Error("Could not recalculate the required task payment.");
    }
    requireExactAmount(payment.amount, expectedAmount);
    requireExactAmount(t.amount, expectedAmount);
    if (!alreadyPaid &&
        (task.active === true ||
            String(task.payment_status || "").toUpperCase() === "PAID")) {
        throw new Error("This task is already active or paid. Contact support if payment was deducted.");
    }
    await claimFlutterwaveTransaction(String(t.id), "poster_payments", String(payment.id), txRef, userId, payment.amount);
    if (!alreadyPaid) {
        const { data: updated, error: updateError } = await db
            .from("poster_payments")
            .update({
            payment_status: "paid",
            flw_transaction_id: String(t.id),
            verified_at: new Date().toISOString(),
        })
            .eq("id", payment.id)
            .eq("poster_id", userId)
            .eq("tx_ref", txRef)
            .neq("payment_status", "paid")
            .is("flw_transaction_id", null)
            .select("id");
        if (updateError) {
            throw new Error("Could not save the verified poster payment.");
        }
        if (!updated || updated.length !== 1) {
            const { data: latest, error: latestError } = await db
                .from("poster_payments")
                .select("payment_status, flw_transaction_id")
                .eq("id", payment.id)
                .eq("poster_id", userId)
                .maybeSingle();
            if (latestError ||
                String(latest?.payment_status || "").toLowerCase() !== "paid" ||
                String(latest?.flw_transaction_id || "") !== String(t.id)) {
                throw new Error("The payment record changed during verification. Please retry.");
            }
        }
    }
    // Payment is verified, but the task remains subject to admin approval.
    return {
        success: true,
        already_verified: alreadyPaid,
        awaiting_admin_review: true,
    };
}
/* =========================================================
VERIFY MARKETPLACE PAYMENT
========================================================= */
async function verifyMarketplacePayment(_userId: string, _txRef: string, _transactionId: string, _orderId: string) {
    // Fail closed: never mark a Marketplace order paid without protected funds.
    throw new Error("Marketplace checkout is temporarily disabled. No payment was accepted. Do not transfer money directly to a seller.");
}
/* =========================================================
VERIFY ADVERTISEMENT PAYMENT
========================================================= */
async function verifyAdPayment(userId: string, txRef: string, transactionId: string) {
    const { data: payment, error } = await db
        .from("ad_campaign_payments")
        .select("*")
        .eq("payment_reference", txRef)
        .eq("payer_user_id", userId)
        .maybeSingle();
    if (error || !payment) {
        throw new Error("The ad campaign payment was not found.");
    }
    const { data: ad, error: adError } = await db
        .from("platform_ads")
        .select("id, created_by, active")
        .eq("id", payment.ad_id)
        .eq("created_by", userId)
        .maybeSingle();
    if (adError || !ad) {
        throw new Error("The advertisement campaign was not found.");
    }
    const t = await verifyTransaction(transactionId, txRef);
    requireExactAmount(t.amount, payment.amount);
    const alreadyPaid = String(payment.status || "").toLowerCase() === "paid";
    if (alreadyPaid &&
        String(payment.flw_transaction_id || "") !== String(t.id)) {
        throw new Error("This advertisement payment was already verified with a different transaction.");
    }
    await claimFlutterwaveTransaction(String(t.id), "ad_campaign_payments", String(payment.id), txRef, userId, payment.amount);
    if (!alreadyPaid) {
        const { data: updated, error: updateError } = await db
            .from("ad_campaign_payments")
            .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            provider: "flutterwave",
            flw_transaction_id: String(t.id),
        })
            .eq("id", payment.id)
            .eq("payer_user_id", userId)
            .eq("payment_reference", txRef)
            .neq("status", "paid")
            .is("flw_transaction_id", null)
            .select("id");
        if (updateError) {
            throw new Error("Could not save the verified ad payment.");
        }
        if (!updated || updated.length !== 1) {
            const { data: latest, error: latestError } = await db
                .from("ad_campaign_payments")
                .select("status, flw_transaction_id")
                .eq("id", payment.id)
                .maybeSingle();
            if (latestError ||
                String(latest?.status || "").toLowerCase() !== "paid" ||
                String(latest?.flw_transaction_id || "") !== String(t.id)) {
                throw new Error("The advertisement payment changed during verification. Please retry.");
            }
        }
    }
    // Payment does not publish the advertisement automatically.
    return {
        success: true,
        already_verified: alreadyPaid,
        awaiting_admin_approval: true,
    };
}
/* =========================================================
NIGERIAN BANK DIRECTORY AND ACCOUNT NAME RESOLUTION
========================================================= */
async function getNigerianBanks() {
    const result = await flutterwave("/banks/NG?include_provider_type=1", { method: "GET" });
    if (result.status !== "success" || !Array.isArray(result.data)) {
        throw new Error("The Nigerian bank list is temporarily unavailable.");
    }
    return result.data
        .filter((bank: any) => bank && String(bank.code || "").trim() && String(bank.name || "").trim())
        .map((bank: any) => ({
            code: String(bank.code).trim(),
            name: String(bank.name).trim(),
            provider_type: String(bank.provider_type || bank.type || "bank").toLowerCase(),
        }))
        .filter((bank: any) => !bank.provider_type || bank.provider_type.includes("bank"))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
}
async function resolveNigerianAccount(bankCode: string, accountNumber: string) {
    const code = String(bankCode || "").trim();
    const number = String(accountNumber || "").trim();
    if (!/^\d{10}$/.test(number)) {
        throw new Error("Enter a valid 10-digit Nigerian account number.");
    }
    if (!code || code.length > 20) {
        throw new Error("Select a valid bank.");
    }
    const banks = await getNigerianBanks();
    const bank = banks.find((item: any) => item.code === code);
    if (!bank) {
        throw new Error("The selected bank is not supported. Please choose another bank.");
    }
    const result = await flutterwave("/accounts/resolve", {
        method: "POST",
        body: JSON.stringify({ account_number: number, account_bank: code }),
    });
    const resolvedNumber = String(result?.data?.account_number || "").trim();
    const accountName = String(result?.data?.account_name || "").trim();
    if (result.status !== "success" || !accountName || resolvedNumber !== number) {
        throw new Error(result.message || "We could not verify this account. Check the bank and account number.");
    }
    return { bank_code: code, bank_name: bank.name, account_number: number, account_name: accountName };
}
async function createVerifiedWithdrawal(userId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
        throw new Error("Enter a valid withdrawal amount.");
    }
    const settingsData = await settings();
    if (settingsData.withdrawals_enabled === false) {
        throw new Error("Withdrawal requests are currently disabled.");
    }
    const minimum = Number(settingsData.minimum_withdrawal ?? 500);
    if (amount < minimum) {
        throw new Error("Minimum withdrawal is ₦" + minimum.toLocaleString("en-NG") + ".");
    }
    const verified = await resolveNigerianAccount(String(body.bank_code || ""), String(body.account_number || ""));
    const clientName = String(body.account_name || "").trim().toLocaleLowerCase();
    if (!clientName || clientName !== verified.account_name.toLocaleLowerCase()) {
        throw new Error("The verified account details changed. Verify the account again.");
    }
    const dailyLimit = Math.max(1, Number(settingsData.withdrawals_per_day || 1));
    const { data: requestResult, error: requestError } = await db.rpc("create_verified_withdrawal_request", {
        p_user_id: userId,
        p_amount: amount,
        p_daily_limit: dailyLimit,
        p_bank_name: verified.bank_name,
        p_bank_code: verified.bank_code,
        p_account_name: verified.account_name,
        p_account_number: verified.account_number,
    });
    if (requestError || !requestResult?.success) {
        console.error("Atomic verified withdrawal request failed:", requestError);
        throw new Error(requestError?.message || "Your verified withdrawal request could not be saved. Please try again.");
    }
    return { success: true, withdrawal_id: requestResult.withdrawal_id, account_name: verified.account_name, bank_name: verified.bank_name };
}
/* =========================================================
MAIN EDGE FUNCTION
========================================================= */
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: cors(req),
        });
    }
    if (req.method !== "POST") {
        return errorResponse(req, "Use POST.", 405);
    }
    if (!SUPABASE_URL || !SERVICE_KEY || !FLW_SECRET_KEY) {
        return errorResponse(req, "Payment secrets are not configured in Supabase.", 500);
    }
    try {
        const origin = req.headers.get("Origin") || "";
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
            return errorResponse(req, "This website is not permitted to use NAIJA TASK payments.", 403);
        }
        const authHeader = req.headers.get("Authorization") || "";
        if (!authHeader.startsWith("Bearer ")) {
            return errorResponse(req, "Please sign in first.", 401);
        }
        const token = authHeader.slice(7);
        const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                headers: {
                    Authorization: "Bearer " + token,
                },
            },
        });
        const { data: auth, error: authError } = await userClient.auth.getUser(token);
        if (authError || !auth.user) {
            return errorResponse(req, "Your session has expired. Sign in again.", 401);
        }
        const user = auth.user;
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        }
        catch {
            return errorResponse(req, "Invalid JSON request.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return errorResponse(req, "Invalid payment request.");
        }
        const action = String(body.action || "");
        const purpose = String(body.purpose || "");
        const metadata = body.metadata && typeof body.metadata === "object" &&
            !Array.isArray(body.metadata)
            ? body.metadata as Record<string, unknown>
            : {};
        const redirectUrl = action === "initiate"
            ? safeUrl(body.redirect_url)
            : "";
        if (action === "banks") {
            return response(req, { success: true, banks: await getNigerianBanks() });
        }
        if (action === "resolve_account") {
            const resolved = await resolveNigerianAccount(String(body.bank_code || ""), String(body.account_number || ""));
            return response(req, { success: true, ...resolved });
        }
        if (action === "request_withdrawal") {
            return response(req, await createVerifiedWithdrawal(user.id, body));
        }
        if (action === "initiate") {
            if (purpose === "activation" || purpose === "vip") {
                return response(req, await initiateMembership(user, purpose, redirectUrl));
            }
            if (purpose === "poster_task") {
                return response(req, await initiatePosterPayment(user, String(metadata.task_id || ""), redirectUrl, userClient));
            }
            if (purpose === "marketplace") {
                return errorResponse(req, "NAIJA TASK protected marketplace checkout is not enabled yet. No marketplace payment has been initiated. Please do not pay sellers directly.", 503);
            }
            if (purpose === "advertisement") {
                return response(req, await initiateAdCampaign(user, body, redirectUrl));
            }
            if (purpose === "airtime" ||
                purpose === "data" ||
                purpose === "electricity" ||
                purpose === "cable_tv" ||
                purpose === "internet_bill") {
                return errorResponse(req, "This service needs a configured airtime and bill-payment provider before it can be sold.");
            }
            return errorResponse(req, "Unsupported payment purpose.");
        }
        if (action === "verify") {
            const txRef = String(body.tx_ref || "");
            const transactionId = String(body.transaction_id || "");
            if (purpose === "activation" || purpose === "vip") {
                return response(req, await verifyMembership(user.id, purpose, txRef, transactionId));
            }
            if (purpose === "poster_task") {
                return response(req, await verifyPosterPayment(user.id, txRef, transactionId, String(metadata.payment_id || ""), userClient));
            }
            if (purpose === "marketplace") {
                return response(req, await verifyMarketplacePayment(user.id, txRef, transactionId, String(metadata.order_id || "")));
            }
            if (purpose === "advertisement") {
                return response(req, await verifyAdPayment(user.id, txRef, transactionId));
            }
            return errorResponse(req, "Unsupported verification purpose.");
        }
        return errorResponse(req, "Unknown payment action.");
    }
    catch (err) {
        console.error("flutterwave-payments:", err);
        return errorResponse(req, err instanceof Error
            ? err.message
            : "Payment request failed.");
    }
});