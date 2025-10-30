// /netlify/functions/create-preference.js
import { MercadoPagoConfig, Preference } from "mercadopago";

export const handler = async (event) => {
  try {
    console.log("createPreference ejecutado 🚀");
    console.log("TOKEN:", process.env.MP_ACCESS_TOKEN ? "SET ✅" : "MISSING ❌");

    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || "";
    const integratorId = process.env.MP_INTEGRATOR_ID || ""; // opcional
    const baseUrl =
      process.env.URL ||                // producción (dominio principal)
      process.env.DEPLOY_PRIME_URL ||   // deploy previews / branch deploys
      process.env.DEPLOY_URL ||         // fallback
      "https://resonant-faun-ef8805.netlify.app"; // último recurso

    console.log("BASE_URL:", baseUrl);
    if (!accessToken) return err(500, "MP_ACCESS_TOKEN no definido");

    // Body esperado: { cart:[], customer:{name,surname,email,phone?}, shipping:{method,label,cost,address{...}} }
    const { cart = [], customer = {}, shipping = null } = JSON.parse(event.body || "{}");
    if (!Array.isArray(cart) || !cart.length) return err(400, "cart[] requerido");
    if (!customer.email) return err(400, "customer.email requerido");

    // ==== Items (normalize + validar precios) ====
    const items = cart.map((p) => {
      const price = p.unit_price ?? p.price ?? p.unitPrice ?? p.precio ?? 0;
      const unit_price = Number(price);
      if (!Number.isFinite(unit_price) || unit_price <= 0) {
        throw new Error(`Precio inválido para item ${p.title || p.id} -> ${price}`);
      }
      return {
        id: String(p.id ?? ""),
        title: String(p.title ?? "Producto"),
        quantity: Number(p.quantity ?? 1),
        unit_price,
        currency_id: "ARS",
        picture_url: p.picture_url || p.img || undefined,
      };
    });

    // Ítem de envío extra (para que el total cierre con el cliente)
    const shipCost = shipping ? Number(shipping.cost ?? shipping.amount ?? 0) : 0;
    if (Number.isFinite(shipCost) && shipCost > 0) {
      items.push({
        id: "shipping",
        title: `Envío: ${shipping?.label || shipping?.method || "Envío"}`,
        quantity: 1,
        unit_price: shipCost,
        currency_id: "ARS",
      });
    }

    // ==== Dirección de envío real (queda registrada en la preferencia/pago) ====
    const shipments =
      (shipping?.method === "home")
        ? {
            mode: "not_specified", // no usamos Mercado Envíos automático
            cost: Number(shipping.cost || 0),
            receiver_address: {
              zip_code: shipping.address?.zip || "",
              street_name: shipping.address?.street || "",
              street_number: Number(shipping.address?.number || 0),
              floor: shipping.address?.floor || "",
              apartment: shipping.address?.floor || "",
              city_name: shipping.address?.city || "",
              state_name: shipping.address?.state || "",
            },
          }
        : undefined;

    // ==== Preferencia ====
    const preferenceBody = {
      items,
      payer: {
        name: customer.name || "",
        surname: customer.surname || "",
        email: customer.email,
        phone: customer.phone ? { area_code: "", number: customer.phone } : undefined,
      },
      external_reference: `order_${Date.now()}`,
      statement_descriptor: "CODENT",
      back_urls: {
        success: `${baseUrl}/carrito.html?mp=success`,
        pending: `${baseUrl}/carrito.html?mp=pending`,
        failure: `${baseUrl}/carrito.html?mp=failure`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/.netlify/functions/mpWebhook`, // asegurate que exista esa función
      shipments, // ← dirección y costo de envío
      metadata: {
        project: "CODENT",
        shipping_selected: shipping?.label || shipping?.method || "",
        address: shipping?.address || null,
      },
    };

    console.log("Creando preferencia con:", JSON.stringify(preferenceBody, null, 2));

    const client = new MercadoPagoConfig({ accessToken, ...(integratorId ? { options: { integratorId } } : {}) });
    const pref = new Preference(client);

    let resp;
    try {
      resp = await pref.create({ body: preferenceBody });
      console.log("Preferencia creada ✅", resp?.id);
    } catch (e) {
      console.error("MP create error:", e);
      return err(502, e?.cause?.[0]?.description || e?.message || "Error creando preferencia");
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        id: resp.id, // para Wallet Brick si más adelante lo querés usar
        init_point: resp.init_point,
        sandbox_init_point: resp.sandbox_init_point,
        external_reference: preferenceBody.external_reference,
      }),
    };
  } catch (e) {
    console.error("createPreference fatal:", e);
    return err(500, e.message || "Error creating preference");
  }
};

function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function err(code, msg) {
  return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) };
}
