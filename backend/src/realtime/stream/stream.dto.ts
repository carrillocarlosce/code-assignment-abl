export interface RateUpdateDto {
  pair: string;
  price: number;
  hourlyAvg: number;
  timestamp: number;
}

export interface SubscribeMessage {
  pairs: string[];
}
