// /netlify/functions/create-preference.js
import { MercadoPagoConfig, Preference } from "mercadopago";

const json = (code, data) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  },
  body: JSON.stringify(data)
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(200, {});
    if (event.httpMethod !== "POST")   return json(405, { error: "Method Not Allowed" });

    const accessToken  = process.env.MP_ACCESS_TOKEN || "";
    const integratorId = process.env.MP_INTEGRATOR_ID || "";
    if (!accessToken) return json(500, { error: "Missing MP_ACCESS_TOKEN" });

    // Body enviado por tu front (cart/customer/shipping) o por el ejemplo (items/payer/shipments)
    const body = JSON.parse(event.body || "{}");
    console.log("create-preference payload:", body);

    // ---- Adaptamos tu payload a lo que requiere MP ----
    let items = body.items;
    let payer = body.payer;
    let shipments = body.shipments;

    // Si vino con tu forma:
    if (!items && Array.isArray(body.cart)) {
      items = body.cart.map(it => ({
        title: it.title || it.name || "Producto",
        quantity: Number(it.quantity ?? it.qty ?? 1),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
        currency_id: "ARS",
        picture_url: it.picture_url || it.image_url || it.image || undefined,
        category_id: it.category_id || undefined
      }));
    }

    if (!payer && body.customer) {
      const c = body.customer;
      payer = {
        name: c.name || "",
        surname: c.surname || "",
        email: c.email || "",
        phone: c.phone ? { area_code: "", number: c.phone } : undefined
      };
    }

    if (!shipments && body.shipping) {
      const s = body.shipping;
      shipments = {
        cost: Number(s.cost || 0),
        mode: "not_specified"
      };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return json(400, { error: "items[] is required" });
    }
    // Filtramos items inválidos
    items = items
      .map(i => ({ ...i, quantity: Number(i.quantity||1), unit_price: Number(i.unit_price||0) }))
      .filter(i => i.quantity > 0 && i.unit_price > 0);

    if (!items.length) return json(400, { error: "items have non-positive price/qty" });

    const baseUrl =
      process.env.BASE_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      "";

    const back_urls = {
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
  items,
  payer,                 // dejalo como lo tenés (si podés, con email del buyer test)
  shipments: shipments || undefined,
  back_urls,
  auto_return: "approved",
  binary_mode: true,

  // 🚫 Forzamos que NO use saldo ni medios guardados
  payment_methods: {
    excluded_payment_methods: [
      { id: "account_money" }     // saldo en cuenta MP
    ],
    excluded_payment_types: [
      { id: "ticket" },           // cupones/boletas
      { id: "bank_transfer" },    // transferencia
      { id: "atm" },
      { id: "digital_currency" },
      { id: "prepaid_card" }      // opcional
      // (dejamos habilitado 'credit_card' y 'debit_card')
    ],
    installments: 1,                 // 1 cuota (simple para sandbox)
    default_payment_method_id: "visa" // sugiere “Tarjeta Visa”
  },
};


    const pref = await preference.create({ body: prefData });
    const { id, init_point, sandbox_init_point } = pref;

    return json(200, { preferenceId: id, init_point, sandbox_init_point });
  } catch (err) {
    console.error("create-preference error:", err);
    return json(500, { error: err?.message || "Internal Server Error" });
  }
};
