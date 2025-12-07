
export interface Outcome {
  name: string;
  probability: number; // 0 to 1
  price: number;
  color?: string;
}

export interface MarketData {
  id: string;
  question: string;
  description?: string;
  outcomes: Outcome[];
  url: string;
  
  // Metrics
  volume: string; // Formatted total volume
  volumeNum: number; // Raw volume for calculations
  liquidity: string;
  endDate?: string;
  
  // Metadata
  active: boolean;
  groupItemTitle?: string; // For multi-market events
}

export interface AnalysisResult {
  summary: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  confidenceScore: number; // 0 to 100
  reasoning: string[];
  // Enhanced deep analysis fields
  estimatedProbability?: string;
  edgePercentage?: string;
  keyRisks?: string[];
  marketEfficiency?: 'LOW' | 'MEDIUM' | 'HIGH';
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export enum AnalysisMode {
  QUICK = 'QUICK',
  DEEP = 'DEEP',
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}
