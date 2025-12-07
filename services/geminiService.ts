import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MarketData, AnalysisResult, AnalysisMode } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes the market data using Gemini
 */
export const analyzeMarket = async (
  market: MarketData, 
  mode: AnalysisMode
): Promise<AnalysisResult> => {
  
  const isDeep = mode === AnalysisMode.DEEP;
  
  // Upgrade to Gemini 3 Pro for state-of-the-art reasoning
  const modelId = "gemini-3-pro-preview"; 

  const marketContext = `
    Market Question: ${market.question}
    Description: ${market.description || 'N/A'}
    End Date: ${market.endDate || 'N/A'}
    
    Financial Metrics:
    - Volume: ${market.volume}
    - Liquidity: ${market.liquidity || 'N/A'}
    
    Current Outcomes & Prices:
    ${market.outcomes.map(o => `- ${o.name}: ${(o.probability * 100).toFixed(1)}% (Price: ${o.price})`).join('\n')}
    
    URL: ${market.url}
  `;

  let prompt = "";

  if (isDeep) {
    prompt = `
      Perform a deep research analysis for this prediction market.
      
      CONTEXT:
      ${marketContext}

      TASK:
      1. Search for the latest real-time news, polls, and expert sentiment related to this exact question.
      2. Identify any breaking news or recent events that might not be fully priced in yet.
      3. Compare the "real-world" estimated probability vs the market's current probabilities.
      4. Determine if there is a discrepancy (Edge).

      OUTPUT FORMAT:
      Return a detailed analysis in JSON with the following fields: summary, recommendation (BUY, SELL, HOLD, AVOID), confidenceScore (0-100), reasoning (array of strings).
    `;
  } else {
    prompt = `
      Perform a quick technical and fundamental analysis of this prediction market based on the provided odds.

      CONTEXT:
      ${marketContext}

      TASK:
      1. Analyze the implied probabilities and market structure (volume, liquidity).
      2. Check for arbitrage, overconfidence, or basic inconsistencies.
      3. Based *only* on the provided market structure and general knowledge, does this look efficient?

      OUTPUT FORMAT:
      Return a concise summary in JSON with the following fields: summary, recommendation (BUY, SELL, HOLD, AVOID), confidenceScore (0-100), reasoning (array of strings).
    `;
  }

  const analysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      recommendation: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD', 'AVOID'] },
      confidenceScore: { type: Type.INTEGER },
      reasoning: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
      }
    },
    required: ["summary", "recommendation", "confidenceScore", "reasoning"]
  };

  const config: any = {
    // Gemini 3 specific configuration
    // 'thinkingBudget' guides the model on the number of thinking tokens to use.
    thinkingConfig: {
        thinkingBudget: isDeep ? 16384 : 2048
    }
  };

  if (isDeep) {
    // Guidelines: When using Google Search, do not use responseMimeType or responseSchema
    config.tools = [{ googleSearch: {} }];
  } else {
    config.responseMimeType = "application/json";
    config.responseSchema = analysisSchema;
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: config
  });

  let responseText = response.text;
  if (!responseText) throw new Error("No analysis generated");

  // Clean up potential markdown code blocks if JSON mode wasn't strictly enforced (Deep mode)
  if (responseText.startsWith('```json')) {
    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(responseText);

  // Extract grounding metadata if available (for sources)
  let sources: { title: string; url: string }[] = [];
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          url: chunk.web.uri
        });
      }
    });
  }

  // Deduplicate sources
  sources = sources.filter((v, i, a) => a.findIndex(t => (t.url === v.url)) === i);

  return {
    summary: parsed.summary,
    recommendation: parsed.recommendation as any,
    confidenceScore: parsed.confidenceScore,
    reasoning: parsed.reasoning,
    sources: sources.length > 0 ? sources : undefined
  };
};