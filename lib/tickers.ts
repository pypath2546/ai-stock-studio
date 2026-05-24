export interface HoldingPosition {
  ticker: string;
  company: string;
  shares: number;
  cost: number;
  weight?: number;
}

export const PORTFOLIO_HOLDINGS: HoldingPosition[] = [
  { ticker: 'GOOGL',  company: 'Alphabet Inc.',     shares: 7,  cost: 2392, weight: 23.9 },
  { ticker: 'AVGO',   company: 'Broadcom Inc.',     shares: 4,  cost: 1626, weight: 16.3 },
  { ticker: 'AMZN',   company: 'Amazon.com Inc.',   shares: 6,  cost: 1503, weight: 15.0 },
  { ticker: 'UBER',   company: 'Uber Technologies', shares: 18, cost: 1388, weight: 13.9 },
  { ticker: 'CRWD',   company: 'CrowdStrike',       shares: 2,  cost: 848  },
  { ticker: 'RBRK',   company: 'Rubrik',            shares: 16, cost: 837  },
  { ticker: 'SOI.PA', company: 'Soitec',            shares: 7,  cost: 806  },
];

export const PORTFOLIO_CASH_USD = 599;

export const TOP_HOLDINGS = PORTFOLIO_HOLDINGS.slice(0, 4);

export const TRADING_TICKERS = [
  'GOOGL', 'AVGO', 'AMZN', 'UBER', 'CRWD', 'RBRK',
  'NVDA',  'META', 'MSFT', 'TSLA', 'PLTR',
] as const;

export const STOCKS_API_TICKERS = [
  'GOOGL', 'AVGO', 'AMZN', 'UBER', 'CRWD', 'RBRK', 'SOI.PA',
  'NVDA',  'META', 'MSFT', 'TSLA', 'PLTR',
] as const;

export const KB_TICKERS = [
  'NVDA',  'GOOGL', 'AVGO', 'AMZN', 'UBER', 'CRWD', 'RBRK', 'MSFT', 'META',
  'TSLA',  'PLTR',  'AAPL', 'AMD',  'INTC', 'TSM',  'ASML', 'MU',
] as const;

export const SCREENER_UNIVERSE = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN',
  'META', 'TSLA', 'AVGO', 'CRWD',  'PLTR',
  'RBRK', 'UBER', 'AMD',  'ARM',   'NET',
  'DDOG', 'SNOW', 'SMCI', 'ORCL',  'IBM',
] as const;
