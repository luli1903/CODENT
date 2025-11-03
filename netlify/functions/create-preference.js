import { MercadoPagoConfig, Preference } from "mercadopago";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const json = (code, data) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json", ...corsHeaders },
  body: JSON.stringify(data)
});

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(200, {});
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

    const accessToken = process.env.MP_ACCESS_TOKEN || "";
    const integratorId = process.env.MP_INTEGRATOR_ID || "";
    if (!accessToken) return json(500, { error: "Missing MP_ACCESS_TOKEN" });

    const body = JSON.parse(event.body || "{}");
    console.log("create-preference payload:", body);

    // Adaptación del payload del carrito CODENT
    let items = body.items;
    if (!items && Array.isArray(body.cart)) {
      items = body.cart.map(it => ({
        title: it.title || it.name || "Producto",
        quantity: Number(it.quantity ?? it.qty ?? 1),
        unit_price: Number(it.unit_price ?? it.price ?? 0),
        currency_id: "ARS"
      }));
    }

    if (!Array.isArray(items) || items.length === 0)
      return json(400, { error: "items[] is required" });

    const payer = body.customer
      ? {
          name: body.customer.name || "",
          surname: body.customer.surname || "",
          email: body.customer.email || "",
          phone: body.customer.phone
            ? { area_code: "", number: body.customer.phone }
            : undefined
        }
      : undefined;

    const shipments = body.shipping
      ? { cost: Number(body.shipping.cost || 0), mode: "not_specified" }
      : undefined;

    // --- ARMAR URL ABSOLUTA SIEMPRE ---
    const proto = event.headers["x-forwarded-proto"] || "https";
    const host = event.headers["x-forwarded-host"] || event.headers["host"] || "";
    const runtimeUrl = host ? `${proto}://${host}` : "";
    const baseUrl =
      process.env.BASE_URL ||
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      runtimeUrl;

    const back_urls = {
      success: `${baseUrl}/checkout/success.html`,
      pending: `${baseUrl}/checkout/pending.html`,
      failure: `${baseUrl}/checkout/failure.html`
    };

    if (!back_urls.success.startsWith("http"))
      return json(400, { error: "Invalid base URL, success back_url must be absolute" });

    const client = new MercadoPagoConfig({
      accessToken,
      options: integratorId ? { integratorId } : undefined
    });
    const preference = new Preference(client);

    const prefData = {
  items,
  payer: payer && payer.email ? {
    ...payer,
    // fuerza datos válidos de prueba
    email: payer.email, // usá el email del buyer test
    identification: { type: "DNI", number: "12345678" }
  } : undefined,
  shipments,
  back_urls,              // absolutas (ya lo dejamos resuelto)
  auto_return: "approved",
  binary_mode: true
  // 🔕 sin payment_methods por ahora (nada de excluded / default / installments)
};



    const pref = await preference.create({ body: prefData });
    const { id, init_point, sandbox_init_point } = pref;
    return json(200, { preferenceId: id, init_point, sandbox_init_point });
  } catch (err) {
    console.error("create-preference error:", err);
    return json(500, { error: err.message || "Internal Server Error" });
  }
};
