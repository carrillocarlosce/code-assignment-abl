import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FinnhubModule } from './realtime/finnhub/finhub.module';
import { StreamModule } from './realtime/stream/stream.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI is not set');
        }
        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
    StreamModule,
    FinnhubModule,
  ],
})
export class AppModule {}
