import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const DATA_SERVICES = [
  { id: "mtn-data", network: "MTN" },
  { id: "airtel-data", network: "Airtel" },
  { id: "glo-data", network: "Glo" },
  { id: "etisalat-data", network: "9mobile" },
];

const AIRTIME_SERVICES = [
  { id: "mtn", network: "MTN" },
  { id: "airtel", network: "Airtel" },
  { id: "glo", network: "Glo" },
  { id: "etisalat", network: "9mobile" },
];

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function requestId() {
  const d = new Date();
  const stamp = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCHours()).padStart(2, "0"),
    String(d.getUTCMinutes()).padStart(2, "0"),
  ].join("");
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return stamp + Array.from(bytes, b => String(b % 10)).join("");
}

function providerStatus(payload: any) {
  const code = String(payload?.code ?? payload?.response_code ?? "");
  const state = String(payload?.content?.transactions?.status ?? payload?.status ?? "").toLowerCase();
  if (code === "000" && ["delivered", "successful", "success", "completed"].includes(state)) return "successful";
  if (["016", "010", "011", "012", "013", "017", "018", "023", "027"].includes(code)) return "failed";
  if (/fail|error|rejected/.test(state)) return "failed";
  return "pending";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") return reply(405, { ok: false, message: "Use POST." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("VTPASS_API_KEY") || Deno.env.get("VT_PASS_API_KEY");
  const publicKey = Deno.env.get("VTPASS_PUBLIC_KEY") || Deno.env.get("VT_PASS_PUBLIC_KEY");
  const secretKey = Deno.env.get("VTPASS_SECRET_KEY") || Deno.env.get("VT_PASS_SECRET_KEY");
  const configuredBase = Deno.env.get("VTPASS_BASE_URL") || Deno.env.get("VT_PASS_BASE_URL") || "";
  const base = configuredBase.replace(/\/(pay|requery|service-variations)\/?$/, "").replace(/\/$/, "");
  const baseUrlIsExplicit = /^https:\/\/(www\.)?vtpass\.com(\/|$)/i.test(base) && !/sandbox/i.test(base);
  const envPurchasesEnabled = Deno.env.get("VTPASS_ENABLE_PURCHASES") === "true";
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return reply(503, { ok: false, message: "Airtime/Data service configuration is incomplete. No wallet debit was made." });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return reply(401, { ok: false, message: "Please sign in first. No wallet debit was made." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply(401, { ok: false, message: "Your session is invalid. No wallet debit was made." });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any;
  try { body = await req.json(); } catch { return reply(400, { ok: false, message: "Invalid JSON request." }); }
  const action = String(body?.action || "");

  // Fail closed: both the deployment switch and platform setting must allow purchases.
  const { data: serviceSettings, error: settingsError } = await admin
    .from("platform_settings")
    .select("airtime_service_enabled,data_service_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (settingsError || !serviceSettings) {
    return reply(503, { ok: false, message: "Airtime/Data settings could not be verified. No wallet debit was made." });
  }
  const airtimeEnabled = serviceSettings.airtime_service_enabled === true;
  const dataEnabled = serviceSettings.data_service_enabled === true;
  const purchasesEnabled = envPurchasesEnabled && (airtimeEnabled || dataEnabled);
  const livePurchasesEnabled = purchasesEnabled && baseUrlIsExplicit;

  if (action === "catalog") {
    if (!apiKey || !publicKey) return reply(503, { ok: false, message: "VTpass catalogue credentials are missing. No wallet debit was made." });
    const collected: any[] = [];
    const errors: string[] = [];
    const syncedServices: string[] = [];

    for (const service of DATA_SERVICES) {
      try {
        const url = base + "/service-variations?serviceID=" + encodeURIComponent(service.id);
        const response = await fetch(url, {
          headers: { "api-key": apiKey, "public-key": publicKey, "Accept": "application/json" },
          signal: AbortSignal.timeout(20000),
        });
        const payload = await response.json();
        if (!response.ok || String(payload?.code ?? payload?.response_description ?? "") !== "000") {
          errors.push(service.network + " data catalogue unavailable");
          continue;
        }
        syncedServices.push(service.id);
        const variations = payload?.content?.variations ?? payload?.content?.varations ?? [];
        for (const item of variations) {
          const price = Number(item.variation_amount);
          if (!item.variation_code || !Number.isFinite(price) || price <= 0) continue;
          collected.push({
            name: String(item.name || service.network + " Data"),
            type: "data",
            product_type: "data",
            network: service.network,
            amount: price,
            provider_amount: price,
            selling_price: price,
            data_size: String(item.name || ""),
            service_id: service.id,
            variation_code: String(item.variation_code),
            active: true,
          });
        }
      } catch {
        errors.push(service.network + " data catalogue request failed");
      }
    }

    // VTpass can repeat a variation_code in its catalogue response.
    // Postgres cannot upsert the same conflict key twice in one statement (SQLSTATE 21000),
    // so retain one deterministic row per service + variation before writing.
    const uniqueCollected = [...new Map(
      collected.map(item => [item.service_id + ":" + item.variation_code, item]),
    ).values()];

    if (uniqueCollected.length) {
      const { error } = await admin.from("airtime_data_products").upsert(uniqueCollected, { onConflict: "service_id,variation_code" });
      if (error) return reply(500, { ok: false, message: "Could not save VTpass plans: " + error.message });
      const activeKeys = uniqueCollected.map(x => x.service_id + ":" + x.variation_code);
      for (const service of DATA_SERVICES.filter(s => syncedServices.includes(s.id))) {
        const { data: existing } = await admin.from("airtime_data_products")
          .select("id,service_id,variation_code")
          .eq("service_id", service.id);
        const stale = (existing || []).filter(x => !activeKeys.includes(x.service_id + ":" + x.variation_code)).map(x => x.id);
        if (stale.length) await admin.from("airtime_data_products").update({ active: false }).in("id", stale);
      }
    }

    const airtimeRows = AIRTIME_SERVICES.map(s => ({
      name: s.network + " Airtime",
      type: "airtime",
      product_type: "airtime",
      network: s.network,
      amount: 0,
      provider_amount: 0,
      selling_price: 0,
      data_size: null,
      service_id: s.id,
      variation_code: "airtime-fixed",
      active: true,
    }));
    const { error: airtimeError } = await admin.from("airtime_data_products").upsert(airtimeRows, { onConflict: "service_id,variation_code" });
    if (airtimeError) return reply(500, { ok: false, message: "Could not prepare airtime services: " + airtimeError.message });

    const { data: products, error: readError } = await admin.from("airtime_data_products")
      .select("id,name,type,product_type,network,amount,selling_price,data_size,service_id,variation_code,active")
      .eq("active", true)
      .order("network").order("amount");
    if (readError) return reply(500, { ok: false, message: readError.message });
    return reply(200, { ok: true, products: products || [], plans_synced: uniqueCollected.length, warnings: errors, purchases_enabled: livePurchasesEnabled });
  }

  if (action === "purchase" && !livePurchasesEnabled) {
    return reply(503, { ok: false, message: "VTpass purchases are safely disabled until an explicit production VTPass URL and purchase credentials are configured. No wallet debit was made." });
  }

  if (!apiKey || !secretKey) {
    return reply(503, { ok: false, message: "VTpass purchase credentials are missing. No wallet debit was made." });
  }

  if (action === "purchase") {
    const productId = String(body?.product_id || "");
    const phone = String(body?.phone || "").replace(/\D/g, "");
    const orderType = String(body?.order_type || "");
    const amount = body?.amount == null ? null : Number(body.amount);
    if (!/^[0-9a-f-]{36}$/i.test(productId) || !/^\d{10,14}$/.test(phone) || !["airtime", "data"].includes(orderType)) {
      return reply(400, { ok: false, message: "Check the selected product, service type and recipient phone number." });
    }
    if (orderType === "airtime" && (!Number.isFinite(amount) || amount < 50 || amount > 50000)) {
      return reply(400, { ok: false, message: "Airtime amount must be between ₦50 and ₦50,000." });
    }
    if ((orderType === "airtime" && !airtimeEnabled) || (orderType === "data" && !dataEnabled)) {
      return reply(503, { ok: false, message: "This purchase type is currently disabled by NAIJA TASK. No wallet debit was made." });
    }

    const rid = requestId();
    const { data: reservation, error: reserveError } = await admin.rpc("vtpass_reserve_order", {
      p_user_id: authData.user.id,
      p_product_id: productId,
      p_phone: phone,
      p_order_type: orderType,
      p_request_id: rid,
      p_amount: amount,
    });
    if (reserveError) return reply(400, { ok: false, message: reserveError.message, wallet_charged: false });

    const { data: product, error: productError } = await admin.from("airtime_data_products")
      .select("service_id,variation_code,network,name")
      .eq("id", productId).single();
    if (productError || !product) {
      await admin.rpc("vtpass_refund_order", { p_user_id: authData.user.id, p_order_id: reservation.order_id, p_reason: "Product lookup failed before provider request" });
      return reply(500, { ok: false, message: "Could not verify selected product. Wallet refund was requested." });
    }

    const providerPayload: Record<string, unknown> = {
      request_id: rid,
      serviceID: product.service_id,
      billersCode: phone,
      phone,
    };
    if (orderType === "data") {
      providerPayload.variation_code = product.variation_code;
      providerPayload.amount = reservation.amount;
    } else {
      providerPayload.amount = reservation.amount;
    }

    let providerResponse: any;
    try {
      const response = await fetch(base + "/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey, "secret-key": secretKey, "Accept": "application/json" },
        body: JSON.stringify(providerPayload),
        signal: AbortSignal.timeout(25000),
      });
      providerResponse = await response.json();
      // Never treat a provider error HTTP response as a successful purchase,
      // even if its JSON body contains a success-looking status. Keep the debit
      // reserved as pending and require a later provider requery.
      if (!response.ok) throw new Error("VTpass returned HTTP " + response.status);
    } catch {
      await admin.from("airtime_data_orders").update({
        status: "pending",
        provider_reference: rid,
        provider_response: { note: "Provider response was not received; requery is required.", code: "NETWORK_UNKNOWN" },
        updated_at: new Date().toISOString(),
      }).eq("id", reservation.order_id);
      return reply(202, { ok: true, status: "pending", order_id: reservation.order_id, request_id: rid, amount: reservation.amount, message: "The provider has not confirmed the result yet. Your debit is held safely while the transaction is checked. Do not repeat the purchase." });
    }

    const state = providerStatus(providerResponse);
    const providerRef = String(providerResponse?.content?.transactions?.transactionId || providerResponse?.requestId || rid);
    await admin.from("airtime_data_orders").update({
      status: state,
      provider_reference: providerRef,
      provider_response: providerResponse,
      updated_at: new Date().toISOString(),
    }).eq("id", reservation.order_id);

    if (state === "failed") {
      const refund = await admin.rpc("vtpass_refund_order", {
        p_user_id: authData.user.id,
        p_order_id: reservation.order_id,
        p_reason: String(providerResponse?.response_description || providerResponse?.code || "VTpass transaction failed"),
      });
      if (refund.error) return reply(500, { ok: false, status: "refund_review", order_id: reservation.order_id, message: "Provider declined the transaction but the automatic refund needs review. Contact support with this order reference." });
      return reply(200, { ok: false, status: "failed", order_id: reservation.order_id, refunded: true, message: "The provider could not complete the purchase. Your wallet has been refunded." });
    }
    if (state === "successful") {
      return reply(200, { ok: true, status: "successful", order_id: reservation.order_id, amount: reservation.amount, message: "Purchase completed successfully." });
    }
    return reply(202, { ok: true, status: "pending", order_id: reservation.order_id, request_id: rid, amount: reservation.amount, message: "Your purchase is processing. Do not submit it again; check its status shortly." });
  }

  if (action === "requery") {
    const orderId = String(body?.order_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return reply(400, { ok: false, message: "Invalid order reference." });
    const { data: order, error } = await admin.from("airtime_data_orders")
      .select("id,user_id,request_id,status,wallet_refunded_at")
      .eq("id", orderId).eq("user_id", authData.user.id).single();
    if (error || !order) return reply(404, { ok: false, message: "Order not found." });
    if (!order.request_id) return reply(400, { ok: false, message: "This order has no provider reference." });
    if (order.wallet_refunded_at) return reply(200, { ok: true, status: "failed", refunded: true, message: "This order has already been refunded." });
    if (["successful", "delivered", "completed"].includes(String(order.status).toLowerCase())) {
      return reply(200, { ok: true, status: "successful", message: "This purchase is already confirmed." });
    }

    let response: Response;
    try {
      response = await fetch(base + "/requery", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey, "secret-key": secretKey, "Accept": "application/json" },
        body: JSON.stringify({ request_id: order.request_id }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return reply(202, { ok: true, status: "pending", message: "The provider could not be reached. No refund or success was recorded; your order remains reserved for another status check." });
    }
    if (!response.ok) {
      return reply(202, { ok: true, status: "pending", message: "The provider status check returned an error. No refund or success was recorded; check again later." });
    }
    let provider: any;
    try {
      provider = await response.json();
    } catch {
      return reply(202, { ok: true, status: "pending", message: "The provider returned an unreadable status. No refund or success was recorded; check again later." });
    }
    const state = providerStatus(provider);
    await admin.from("airtime_data_orders").update({
      status: state,
      provider_reference: String(provider?.content?.transactions?.transactionId || order.request_id),
      provider_response: provider,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);

    if (state === "failed") {
      const refund = await admin.rpc("vtpass_refund_order", {
        p_user_id: authData.user.id,
        p_order_id: orderId,
        p_reason: String(provider?.response_description || provider?.code || "VTpass requery confirmed failure"),
      });
      if (refund.error) return reply(500, { ok: false, status: "refund_review", message: "The provider reports failure, but refund needs support review." });
      return reply(200, { ok: false, status: "failed", refunded: true, message: "The provider confirmed failure. Your wallet has been refunded." });
    }
    if (state === "successful") return reply(200, { ok: true, status: "successful", message: "Your purchase has been confirmed." });
    return reply(202, { ok: true, status: "pending", message: "The provider has not confirmed the transaction yet. Your funds remain reserved; check again later." });
  }

  return reply(400, { ok: false, message: "Unknown action." });
});
