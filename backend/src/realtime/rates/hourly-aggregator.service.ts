import { Injectable, Logger } from '@nestjs/common';
import { HourlyAverageRepository } from './hourly-average.repository';

type HourBucket = {
  sum: number;
  count: number;
};

@Injectable()
export class HourlyAggregatorService {
  private readonly logger = new Logger(HourlyAggregatorService.name);

  constructor(
    private readonly hourlyAverageRepository: HourlyAverageRepository,
  ) {}
  private buckets = new Map<string, HourBucket>();
  private currentHourKeys = new Map<string, string>();

  async add(pair: string, price: number, timestamp: number): Promise<number> {
    try {
      const hourKey = this.getHourKey(pair, timestamp);
      const previousHourKey = this.currentHourKeys.get(pair);

      const shouldFlush = previousHourKey && hourKey !== previousHourKey;

      if (shouldFlush) {
        await this.flush(previousHourKey);
      }

      this.currentHourKeys.set(pair, hourKey);

      const bucket = this.buckets.get(hourKey) ?? { sum: 0, count: 0 };

      bucket.sum += price;
      bucket.count += 1;

      this.buckets.set(hourKey, bucket);

      return bucket.sum / bucket.count;
    } catch (error) {
      this.logger.error(`Error adding tick for ${pair}`, error);
      // Return a fallback value to prevent breaking the flow
      const hourKey = this.getHourKey(pair, timestamp);
      const bucket = this.buckets.get(hourKey);
      if (bucket && bucket.count > 0) {
        return bucket.sum / bucket.count;
      }
      return price; // Fallback to current price
    }
  }

  private async flush(hourKey: string) {
    const bucket = this.buckets.get(hourKey);
    if (!bucket) return;

    try {
      const avg = bucket.sum / bucket.count;
      const [pair, hour] = hourKey.split('|');

      if (!pair || !hour) {
        this.logger.error(`Invalid hourKey format: ${hourKey}`);
        return;
      }

      await this.hourlyAverageRepository.save({
        pair,
        hour: new Date(hour),
        average: avg,
        count: bucket.count,
      });

      this.buckets.delete(hourKey);
      this.logger.debug(`Flushed hourly average for ${pair} at ${hour}`);
    } catch (error) {
      this.logger.error(`Error flushing hourly average for ${hourKey}`, error);
      // Keep the bucket in memory so we can retry later
      // In a production system, you might want to implement a retry queue
    }
  }

  private getHourKey(pair: string, ts: number) {
    const d = new Date(ts);
    d.setMinutes(0, 0, 0);

    return `${pair}|${d.toISOString()}`;
  }
}
