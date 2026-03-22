import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

type Severity = "safe" | "low" | "medium" | "high";
type ModerationSource = "gemini" | "regex";

interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  severity: Severity;
  source: ModerationSource;
  geminiUsed?: boolean;
  geminiWorked?: boolean;
}

interface ModerationRequestBody {
  content?: unknown;
  postId?: unknown;
}

const RULES: Array<{ severity: Exclude<Severity, "safe">; reason: string; patterns: RegExp[] }> = [
  {
    severity: "high",
    reason: "Potential scam or payment request",
    patterns: [
      /\b(?:send|transfer|pay|deposit)\b.{0,30}\b(?:money|cash|upi|gift card|crypto|bitcoin)\b/i,
      /\b(?:otp|one[- ]time password|verification code|bank pin|cvv)\b/i,
      /\b(?:click|open)\b.{0,20}\b(?:link|url)\b.{0,30}\b(?:win|prize|claim|reward)\b/i,
      /\b(?:urgent|immediately|right now)\b.{0,25}\b(?:pay|transfer|send)\b/i,
      /\b(?:lottery|inheritance|investment return|guaranteed profit)\b/i,
    ],
  },
  {
    severity: "high",
    reason: "Dangerous medical advice",
    patterns: [
      /\b(?:stop|skip|throw away|avoid|don't)\b.{0,25}\b(?:medicine|medication|insulin|tablet|doctor|treatment)\b/i,
      /\b(?:stop|quit|avoid|skip|throw away)\b.{0,25}\b(?:your|the)?\s*(?:meds|medicines|medication|insulin|pills|tablets|bp medicine|blood pressure medicine)\b/i,
      /\b(?:don't need|do not need|no need for)\b.{0,20}\b(?:doctor|hospital|medicine|medication|insulin|treatment)\b/i,
      /\b(?:cure|treat)\b.{0,25}\b(?:cancer|stroke|diabetes|heart attack)\b.{0,20}\b(?:instantly|guaranteed|without doctor)\b/i,
      /\b(?:home remedy|herbal remedy|natural remedy|kadha|juice|tea)\b.{0,25}\b(?:cures?|treats?|reverses?)\b.{0,25}\b(?:diabetes|cancer|stroke|bp|blood pressure|heart disease)\b/i,
      /\b(?:insulin|medicine|medication|tablet|pill)\b.{0,25}\b(?:is poison|is a scam|will kill you)\b/i,
      /\b(?:replace|use)\b.{0,20}\b(?:bleach|kerosene|industrial alcohol|urine)\b.{0,20}\b(?:as|for)\b.{0,20}\b(?:medicine|treatment|remedy)\b/i,
    ],
  },
  {
    severity: "high",
    reason: "Threatening or self-harm content",
    patterns: [
      /\b(?:i will kill you|i'll kill you|hurt you badly|attack you)\b/i,
      /\b(?:kill myself|end my life|suicide|want to die)\b/i,
      /\b(?:better off dead|should die|deserve to die|go and die)\b/i,
      /\b(?:dead soon|going to die soon|you will die)\b/i,
      /\b(?:take your life|end it all|not worth living|want death)\b/i,
      /\b(?:death threat|threaten(?:ing)? death|wish you death)\b/i,
      /\b(?:murder|stab you|beat you to death|hang myself)\b/i,
      /\b(?:kill|die|death)\b/i,
    ],
  },
  {
    severity: "medium",
    reason: "Abusive or hateful language",
    patterns: [
      /\b(?:idiot|stupid|useless|hate you|shut up)\b/i,
      /\b(?:kill yourself|go die)\b/i,
      /\b(?:old hag|worthless fool|disgusting people)\b/i,
    ],
  },
  {
    severity: "medium",
    reason: "Spam or promotional content",
    patterns: [
      /\b(?:limited offer|buy now|work from home|guaranteed income|earn \$?\d+)\b/i,
      /\b(?:subscribe now|promo code|discount code)\b/i,
      /\b(?:dm me for price|message me to earn|join my business)\b/i,
    ],
  },
];

const SAFE_RESULT: ModerationResult = { flagged: false, reason: null, severity: "safe", source: "regex" };

function moderateContentFallback(content: string): ModerationResult {
  const normalized = content.trim();
  if (!normalized) {
    return SAFE_RESULT;
  }

  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { flagged: true, reason: rule.reason, severity: rule.severity, source: "regex" };
    }
  }

  const urlCount = (normalized.match(/https?:\/\//gi) || []).length;
  if (urlCount >= 3) {
    return { flagged: true, reason: "Too many links", severity: "medium", source: "regex" };
  }

  return SAFE_RESULT;
}

function normalizeModerationResult(value: unknown): ModerationResult | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const flagged = candidate.flagged;
  const reason = candidate.reason;
  const severity = candidate.severity;
  const source = candidate.source;

  if (typeof flagged !== "boolean") return null;
  if (!(reason === null || typeof reason === "string")) return null;
  if (severity !== "safe" && severity !== "low" && severity !== "medium" && severity !== "high") return null;
  if (source !== undefined && source !== "gemini" && source !== "regex") return null;

  return {
    flagged,
    reason: flagged ? (typeof reason === "string" && reason.trim() ? reason.trim() : "Flagged by AI moderation") : null,
    severity,
    source: source === "regex" ? "regex" : "gemini",
  };
}

async function moderateWithGemini(content: string, apiKey: string): Promise<ModerationResult | null> {
  const testMode = content.includes("__TEST_GEMINI__");
  console.log("[moderate-content] Gemini request start", {
    testMode,
    contentLength: content.length,
    apiKeyPresent: Boolean(apiKey),
    model: GEMINI_MODEL,
  });

  const response = await fetch(GEMINI_OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `You are a content moderator for a senior citizens community platform called SeniorSphere.
Analyze the user's content for:
1. Misleading medical or health advice
2. Scam, phishing, or payment fraud attempts
3. Hate speech, bullying, harassment, or abusive language
4. Dangerous misinformation
5. Spam or promotional abuse
6. Threats of violence or self-harm

Be lenient with ordinary social posts, greetings, food sharing, event updates, or casual conversation.
Flag scams, requests for financial secrets, dangerous medical claims, threats, severe harassment, and repeated promotional spam.
Flag claims telling people to stop prescribed medicine, skip insulin, avoid doctors, or use unverified remedies for serious disease.
Flag statements encouraging death, suicide, wishing death on others, or threatening that someone will die.
Do not flag harmless opinions, casual disagreements, or normal community chatter.

Return only the moderation result through the provided function.`,
        },
        {
          role: "user",
          content: `Content to moderate: "${content}"`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "moderate_content",
            description: "Return the moderation decision for the submitted content",
            parameters: {
              type: "object",
              properties: {
                flagged: { type: "boolean", description: "Whether the content should be flagged" },
                reason: { type: ["string", "null"], description: "Short reason for flagging, or null if safe" },
                severity: { type: "string", enum: ["safe", "low", "medium", "high"] },
                source: { type: "string", enum: ["gemini"] },
              },
              required: ["flagged", "reason", "severity", "source"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "moderate_content" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Gemini API error:", response.status, text);
    return null;
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const message = choice?.message;
  const toolCalls = message?.tool_calls;
  const toolArgs = toolCalls?.[0]?.function?.arguments;
  const messageContent = message?.content;

  console.log("[moderate-content] Gemini response received", {
    finishReason,
    hasChoices: Array.isArray(data?.choices) && data.choices.length > 0,
    hasMessage: Boolean(message),
    hasToolCalls: Array.isArray(toolCalls) && toolCalls.length > 0,
    hasMessageContent: typeof messageContent === "string" ? messageContent.trim().length > 0 : Array.isArray(messageContent) ? messageContent.length > 0 : Boolean(messageContent),
  });

  if (finishReason === "content_filter") {
    console.warn("[moderate-content] Gemini response blocked by safety filters");
    return {
      flagged: true,
      reason: "Blocked by Gemini safety filters",
      severity: "high",
      source: "gemini",
      geminiUsed: true,
      geminiWorked: true,
    };
  }

  if (!message) {
    console.warn("[moderate-content] Gemini returned no message in first choice");
    return null;
  }

  if (typeof toolArgs === "string") {
    try {
      const parsed = normalizeModerationResult(JSON.parse(toolArgs));
      console.log("[moderate-content] Gemini tool_calls parse", {
        ok: Boolean(parsed),
        toolArgsLength: toolArgs.length,
      });
      if (parsed) {
        const result = { ...parsed, geminiUsed: true, geminiWorked: true };
        console.log("[moderate-content] Gemini final parsed result", result);
        return result;
      }
    } catch (error) {
      console.error("Failed to parse Gemini tool arguments:", error, toolArgs);
    }
  } else {
    console.warn("[moderate-content] Gemini missing tool_calls arguments");
  }

  if (typeof messageContent === "string" && messageContent.trim()) {
    try {
      const parsed = normalizeModerationResult(JSON.parse(messageContent));
      console.log("[moderate-content] Gemini message.content parse", {
        ok: Boolean(parsed),
        contentLength: messageContent.length,
      });
      if (parsed) {
        const result = { ...parsed, geminiUsed: true, geminiWorked: true };
        console.log("[moderate-content] Gemini final parsed result", result);
        return result;
      }
    } catch (error) {
      console.error("Failed to parse Gemini message.content JSON:", error, messageContent);
    }
  } else if (Array.isArray(messageContent) && messageContent.length > 0) {
    console.warn("[moderate-content] Gemini returned structured message.content; parser expects JSON string", messageContent);
  } else if (messageContent != null) {
    console.warn("[moderate-content] Gemini message.content exists but is not a non-empty string", { type: typeof messageContent });
  } else {
    console.warn("[moderate-content] Gemini returned empty response content");
  }

  console.warn("[moderate-content] Gemini response unusable after parsing attempts", {
    finishReason,
    hasToolCalls: Array.isArray(toolCalls) && toolCalls.length > 0,
    hasMessageContent: Boolean(messageContent),
  });
  return null;
}

async function updateFlaggedPost(postId: string, result: ModerationResult): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return;

  const response = await fetch(`${supabaseUrl}/rest/v1/community_posts?id=eq.${encodeURIComponent(postId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      flagged: true,
      flag_reason: `${result.source.toUpperCase()} detected: ${result.reason ?? "Flagged content"} (${result.severity} severity)`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to update flagged post:", response.status, text);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ...SAFE_RESULT, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as ModerationRequestBody;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const postId = typeof body.postId === "string" ? body.postId : null;
    const testMode = content.includes("__TEST_GEMINI__");

    if (!content) {
      return new Response(JSON.stringify({ ...SAFE_RESULT, geminiUsed: false, geminiWorked: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: ModerationResult | null = null;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
    const geminiUsed = Boolean(geminiApiKey);

    console.log("[moderate-content] Request received", {
      postId,
      testMode,
      contentLength: content.length,
      geminiApiKeyPresent: geminiUsed,
    });

    if (geminiApiKey) {
      try {
        result = await moderateWithGemini(content, geminiApiKey);
      } catch (error) {
        console.error("Gemini moderation failed:", error);
      }
    }

    if (!result) {
      if (testMode) {
        console.warn("[moderate-content] __TEST_GEMINI__ present and Gemini did not return a usable result; bypassing regex fallback");
        result = {
          flagged: false,
          reason: "Gemini test mode: no usable Gemini result",
          severity: "safe",
          source: "gemini",
          geminiUsed,
          geminiWorked: false,
        };
      } else {
        result = {
          ...moderateContentFallback(content),
          geminiUsed,
          geminiWorked: false,
        };
      }
    }

    if (result.geminiUsed === undefined) {
      result.geminiUsed = geminiUsed;
    }
    if (result.geminiWorked === undefined) {
      result.geminiWorked = result.source === "gemini";
    }

    // If flagged, update the post in the database
    if (result.flagged && postId) {
      await updateFlaggedPost(postId, result);
    }

    console.log("[moderate-content] Final moderation result", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-content error:", e);
    return new Response(JSON.stringify({ flagged: false, reason: null, severity: "safe", error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
