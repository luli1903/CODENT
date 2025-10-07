import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 200, body: "OK" };

    // Validación opcional por firma simple
    const secret = process.env.MP_WEBHOOK_SECRET || "";
    const reqId = event.headers["x-request-id"] || "";
    const signature = event.headers["x-signature"] || "";
    if (secret) {
      const expected = crypto.createHmac("sha256", secret).update(reqId).digest("hex");
      if (signature !== expected) {
        console.warn("Firma inválida, ignorando webhook");
        return { statusCode: 200, body: "IGNORED" };
      }
    }

    const body = JSON.parse(event.body || "{}");

    if (body?.type === "payment" && body?.data?.id) {
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const paymentApi = new Payment(client);
      const payment = await paymentApi.get({ id: body.data.id });

      const status = payment.status; // approved / pending / rejected
      const externalRef = payment.external_reference;

      // Aquí podrías actualizar tu BD (orders) con status/externalRef
      console.log("MP webhook:", { paymentId: body.data.id, status, externalRef });
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("mpWebhook error:", e);
    return { statusCode: 200, body: "OK" }; // Respondemos 200 para evitar reintentos infinitos
  }
};
