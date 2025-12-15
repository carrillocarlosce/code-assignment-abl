export const PAIR_TO_SYMBOL = {
  'ETH/USDC': 'BINANCE:ETHUSDC',
  'ETH/USDT': 'BINANCE:ETHUSDT',
  'ETH/BTC': 'BINANCE:ETHBTC',
  'BTC/USDT': 'BINANCE:BTCUSDT',
} as const;

export const SYMBOL_TO_PAIR = Object.fromEntries(
  Object.entries(PAIR_TO_SYMBOL).map(([pair, symbol]) => [symbol, pair]),
);
