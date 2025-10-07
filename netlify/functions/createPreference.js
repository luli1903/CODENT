import { MercadoPagoConfig, Preference } from "mercadopago";

export const handler = async (event) => {
  try {
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


    if (!accessToken) return err(500, "MP_ACCESS_TOKEN no definido");
    if (!accessToken.startsWith("TEST-")) return err(500, "MP_ACCESS_TOKEN no es TEST- (sandbox)");

    const { cart = [], customer = {}, shipping = null } = JSON.parse(event.body || "{}");
    if (!Array.isArray(cart) || !customer.email) return err(400, "cart[] y customer.email son obligatorios");

    const items = cart.map(p => ({
      id: String(p.id), title: String(p.title), quantity: Number(p.quantity || 1),
      unit_price: Number(p.unit_price), currency_id: "ARS", picture_url: p.picture_url || undefined
    }));

    if (shipping && Number(shipping.cost) > 0) {
      items.push({ id: "shipping", title: `Envío: ${shipping.label || "Envío"}`, quantity: 1, unit_price: Number(shipping.cost), currency_id: "ARS" });
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

    const client = new MercadoPagoConfig({ accessToken });
    const pref = new Preference(client);

    let resp;
    try {
      resp = await pref.create({ body: preferenceBody });
    } catch (e) {
      console.error("MP create error:", e);
      return err(502, e?.cause?.[0]?.description || e?.message || "Error creando preferencia");
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({
      preference_id: resp.id, init_point: resp.init_point, sandbox_init_point: resp.sandbox_init_point,
      external_reference: preferenceBody.external_reference
    })};
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
