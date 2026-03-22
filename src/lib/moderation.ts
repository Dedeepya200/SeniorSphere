import { supabase } from "@/integrations/supabase/client";

export type Severity = "safe" | "low" | "medium" | "high";
export type ModerationSource = "gemini" | "regex";

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  severity: Severity;
  source: ModerationSource;
}

const SAFE_RESULT: ModerationResult = { flagged: false, reason: null, severity: "safe", source: "regex" };

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

export function moderateContentLocally(content: string): ModerationResult {
  const normalized = content.trim();
  if (!normalized) return SAFE_RESULT;

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
    reason: flagged ? (typeof reason === "string" && reason.trim() ? reason.trim() : "Flagged by moderation") : null,
    severity,
    source: source === "gemini" ? "gemini" : "regex",
  };
}

export async function moderateContent(content: string, postId?: string): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: postId ? { content, postId } : { content },
    });

    if (error) {
      console.error("Edge moderation failed:", error);
      return moderateContentLocally(content);
    }

    return normalizeModerationResult(data) ?? moderateContentLocally(content);
  } catch (error) {
    console.error("Moderation invoke failed:", error);
    return moderateContentLocally(content);
  }
}
