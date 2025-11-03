// /netlify/functions/mp-webhook.js
import { MercadoPagoConfig, Payment } from "mercadopago";

// (opcional) si vas a actualizar en Supabase
// import { createClient } from "@supabase/supabase-js";

const ok   = (b="OK") => ({ statusCode: 200, body: typeof b === "string" ? b : JSON.stringify(b) });
const err  = (m= "Error") => ({ statusCode: 500, body: m });

export const handler = async (event) => {
  try {
    // MP envía POST (nuevo) y algunas integraciones antiguas usan GET/POST con query topic/id
    const isPost = event.httpMethod === "POST";

    // ✅ Token LIVE
    const accessToken = process.env.MP_ACCESS_TOKEN_LIVE;
    if (!accessToken) return err("Missing MP_ACCESS_TOKEN_LIVE");

    // Datos posibles
    const qs   = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const raw  = event.body || "";
    const body = isPost && raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};

    // 1) Formato nuevo: { type: 'payment', data: { id } } o action:'payment.created'
    let type = body?.type || body?.action || body?.topic || null;
    let paymentId = body?.data?.id || body?.resource?.id || body?.id || null;

    // 2) Formato viejo: ?topic=payment&id=123456 (puede venir por GET o POST)
    if (!paymentId && (qs.get("topic") === "payment" || type === "payment")) {
      paymentId = paymentId || qs.get("id");
      type = "payment";
    }

    // Si no sabemos qué es, devolvemos 200 para que MP no reintente infinito
    if (type !== "payment" || !paymentId) {
      console.log("Webhook no-payment o sin id", { type, paymentId, qs: Object.fromEntries(qs) });
      return ok();
    }

    // Traer el pago desde MP (LIVE)
    const client  = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const res     = await payment.get({ id: String(paymentId) });

    console.log("MP payment:", {
      id: res.id,
      status: res.status,
      status_detail: res.status_detail,
      external_reference: res.external_reference,
      payer: res.payer?.email,
      amount: res.transaction_amount
    });

    // ====== (OPCIONAL) Actualizar tu DB (Supabase) ======
    // Para usar esto:
    // 1) Agregá en Netlify: SUPABASE_URL, SUPABASE_SERVICE_ROLE
    // 2) Descomentá este bloque

    /*
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // Mapear estados de MP a tus estados internos
    const mapStatus = (s) => (s === "approved" ? "paid" : s === "pending" ? "pending" : "failed");

    const update = {
      mp_payment_id: res.id,
      mp_status: res.status,
      mp_status_detail: res.status_detail,
      payer_email: res.payer?.email || null,
      amount: res.transaction_amount || null,
      status: mapStatus(res.status),
      paid_at: res.status === "approved" ? new Date().toISOString() : null
    };

    // Buscamos la orden por external_reference (que enviaste al crear la preferencia)
    const { error } = await supa
      .from("orders")
      .update(update)
      .eq("external_reference", res.external_reference);

    if (error) console.error("Supabase update error:", error);
    */

    return ok();
  } catch (e) {
    console.error("mp-webhook error:", e);
    return err("Error");
  }
};
