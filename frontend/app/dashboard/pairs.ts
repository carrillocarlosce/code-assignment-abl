export type Pair = {
  pair: string;
  decimals: number;
  prefix: string;
};
export const PAIRS: Pair[] = [
  {
    pair: "ETH/USDC",
    decimals: 2,
    prefix: "$",
  },
  {
    pair: "ETH/USDT",
    decimals: 2,
    prefix: "$",
  },
  {
    pair: "ETH/BTC",
    decimals: 5,
    prefix: "BTC",
  },
  {
    pair: "BTC/USDT",
    decimals: 2,
    prefix: "$",
  },
];
