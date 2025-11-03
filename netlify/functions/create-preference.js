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

    // --- URL absolutas sí o sí ---
const proto = (event.headers["x-forwarded-proto"] || "https");
const host  = (event.headers["x-forwarded-host"] || event.headers["host"] || "");
const runtimeUrl = host ? `${proto}://${host}` : "";

// Permití sobreescribir desde ENV, si no usá lo que detectamos del request
const baseUrl =
  process.env.BASE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  runtimeUrl ||
  "";

// helper para asegurar absoluto
const abs = (u) => {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${baseUrl}${path}`;
};

// Si el front no manda back_urls, ponemos defaults ABSOLUTOS
const defaultsBack = {
  success: abs("/checkout/success.html"),
  pending: abs("/checkout/pending.html"),
  failure: abs("/checkout/failure.html")
};

// Si el body trae back_urls, normalizalas a absoluto
const incomingBack = body.back_urls || {};
const back_urls = {
  success: abs(incomingBack.success) || defaultsBack.success,
  pending: abs(incomingBack.pending) || defaultsBack.pending,
  failure: abs(incomingBack.failure) || defaultsBack.failure
};

// Validación dura: si no hay success absoluto, error claro
if (!back_urls.success || !/^https?:\/\//i.test(back_urls.success)) {
  return json(400, { error: "back_urls.success must be an absolute https URL" });
}


    const client = new MercadoPagoConfig({
      accessToken,
      options: integratorId ? { integratorId } : undefined
    });
    const preference = new Preference(client);

    const prefData = {
  // ...lo que ya tenías (items, payer, shipments, back_urls, etc.)
  auto_return: "approved",
  binary_mode: true,

  // ✅ NO excluimos account_money
  payment_methods: {
  excluded_payment_types: [
    { id: "ticket" },
    { id: "bank_transfer" },
    { id: "atm" },
    { id: "digital_currency" }
  ],
  default_payment_method_id: "visa",
  installments: 1
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
