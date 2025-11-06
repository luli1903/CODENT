import { MercadoPagoConfig, Payment } from "mercadopago";

const ok   = (b="OK") => ({ statusCode: 200, body: typeof b === "string" ? b : JSON.stringify(b) });
const err  = (m= "Error") => ({ statusCode: 500, body: m });

export const handler = async (event) => {
  try {
    const isPost = event.httpMethod === "POST";

    const accessToken = process.env.MP_ACCESS_TOKEN_LIVE;
    if (!accessToken) return err("Missing MP_ACCESS_TOKEN_LIVE");

    const qs   = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const raw  = event.body || "";
    const body = isPost && raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};

    let type = body?.type || body?.action || body?.topic || null;
    let paymentId = body?.data?.id || body?.resource?.id || body?.id || null;

    if (!paymentId && (qs.get("topic") === "payment" || type === "payment")) {
      paymentId = paymentId || qs.get("id");
      type = "payment";
    }

    if (type !== "payment" || !paymentId) {
      console.log("Webhook no-payment o sin id", { type, paymentId, qs: Object.fromEntries(qs) });
      return ok();
    }

    const client  = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const res     = await payment.get({ id: String(paymentId) });

    console.log("MP payment:", {
      id: res.id,
      status: res.status,
      status_detail: res.status_detail,
      external_reference: res.external_reference,
      payer: res.payer?.email,
      amount: res.transaction_amount
    });

    return ok();
  } catch (e) {
    console.error("mp-webhook error:", e);
    return err("Error");
  }
};
