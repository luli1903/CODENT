// netlify/functions/mpWebhook.js
export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors(), body: "" };
    }

    // MP a veces manda GET ?topic=payment&id=... o POST {type:'payment', data:{id}}
    const qs = event.queryStringParameters || {};
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}

    const topic = qs.topic || qs.type || body.type || "";
    const id = qs.id || body?.data?.id || body?.data?.resource || null;

    console.log("Webhook recibido:", {
      method: event.httpMethod,
      topic, id, qs, body
    });

    // no hacemos nada más por ahora: solo devolvemos 200
    return { statusCode: 200, headers: cors(), body: "OK" };
  } catch (e) {
    console.error("mpWebhook fatal:", e);
    return { statusCode: 200, headers: cors(), body: "OK" };
  }
};

function cors(){ return {
  "Content-Type":"application/json",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST,GET,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
};}
