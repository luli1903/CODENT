// /netlify/functions/create-preference.js
import { MercadoPagoConfig, Preference } from "mercadopago";

const cors = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
});

export const handler = async (event) => {
  try {
    // Preflight CORS
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };
    }

    const accessToken  = process.env.MP_ACCESS_TOKEN || "";
    const integratorId = process.env.MP_INTEGRATOR_ID || "";
    if (!accessToken) {
      return { statusCode: 500, headers: cors(), body: "Missing MP_ACCESS_TOKEN" };
    }

    const body = JSON.parse(event.body || "{}");
    const {
      items = [],                 // [{ title, quantity, unit_price, currency_id, picture_url, category_id }]
      payer = {},                 // { name, surname, email, phone, address }
      shipments = null,           // { cost, mode: 'not_specified' }
      metadata = {},
      external_reference = "",
      notification_url = "",
      back_urls = {}
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, headers: cors(), body: "items[] is required" };
    }

    const baseUrl =
      process.env.BASE_URL ||
      process.env.URL ||              // dominio principal Netlify
      process.env.DEPLOY_PRIME_URL || // deploy preview / branch
      "";

    const defaultBackUrls = {
      success: `${baseUrl}/checkout/success.html`,
      pending: `${baseUrl}/checkout/pending.html`,
      failure: `${baseUrl}/checkout/failure.html`
    };

    const client = new MercadoPagoConfig({
      accessToken,
      options: integratorId ? { integratorId } : undefined
    });
    const preference = new Preference(client);

    const prefData = {
      items: items.map(it => ({
        title: it.title,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        currency_id: it.currency_id || "ARS",
        picture_url: it.picture_url,
        category_id: it.category_id
      })),
      payer,
      shipments: shipments || undefined,
      back_urls: Object.keys(back_urls).length ? back_urls : defaultBackUrls,
      auto_return: "approved",
      binary_mode: true,
      external_reference: external_reference || undefined,
      metadata: { ...metadata, source: "CODENT" },
      notification_url: notification_url || undefined
    };

    const pref = await preference.create({ body: prefData });
    const { id, init_point, sandbox_init_point } = pref;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...cors() },
      body: JSON.stringify({ preferenceId: id, init_point, sandbox_init_point })
    };
  } catch (err) {
    console.error("create-preference error:", err);
    return { statusCode: 500, headers: cors(), body: `Error: ${err?.message || "Internal Server Error"}` };
  }
};
