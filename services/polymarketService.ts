
import { MarketData, Outcome } from '../types';

const BASE_URL = 'https://gamma-api.polymarket.com';

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
const formatMoney = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}m`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
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
    // Clean slug for search
    const query = slug.replace(/-/g, ' ');
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
  // An event can have multiple markets. 
  // If targetId is provided, find that specific market.
  // Otherwise, find the market with the highest volume or the main market.
  
  let markets = event.markets || [];
  let selectedMarket = markets.find((m: any) => m.id === targetId) || markets[0];
  
  // If it's a "Group" market (e.g. Election Winner), the outcomes might be spread across markets
  // OR strictly inside one market object. 
  // Polymarket API structure: Event -> Markets. 
  // For "Winner" events, often markets[0] contains the outcomes if it's a generic structure,
  // OR there are multiple binary markets. 
  
  // Strategy: If the selected market looks like a binary YES/NO, but the event title implies a list (e.g. "Who will win?"),
  // we might want to aggregate. However, to keep it simple for this app, we will focus on the selected market's outcomes.
  
  // Note: For multi-outcome markets in Gamma API, `outcomes` field in the market object usually has the names.
  // `outcomePrices` has the prices.
  
  const outcomes: Outcome[] = [];
  
  // Check if we have outcome names and prices (Group market)
  if (selectedMarket.outcomes && selectedMarket.outcomePrices) {
    const names = JSON.parse(selectedMarket.outcomes); // It's often a stringified array
    const prices = JSON.parse(selectedMarket.outcomePrices);
    
    names.forEach((name: string, idx: number) => {
      outcomes.push({
        name: name,
        probability: Number(prices[idx]) || 0,
        price: Number(prices[idx]) || 0
      });
    });
  } 
  // Fallback for simple binary markets if outcomes isn't parsed correctly or is simplified
  else {
     outcomes.push({ name: "Yes", probability: 0.5, price: 0.5 });
     outcomes.push({ name: "No", probability: 0.5, price: 0.5 });
  }

  // Sort by probability desc
  outcomes.sort((a, b) => b.probability - a.probability);

  return {
    id: selectedMarket.id,
    question: event.title, // Event title is usually better formatted than market question
    description: event.description || selectedMarket.description,
    outcomes,
    url: `https://polymarket.com/event/${event.slug}`,
    volume: formatMoney(Number(selectedMarket.volume || 0)),
    volumeNum: Number(selectedMarket.volume || 0),
    liquidity: formatMoney(Number(selectedMarket.liquidity || 0)),
    endDate: selectedMarket.endDate,
    active: selectedMarket.active,
    groupItemTitle: selectedMarket.groupItemTitle
  };
};

/**
 * Transform Market API response
 */
const transformMarketData = (market: any): MarketData => {
  const outcomes: Outcome[] = [];
  
  if (market.outcomes && market.outcomePrices) {
    let names: string[] = [];
    try {
        names = JSON.parse(market.outcomes);
    } catch {
        names = market.outcomes; // Sometimes it's already an array
    }
    
    let prices: string[] = [];
    try {
        prices = JSON.parse(market.outcomePrices);
    } catch {
        prices = market.outcomePrices;
    }

    names.forEach((name, idx) => {
      outcomes.push({
        name: name,
        probability: Number(prices[idx]) || 0,
        price: Number(prices[idx]) || 0
      });
    });
  } else {
    // Fallback binary
    outcomes.push({ name: "Yes", probability: 0.5, price: 0.5 });
    outcomes.push({ name: "No", probability: 0.5, price: 0.5 });
  }

  outcomes.sort((a, b) => b.probability - a.probability);

  return {
    id: market.id,
    question: market.question,
    description: market.description,
    outcomes,
    url: `https://polymarket.com/market/${market.slug}`,
    volume: formatMoney(Number(market.volume || 0)),
    volumeNum: Number(market.volume || 0),
    liquidity: formatMoney(Number(market.liquidity || 0)),
    endDate: market.endDate,
    active: market.active,
    groupItemTitle: market.groupItemTitle
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
