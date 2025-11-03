// /netlify/functions/mp-webhook.js
import { MercadoPagoConfig, Payment } from "mercadopago";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || "";
    if (!accessToken) return { statusCode: 500, body: "Missing MP_ACCESS_TOKEN" };

    const data = JSON.parse(event.body || "{}");
    const type = data?.type || data?.action || data?.topic;

    const paymentId =
      data?.data?.id ||
      data?.resource?.id ||
      data?.id ||
      null;

    if (type === "payment" && paymentId) {
      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);
      const res = await payment.get({ id: paymentId.toString() });

      console.log("Payment status:", {
        id: res.id,
        status: res.status,
        status_detail: res.status_detail,
        external_reference: res.external_reference
      });

      // TODO: actualizar tu DB (Supabase) con estado de orden acá
    } else {
      console.log("Webhook recibido:", data);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("mp-webhook error:", err);
    return { statusCode: 500, body: "Error" };
  }
};
