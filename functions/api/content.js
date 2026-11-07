/**
 * Cloudflare Pages Function - Gestion du contenu dynamique
 */
const HASH = "5088efd7224c059084ef9dea8a933ab91f0d9f82496d1a14f5c217829da5b245";

export async function onRequestGet(context) {
  try {
    if (context.env.JULIEN_CONTENT) {
      const data = await context.env.JULIEN_CONTENT.get("overrides", "json");
      return new Response(JSON.stringify(data || {}), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (e) {}

  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const auth_hash = body.auth_hash;

    if (auth_hash !== HASH) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 401 });
    }

    const overrides = body.overrides || {};
    if (context.env.JULIEN_CONTENT) {
      await context.env.JULIEN_CONTENT.put("overrides", JSON.stringify(overrides));
    }

    return new Response(JSON.stringify({ success: true, message: "Modifications enregistrées !" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
