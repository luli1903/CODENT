// SDK v2 de Mercado Pago
import { MercadoPagoConfig, Preference } from "mercadopago";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { cart = [], customer = {}, shipping = null } = JSON.parse(event.body || "{}");
    if (!Array.isArray(cart) || !customer.email) {
      return { statusCode: 400, body: "Bad Request: cart[] y customer.email son obligatorios" };
    }

    // Ítems principales
    const items = cart.map(p => ({
      id: String(p.id),
      title: String(p.title),
      quantity: Number(p.quantity || 1),
      unit_price: Number(p.unit_price),
      currency_id: "ARS",
      picture_url: p.picture_url || undefined
    }));

    // Envío como ítem extra (si corresponde)
    if (shipping && Number(shipping.cost) > 0) {
      items.push({
        id: "shipping",
        title: `Envío: ${shipping.label || "Envío"}`,
        quantity: 1,
        unit_price: Number(shipping.cost),
        currency_id: "ARS"
      });
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";

    const preferenceBody = {
      items,
      payer: {
        name: customer.name || "",
        surname: customer.surname || "",
        email: customer.email
      },
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

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const pref = new Preference(client);
    const resp = await pref.create({ body: preferenceBody });

    return {
      statusCode: 200,
      body: JSON.stringify({
        preference_id: resp.id,
        init_point: resp.init_point,
        sandbox_init_point: resp.sandbox_init_point,
        external_reference: preferenceBody.external_reference
      })
    };
  } catch (e) {
    console.error("createPreference error:", e);
    return { statusCode: 500, body: "Error creating preference" };
  }
};
