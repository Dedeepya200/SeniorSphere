import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TARGET_LANGS = new Set(["en", "te", "hi", "ta", "kn", "ml"]);

interface TranslateRequestBody {
  text?: unknown;
  targetLang?: unknown;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as TranslateRequestBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const targetLang = typeof body.targetLang === "string" ? body.targetLang.trim().toLowerCase() : "";

    if (!text || !targetLang) {
      return jsonResponse({ error: "Missing text or targetLang" }, 400);
    }

    if (!ALLOWED_TARGET_LANGS.has(targetLang)) {
      return jsonResponse({ error: "Unsupported target language" }, 400);
    }

    if (text.length > 5000) {
      return jsonResponse({ error: "Text is too long" }, 400);
    }

    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", targetLang);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Translation provider error:", err);
      return jsonResponse({ error: "Translation failed" }, 500);
    }

    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0]
          .map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? "") : ""))
          .join("")
          .trim()
      : "";

    return jsonResponse({ translated: translated || text });
  } catch (error) {
    console.error("Translation error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
