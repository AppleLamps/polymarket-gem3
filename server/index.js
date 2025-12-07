import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();
dotenv.config({ path: '.env.local', override: false });

const PORT = process.env.SERVER_PORT || process.env.PORT || 4000;
const MODEL_ID = 'gemini-3-pro-preview';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[server] GEMINI_API_KEY is not set. POST /api/analyze will fail until it is configured.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const analysisSchema = {
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
  required: ['summary', 'recommendation', 'confidenceScore', 'reasoning']
};

const sanitizeModelText = (text = '') => {
  let trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '');
    trimmed = trimmed.replace(/\s*```$/, '');
  }
  return trimmed;
};

const parseModelJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // fall through to error
      }
    }
    throw new Error('MODEL_OUTPUT_INVALID_JSON');
  }
};

const getCandidateText = (response) => {
  if (response?.text) {
    return response.text;
  }
  const parts = response?.candidates?.[0]?.content || [];
  const joined = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n');
  return joined;
};

const extractSources = (response) => {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];
  const seen = new Set();
  const sources = [];

  chunks.forEach((chunk) => {
    const url = chunk?.web?.uri;
    const title = chunk?.web?.title || url;
    if (url && title && !seen.has(url)) {
      seen.add(url);
      sources.push({ title, url });
    }
  });

  return sources;
};

const buildMarketContext = (market) => `
    Market Question: ${market.question}
    Description: ${market.description || 'N/A'}
    End Date: ${market.endDate || 'N/A'}
    
    Financial Metrics:
    - Volume: ${market.volume}
    - Liquidity: ${market.liquidity || 'N/A'}
    
    Current Outcomes & Prices:
    ${market.outcomes.map((o) => `- ${o.name}: ${(o.probability * 100).toFixed(1)}% (Price: ${o.price})`).join('\n')}
    
    URL: ${market.url}
  `;

const buildPrompt = (market, isDeep) => {
  if (isDeep) {
    return `
      Perform a deep research analysis for this prediction market.
      
      CONTEXT:
      ${buildMarketContext(market)}

      TASK:
      1. Search for the latest real-time news, polls, and expert sentiment related to this exact question.
      2. Identify any breaking news or recent events that might not be fully priced in yet.
      3. Compare the "real-world" estimated probability vs the market's current probabilities.
      4. Determine if there is a discrepancy (Edge).

      OUTPUT FORMAT:
      Return a detailed analysis in JSON with the following fields: summary, recommendation (BUY, SELL, HOLD, AVOID), confidenceScore (0-100), reasoning (array of strings).
    `;
  }

  return `
    Perform a quick technical and fundamental analysis of this prediction market based on the provided odds.

    CONTEXT:
    ${buildMarketContext(market)}

    TASK:
    1. Analyze the implied probabilities and market structure (volume, liquidity).
    2. Check for arbitrage, overconfidence, or basic inconsistencies.
    3. Based *only* on the provided market structure and general knowledge, does this look efficient?

    OUTPUT FORMAT:
    Return a concise summary in JSON with the following fields: summary, recommendation (BUY, SELL, HOLD, AVOID), confidenceScore (0-100), reasoning (array of strings).
  `;
};

app.post('/api/analyze', async (req, res) => {
  if (!ai) {
    return res.status(500).json({ message: 'Gemini API key is not configured on the server.' });
  }

  const { market, mode } = req.body || {};
  if (!market || !mode || !Array.isArray(market?.outcomes)) {
    return res.status(400).json({ message: 'Market payload (with outcomes) and analysis mode are required.' });
  }

  const isDeep = mode === 'DEEP';

  const config = {
    thinkingConfig: {
      thinkingBudget: isDeep ? 16384 : 2048
    }
  };

  if (isDeep) {
    config.tools = [{ googleSearch: {} }];
  } else {
    config.responseMimeType = 'application/json';
    config.responseSchema = analysisSchema;
  }

  try {
    const prompt = buildPrompt(market, isDeep);
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config
    });

    const rawText = sanitizeModelText(getCandidateText(response));
    if (!rawText) {
      return res.status(502).json({ message: 'AI response was empty.' });
    }

    const parsed = parseModelJson(rawText);
    const sources = extractSources(response);

    res.json({
      summary: parsed.summary,
      recommendation: parsed.recommendation,
      confidenceScore: parsed.confidenceScore,
      reasoning: parsed.reasoning,
      sources: sources.length > 0 ? sources : undefined
    });
  } catch (error) {
    if (error.message === 'MODEL_OUTPUT_INVALID_JSON') {
      console.error('[server] Gemini response could not be parsed as JSON.');
      return res.status(502).json({ message: 'AI response was not valid JSON.' });
    }

    console.error('[server] Analysis failed', error);
    return res.status(500).json({ message: 'Failed to analyze market.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[server] API listening on port ${PORT}`);
});
