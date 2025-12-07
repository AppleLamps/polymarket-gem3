import { MarketData, AnalysisResult, AnalysisMode } from "../types";

interface AnalyzeOptions {
  signal?: AbortSignal;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const ANALYZE_ENDPOINT = `${API_BASE_URL}/api/analyze`;

/**
 * Calls the backend analysis endpoint so the API key stays server-side.
 */
export const analyzeMarket = async (
  market: MarketData,
  mode: AnalysisMode,
  options?: AnalyzeOptions
): Promise<AnalysisResult> => {
  const response = await fetch(ANALYZE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ market, mode }),
    signal: options?.signal
  });

  if (!response.ok) {
    let details = 'Analysis failed. Please try again.';
    try {
      const payload = await response.json();
      if (payload?.message) {
        details = payload.message;
      }
    } catch {
      // Ignore JSON parse errors and fall back to default message.
    }
    throw new Error(details);
  }

  return response.json() as Promise<AnalysisResult>;
};