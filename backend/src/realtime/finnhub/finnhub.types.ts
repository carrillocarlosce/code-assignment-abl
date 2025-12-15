export type FinnhubTradeData = {
  p: number; // price
  s: string; // symbol
  t: number; // timestamp
  v: number; // volume
};

export type FinnhubTradeMessage = {
  data: Array<FinnhubTradeData>;
  type: 'trade';
};

export type FinnhubUpdate = {
  pair: string;
  price: number;
  timestamp: number;
};
