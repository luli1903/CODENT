// /netlify/functions/create-preference.js
import { MercadoPagoConfig, Preference } from "mercadopago";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
const json = (code, data) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", ...cors },
  body: JSON.stringify(data)
});

export const handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") return json(200, {});
    if (event.httpMethod !== "POST")   return json(405, { error: "Method Not Allowed" });

    const body = JSON.parse(event.body || "{}");

    // ==============================
    //   USAR TOKEN REAL (LIVE)
    // ==============================
    const ACCESS = process.env.MP_ACCESS_TOKEN_LIVE || "";
    if (!ACCESS) return json(500, { error: "Falta MP_ACCESS_TOKEN_LIVE en Netlify" });

    // Adaptar items desde tu payload (cart[])
    let items = body.items;
    if (!items && Array.isArray(body.cart)) {
      items = body.cart.map(it => ({
        title: it.title || it.name || "Producto",
        quantity: Number(it.quantity ?? it.qty ?? 1),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
        currency_id: "ARS"
      }));
    }
    if (!Array.isArray(items) || !items.length) return json(400, { error: "items[] is required" });
    items = items
      .map(i => ({ ...i, quantity: Number(i.quantity || 1), unit_price: Number(i.unit_price || 0) }))
      .filter(i => i.quantity > 0 && i.unit_price > 0);
    if (!items.length) return json(400, { error: "items have non-positive price/qty" });

    // URLs absolutas para volver al sitio
    const proto = event.headers["x-forwarded-proto"] || "https";
    const host  = event.headers["x-forwarded-host"] || event.headers["host"] || "";
    const base  =
      process.env.BASE_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      (host ? `${proto}://${host}` : "");

    const back_urls = {
      success: `${base}/checkout/success.html`,
      pending: `${base}/checkout/pending.html`,
      failure: `${base}/checkout/failure.html`
    };

    // Cliente MP (LIVE)
    const client = new MercadoPagoConfig({ accessToken: ACCESS });
    const preference = new Preference(client);

    // Preferencia mínima y limpia (sin restricciones de medios)
    const prefData = {
      items,
      back_urls,
      auto_return: "approved",
      binary_mode: true,
      external_reference: body.external_reference || `CODENT-${Date.now()}`,
      metadata: { env: "live" }
    };

    const pref = await preference.create({ body: prefData });
    const { id, init_point } = pref;

    // En LIVE se usa init_point
    return json(200, { preferenceId: id, init_point });
  } catch (err) {
    console.error("create-preference error:", err);
    return json(500, { error: err?.message || "Internal Server Error" });
  }
};
