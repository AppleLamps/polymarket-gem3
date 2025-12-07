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
You are an expert prediction market analyst with deep expertise in probability assessment, risk management, and market efficiency analysis. Perform a comprehensive deep research analysis for this prediction market.

## MARKET CONTEXT
${marketContext}

## ANALYSIS FRAMEWORK

### 1. INFORMATION GATHERING
Search for and analyze:
- Latest news articles within the past 7 days related to this market
- Recent polls, surveys, or statistical data if applicable
- Expert opinions and analyst commentary from credible sources
- Social media sentiment and trending discussions
- Any breaking developments that may not be fully priced into the market yet

### 2. EDGE DETECTION ANALYSIS
Conduct a rigorous probability assessment:
- Calculate your estimated real-world probability for the primary outcome
- Compare against the current market prices shown above
- Identify the Edge: (Your Estimated Probability - Market Probability)
- Determine if this edge is statistically significant (typically >5% difference)
- Explain what specific information the market may be missing, underweighting, or overweighting
- Consider if there are behavioral biases affecting the market (recency bias, overconfidence, etc.)

### 3. RISK ASSESSMENT
Evaluate and enumerate:
- Key risks that could invalidate your thesis (be specific)
- Time sensitivity: how quickly could new information change the situation?
- Information uncertainty: how reliable and complete are your sources?
- Black swan potential: low-probability events that could dramatically flip the outcome
- Execution risk: liquidity and slippage concerns for larger positions

### 4. MARKET EFFICIENCY EVALUATION
Analyze the market structure:
- Is the trading volume sufficient for reliable price discovery?
- Does the liquidity profile suggest informed institutional trading or retail-driven speculation?
- Are there signs of smart money positioning (large trades, unusual volume patterns)?
- How does this market's efficiency compare to similar prediction markets?

### 5. SYNTHESIS AND RECOMMENDATION
Based on ALL the above analysis, synthesize your findings into a clear, actionable recommendation. Consider:
- The size and reliability of any identified edge
- Risk-adjusted expected value
- Position sizing implications based on confidence level

## OUTPUT FORMAT
Return a JSON object with these exact fields:
{
  "summary": "2-3 sentence executive summary highlighting the key insight and recommendation",
  "recommendation": "BUY | SELL | HOLD | AVOID",
  "confidenceScore": 0-100,
  "estimatedProbability": "Your estimated real probability as a percentage (e.g., '65%')",
  "edgePercentage": "The identified edge as +/- percentage (e.g., '+8%' or '-5%')",
  "reasoning": ["Array of 4-6 key factors supporting your recommendation, ordered by importance"],
  "keyRisks": ["Array of 2-4 specific risks that could invalidate this analysis"],
  "marketEfficiency": "LOW | MEDIUM | HIGH"
}

Be precise, data-driven, and objective in your analysis. Avoid vague statements. Quantify where possible.
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
    // Include enhanced deep analysis fields when available
    estimatedProbability: parsed.estimatedProbability,
    edgePercentage: parsed.edgePercentage,
    keyRisks: parsed.keyRisks,
    marketEfficiency: parsed.marketEfficiency,
    sources: sources.length > 0 ? sources : undefined
  };
};