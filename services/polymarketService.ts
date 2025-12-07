
import { MarketData, Outcome } from '../types';

const BASE_URL = 'https://gamma-api.polymarket.com';

export interface TrendingMarket {
  slug: string;
  title: string;
}

/**
 * Parsed URL information
 */
interface ParsedUrl {
  slug: string;
  id?: string;
  type: 'event' | 'market' | 'unknown';
}

/**
 * Extracts slug and ID from a Polymarket URL
 */
const parsePolymarketUrl = (url: string): ParsedUrl => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const searchParams = urlObj.searchParams;

    // Handle /event/slug
    if (pathParts.includes('event')) {
      const idx = pathParts.indexOf('event');
      if (pathParts[idx + 1]) {
        return { slug: pathParts[idx + 1], type: 'event', id: searchParams.get('tid') || undefined };
      }
    }

    // Handle /market/slug
    if (pathParts.includes('market')) {
      const idx = pathParts.indexOf('market');
      if (pathParts[idx + 1]) {
        return { slug: pathParts[idx + 1], type: 'market', id: searchParams.get('tid') || undefined };
      }
    }

    // Handle root slug (e.g., polymarket.com/slug)
    if (pathParts.length > 0) {
        return { slug: pathParts[pathParts.length - 1], type: 'unknown', id: searchParams.get('tid') || undefined };
    }
  } catch (e) {
    console.warn("Invalid URL format, trying to treat as slug", e);
  }
  
  // Fallback: treat the whole string as a slug if it doesn't look like a URL
  return { slug: url, type: 'unknown' };
};

/**
 * Format currency
 */
const formatMoney = (rawAmount: number | string | undefined | null): string => {
  const amount = Number(rawAmount) || 0;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}m`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
};

const clampProbability = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const normalized = value > 1.01 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
};

const asArray = (value: unknown): any[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  }
  return undefined;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  const arr = asArray(value);
  if (!arr) return undefined;
  return arr.map((entry) => String(entry));
};

const parseNumberArray = (value: unknown): number[] | undefined => {
  const arr = asArray(value);
  if (!arr) return undefined;
  const numbers = arr.map((entry) => Number(entry));
  if (numbers.some((num) => Number.isNaN(num))) {
    return undefined;
  }
  return numbers;
};

const buildOutcomes = (market: any): Outcome[] => {
  const names =
    parseStringArray(market.outcomes) ||
    parseStringArray(market.groupOutcomes) ||
    parseStringArray(market.groupItemTitle ? [market.groupItemTitle] : undefined) ||
    parseStringArray(market.question ? [market.question] : undefined);

  const priceSource = market.outcomePrices ?? market.prices ?? market.outcomeProbability;
  const probabilities = parseNumberArray(priceSource);

  if (names && probabilities && names.length && probabilities.length) {
    const usableLength = Math.min(names.length, probabilities.length);
    const outcomes = [];
    for (let i = 0; i < usableLength; i += 1) {
      outcomes.push({
        name: names[i],
        probability: clampProbability(probabilities[i]),
        price: clampProbability(probabilities[i]),
      });
    }
    return outcomes.sort((a, b) => b.probability - a.probability);
  }

  return [
    { name: "Yes", probability: 0.5, price: 0.5 },
    { name: "No", probability: 0.5, price: 0.5 },
  ];
};

const selectMarket = (markets: any[], targetId?: string) => {
  if (!Array.isArray(markets) || markets.length === 0) return undefined;
  if (targetId) {
    const viaId = markets.find((market) => String(market.id) === String(targetId));
    if (viaId) return viaId;
  }

  const activeMarket = markets.find((market) => market.active);
  if (activeMarket) return activeMarket;

  return markets.reduce((prev, current) => {
    const prevVolume = Number(prev?.volumeNum ?? prev?.volume ?? 0);
    const currentVolume = Number(current?.volumeNum ?? current?.volume ?? 0);
    return currentVolume > prevVolume ? current : prev;
  }, markets[0]);
};

/**
 * Fetch top trending markets (Events)
 */
export const getTrendingMarkets = async (): Promise<TrendingMarket[]> => {
  try {
    // Fetch top 5 events by 24h volume
    const data = await fetchWithTimeout(`${BASE_URL}/events?limit=5&active=true&closed=false&order=volume24hr&ascending=false`);
    
    if (Array.isArray(data)) {
      return data.map((event: any) => ({
        slug: event.slug,
        title: event.title
      }));
    }
    return [];
  } catch (e) {
    console.warn("Failed to fetch trending markets", e);
    return [];
  }
};

/**
 * Main fetch function
 */
export const getMarketData = async (url: string): Promise<MarketData> => {
  const { slug, id } = parsePolymarketUrl(url);
  
  // 1. Try Events API (Most robust for groups)
  try {
    const eventData = await fetchWithTimeout(`${BASE_URL}/events?slug=${slug}`);
    if (eventData && eventData.length > 0) {
      return transformEventData(eventData[0], id);
    }
  } catch (e) {
    console.log("Event API failed or empty, trying markets...", e);
  }

  // 2. Try Markets API (For single markets)
  try {
    const marketData = await fetchWithTimeout(`${BASE_URL}/markets?slug=${slug}`);
    if (marketData && marketData.length > 0) {
      return transformMarketData(marketData[0]);
    }
  } catch (e) {
    console.log("Market API failed, trying ID...", e);
  }

  // 3. Try ID if available
  if (id) {
    try {
      const marketData = await fetchWithTimeout(`${BASE_URL}/markets/${id}`);
      if (marketData) {
        return transformMarketData(marketData);
      }
    } catch (e) {
      console.log("ID lookup failed...", e);
    }
  }

  // 4. Search Fallback
  try {
    const searchData = await fetchWithTimeout(`${BASE_URL}/markets?limit=1&active=true&closed=false&order=volume24hr&ascending=false&slug=${slug}`);
    if (searchData && searchData.length > 0) {
      return transformMarketData(searchData[0]);
    }
  } catch (e) {
     console.log("Search fallback failed...", e);
  }

  // 5. Mock Data Fallback
  console.warn("All API methods failed. Returning mock data.");
  return getMockData(url, slug);
};

const fetchWithTimeout = async (url: string, timeout = 12000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

/**
 * Transform Event API response
 */
const transformEventData = (event: any, targetId?: string): MarketData => {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const selectedMarket = selectMarket(markets, targetId);

  if (!selectedMarket) {
    throw new Error("Event returned no markets to evaluate");
  }

  const outcomes = buildOutcomes(selectedMarket);
  const volumeNum = Number(selectedMarket.volumeNum ?? selectedMarket.volume ?? 0);
  const liquidityNum = Number(selectedMarket.liquidityNum ?? selectedMarket.liquidity ?? 0);

  return {
    id: selectedMarket.id,
    question: event.title || selectedMarket.question,
    description: event.description || selectedMarket.description,
    outcomes,
    url: `https://polymarket.com/event/${event.slug}`,
    volume: formatMoney(volumeNum),
    volumeNum,
    liquidity: formatMoney(liquidityNum),
    endDate: selectedMarket.endDate ?? event.endDate,
    active: Boolean(selectedMarket.active ?? event.active),
    groupItemTitle: selectedMarket.groupItemTitle,
  };
};

