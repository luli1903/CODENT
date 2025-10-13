import { MercadoPagoConfig, Preference } from "mercadopago";

export const handler = async (event) => {
  try {
    // 🔎 DIAGNÓSTICO: ver si la función corre y si el token está disponible
    console.log("createPreference ejecutado 🚀");
    console.log("TOKEN:", process.env.MP_ACCESS_TOKEN ? "SET ✅" : "MISSING ❌");

    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || "";
    const baseUrl =
      process.env.URL ||                // producción (dominio principal)
      process.env.DEPLOY_PRIME_URL ||   // deploy previews / branch deploys
      process.env.DEPLOY_URL ||         // fallback
      "https://resonant-faun-ef8805.netlify.app"; // último recurso (tu dominio)

    console.log("BASE_URL:", baseUrl);

    if (!accessToken) return err(500, "MP_ACCESS_TOKEN no definido");
    //if (!accessToken.startsWith("TEST-")) return err(500, "MP_ACCESS_TOKEN no es TEST- (sandbox)");

    const { cart = [], customer = {}, shipping = null } = JSON.parse(event.body || "{}");
    if (!Array.isArray(cart) || !cart.length) return err(400, "cart[] requerido");
    if (!customer.email) return err(400, "customer.email requerido");

    // ✅ Tolerante a distintos nombres de campos de precio y a strings
    const items = cart.map(p => {
      const price =
        p.unit_price ?? p.price ?? p.unitPrice ?? p.precio ?? 0;
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
        picture_url: p.picture_url || p.img || undefined
      };
    });

    // ✅ Acepta shipping.cost o shipping.amount
    const shipCost = shipping ? Number(shipping.cost ?? shipping.amount ?? 0) : 0;
    if (Number.isFinite(shipCost) && shipCost > 0) {
      items.push({
        id: "shipping",
        title: `Envío: ${shipping?.label || shipping?.method || "Envío"}`,
        quantity: 1,
        unit_price: shipCost,
        currency_id: "ARS"
      });
    }

    const preferenceBody = {
      items,
      payer: { name: customer.name || "", surname: customer.surname || "", email: customer.email },
      external_reference: `order_${Date.now()}`,
      statement_descriptor: "CODEN",
      back_urls: {
        success: `${baseUrl}/demo/pago-exitoso.html`,
        pending: `${baseUrl}/demo/pago-pendiente.html`,
        failure: `${baseUrl}/demo/pago-fallido.html`
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/.netlify/functions/mpWebhook`
    };

    console.log("Creando preferencia con:", JSON.stringify(preferenceBody, null, 2));

    const client = new MercadoPagoConfig({ accessToken });
    const pref = new Preference(client);

    let resp;
    try {
      resp = await pref.create({ body: preferenceBody });
      console.log("Preferencia creada ✅", resp?.id);
    } catch (e) {
      console.error("MP create error:", e);
      // Si la SDK trae causa, mostrámosla para leerla en el alert del front
      return err(502, e?.cause?.[0]?.description || e?.message || "Error creando preferencia");
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        preference_id: resp.id,
        init_point: resp.init_point,
        sandbox_init_point: resp.sandbox_init_point,
        external_reference: preferenceBody.external_reference
      })
    };
  } catch (e) {
    console.error("createPreference fatal:", e);
    return err(500, e.message || "Error creating preference");
  }
};

function cors(){ return {
  "Content-Type":"application/json",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
};}
function err(code,msg){ return { statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) }; }
