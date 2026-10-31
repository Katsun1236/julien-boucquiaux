import { getStore } from "@netlify/blobs";

const HASH = "5088efd7224c059084ef9dea8a933ab91f0d9f82496d1a14f5c217829da5b245";

export default async (req, context) => {
  const store = getStore("julien-content");

  if (req.method === "GET") {
    try {
      const data = await store.get("overrides", { type: "json" });
      return new Response(JSON.stringify(data || {}), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const auth_hash = body.auth_hash;

      if (auth_hash !== HASH) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 401 });
      }

      const overrides = body.overrides || {};
      await store.setJSON("overrides", overrides);

      return new Response(JSON.stringify({ success: true, message: "Modifications enregistrées !" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};
