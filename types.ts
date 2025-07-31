export type MarketType = 'Crypto' | 'Forex' | 'US Stocks' | 'Iran Bourse' | 'Other';

export const FileCategories = ['داده‌های بازار', 'استراتژی شخصی', 'اخبار و مقالات', 'گزارش‌های تحلیلی', 'تصویر چارت', 'سایر'] as const;
export type FileCategory = typeof FileCategories[number];

export const timeframes = ['5 دقیقه', '15 دقیقه', '1 ساعت', '4 ساعت', 'روزانه', 'هفتگی', 'ماهانه', 'سالیانه'] as const;
export type Timeframe = typeof timeframes[number];

export const riskProfiles = ['محافظه‌کار', 'متعادل', 'تهاجمی'] as const;
export type RiskProfile = typeof riskProfiles[number];


export interface FinancialSymbol {
    symbol: string;
    name: string;
    market: MarketType;
    popular?: boolean;
}

export type PatternImplication = 'Bullish' | 'Bearish' | 'Neutral';
export interface Pattern {
    name: string;
    description: string;
    implication: PatternImplication;
}

export interface IndicatorAnalysis {
    rsi: { value: number; signal: 'Overbought' | 'Oversold' | 'Neutral'; description: string };
    macd: { signal: 'Bullish Crossover' | 'Bearish Crossover' | 'Neutral'; description: string };
    bollinger: { signal: 'Price near Upper Band' | 'Price near Lower Band' | 'Price near Middle Band'; description: string };
}

export interface CandlestickDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface AnalysisResult {
  symbol: string;
  timeframe: Timeframe;
  trend: string;
  summary: string;
  signal: 'خرید قوی' | 'خرید' | 'نگهداری' | 'فروش' | 'فروش قوی';
  sentiment: string;
  sentimentScore: number; // -100 (Extreme Fear) to 100 (Extreme Greed)
  newsSummary: string;
  patterns: Pattern[];
  indicators: IndicatorAnalysis;
  strategy: string;
  buyTargets: number[];
  sellTargets: number[];
  stopLoss: number;
  prediction: string;
  riskLevel: 'پایین' | 'متوسط' | 'بالا';
  confidence: number; // A number from 0 to 100
  candlestickData: CandlestickDataPoint[];
  priceChartData: Array<{ date: string; price: number; type: 'predicted' }>; // Only predictions now
  learnedInsights?: string;
  riskRewardRatio?: string;
  keyTakeaways: string[];
  proTip: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  content: string; // Base64 Data URL for images, raw text for others
  contentHash: string;
  category: FileCategory;
}

export interface GroundingSource {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: number;
}

export interface AnalysisData {
  analysis: AnalysisResult;
  sources: GroundingSource[];
}

export interface AnalysisRecord {
  id?: number; // Optional because it's added by IndexedDB
  timestamp: number;
  symbol: string;
  timeframe: Timeframe;
  filesUsed: UploadedFile[];
  analysis: AnalysisResult;
  sources: GroundingSource[];
}

export interface SavedAnalysisRecord {
  id?: number; // Optional because it's added by IndexedDB
  name: string; // User-defined name
  timestamp: number;
  symbol: string;
  timeframe: Timeframe;
  filesUsed: UploadedFile[];
  analysis: AnalysisResult;
  sources: GroundingSource[];
}


export type KnowledgeType = 'Insight' | 'Pattern' | 'Strategy';

export interface KnowledgeItem {
    id?: number; // Optional because it's added by IndexedDB
    sourceAnalysisId: number; // The ID of the analysis this knowledge came from
    type: KnowledgeType;
    content: string;
    symbol: string;
    timeframe: Timeframe;
    timestamp: number;
}