import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatesService } from './rates.service';
import { HourlyAggregatorService } from './hourly-aggregator.service';
import { HourlyAverageRepository } from './hourly-average.repository';
import { HourlyAverage, HourlyAverageSchema } from './hourly-average.schema';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [
    StreamModule,
    MongooseModule.forFeature([
      { name: HourlyAverage.name, schema: HourlyAverageSchema },
    ]),
  ],
  providers: [RatesService, HourlyAggregatorService, HourlyAverageRepository],
  exports: [RatesService],
})
export class RatesModule {}
