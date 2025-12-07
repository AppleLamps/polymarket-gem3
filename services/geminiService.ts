import { MarketData, AnalysisResult, AnalysisMode } from "../types";

const GATEWAY_URL =
  import.meta.env.VITE_GEMINI_GATEWAY_URL ||
  import.meta.env.VITE_ANALYSIS_ENDPOINT ||
  import.meta.env.VITE_GEMINI_APP_URL;

const GATEWAY_KEY =
  import.meta.env.VITE_GEMINI_GATEWAY_KEY ||
  import.meta.env.VITE_ANALYSIS_API_KEY ||
  import.meta.env.VITE_GEMINI_APP_KEY;

const REQUIRED_FIELDS: Array<keyof AnalysisResult> = [
  "summary",
  "recommendation",
  "confidenceScore",
  "reasoning",
];

const VALID_RECOMMENDATIONS: AnalysisResult["recommendation"][] = [
  "BUY",
  "SELL",
  "HOLD",
  "AVOID",
];

const sanitizeJsonText = (rawText: string): string => {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Empty analysis response");
  }

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/u, "").replace(/```$/u, "").trim();
  }

  // Try to extract the first JSON object from an unstructured response
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const coerceReasoning = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item));
  }
  if (typeof input === "string" && input.length > 0) {
    return [input];
  }
  return ["No reasoning returned by analysis service."];
};

const normalizePayload = (payload: any): AnalysisResult => {
  const missing = REQUIRED_FIELDS.filter(
    (field) => payload?.[field] === undefined || payload?.[field] === null
  );

  if (missing.length > 0) {
    throw new Error(
      `Analysis response missing required fields: ${missing.join(", ")}`
    );
  }

  const confidenceScore = Number(payload.confidenceScore);
  const normalizedRecommendation = String(payload.recommendation || "").toUpperCase();
  const recommendation = VALID_RECOMMENDATIONS.includes(
    normalizedRecommendation as AnalysisResult["recommendation"]
  )
    ? (normalizedRecommendation as AnalysisResult["recommendation"])
    : "HOLD";

  return {
    summary: String(payload.summary),
    recommendation,
    confidenceScore: Number.isFinite(confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(confidenceScore)))
      : 0,
    reasoning: coerceReasoning(payload.reasoning),
    sources: Array.isArray(payload.sources)
      ? payload.sources
          .filter((s) => s && s.title && s.url)
          .map((s) => ({ title: String(s.title), url: String(s.url) }))
      : undefined,
  };
};

const decodeResponse = async (response: Response): Promise<AnalysisResult> => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const data = await response.json();
    return normalizePayload(data);
  }

  const text = await response.text();
  try {
    const cleaned = sanitizeJsonText(text);
    return normalizePayload(JSON.parse(cleaned));
  } catch (err) {
    throw new Error(
      `Failed to parse analysis response: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

const assertGatewayConfigured = () => {
  if (!GATEWAY_URL) {
    throw new Error(
      "Missing VITE_GEMINI_GATEWAY_URL (or VITE_ANALYSIS_ENDPOINT) environment variable."
    );
  }
};

export const analyzeMarket = async (
  market: MarketData,
  mode: AnalysisMode
): Promise<AnalysisResult> => {
  assertGatewayConfigured();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (GATEWAY_KEY) {
    headers["x-api-key"] = GATEWAY_KEY;
  }

  const response = await fetch(GATEWAY_URL!, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode,
      market,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Analysis gateway error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return decodeResponse(response);
};