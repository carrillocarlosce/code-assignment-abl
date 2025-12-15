import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FinnhubService } from './finnhub.service';
import { FinnhubClient } from './finnhub.client';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [ConfigModule, RatesModule],
  providers: [
    FinnhubService,
    {
      provide: FinnhubClient,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('FINNHUB_API_KEY');
        if (!apiKey) {
          throw new Error('FINNHUB_API_KEY environment variable is required');
        }
        return new FinnhubClient(apiKey);
      },
      inject: [ConfigService],
    },
  ],
})
export class FinnhubModule {}