/**
 * Transform Market API response
 */
const transformMarketData = (market: any): MarketData => {
  const outcomes = buildOutcomes(market);
  const volumeNum = Number(market.volumeNum ?? market.volume ?? 0);
  const liquidityNum = Number(market.liquidityNum ?? market.liquidity ?? 0);

  return {
    id: market.id,
    question: market.question || market.title,
    description: market.description || market.resolution || market.resolutionRules,
    outcomes,
    url: `https://polymarket.com/market/${market.slug}`,
    volume: formatMoney(volumeNum),
    volumeNum,
    liquidity: formatMoney(liquidityNum),
    endDate: market.endDate,
    active: Boolean(market.active),
    groupItemTitle: market.groupItemTitle,
  };
};

/**
 * Mock Data Generator
 */
const getMockData = (url: string, slug: string): MarketData => {
  const isBtc = slug.includes('btc') || slug.includes('bitcoin');
  const isElection = slug.includes('election') || slug.includes('trump');
  
  const question = isBtc 
    ? "Will Bitcoin hit $100k in 2024?" 
    : isElection 
      ? "Presidential Election Winner 2024" 
      : `Prediction Market: ${slug.replace(/-/g, ' ')}`;

  const outcomes = isElection 
    ? [
        { name: "Trump", probability: 0.52, price: 0.52 },
        { name: "Harris", probability: 0.47, price: 0.47 },
        { name: "Other", probability: 0.01, price: 0.01 }
      ]
    : [
        { name: "Yes", probability: 0.65, price: 0.65 },
        { name: "No", probability: 0.35, price: 0.35 }
      ];

  return {
    id: "mock-" + Math.random(),
    question,
    description: "This is a simulated market data response because the API connection failed.",
    outcomes,
    url,
    volume: "$1.2m",
    volumeNum: 1200000,
    liquidity: "$150k",
    endDate: "2024-12-31",
    active: true
  };
};
