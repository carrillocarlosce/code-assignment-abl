import { Injectable, Logger } from '@nestjs/common';
import { StreamService } from '../stream/stream.service';
import { HourlyAggregatorService } from './hourly-aggregator.service';
import { RateTick } from './rates.types';
import { PAIR_TO_SYMBOL, SYMBOL_TO_PAIR } from './pairs.map';

@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);

  constructor(
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly streamService: StreamService,
  ) {}

  async processTick(tick: RateTick) {
    try {
      const hourlyAvg = await this.hourlyAggregator.add(
        tick.pair,
        tick.price,
        tick.timestamp,
      );

      this.streamService.publish({
        pair: tick.pair,
        price: tick.price,
        hourlyAvg,
        timestamp: tick.timestamp,
      });
    } catch (error) {
      this.logger.error(`Error processing tick for ${tick.pair}`, error);
      // Don't throw - continue processing other ticks
    }
  }

  getTradingSymbols(): string[] {
    return Object.values(PAIR_TO_SYMBOL);
  }

  getPair(symbol: string): string {
    return SYMBOL_TO_PAIR[symbol];
  }
}
