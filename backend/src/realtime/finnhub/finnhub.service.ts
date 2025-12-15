import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FinnhubClient } from './finnhub.client';
import { RatesService } from '../rates/rates.service';
import { FinnhubTradeMessage, FinnhubUpdate } from './finnhub.types';

@Injectable()
export class FinnhubService implements OnModuleInit {
  private readonly logger = new Logger(FinnhubService.name);

  constructor(
    private readonly finnhubClient: FinnhubClient,
    private readonly ratesService: RatesService,
  ) {}

  onModuleInit() {
    try {
      this.finnhubClient.connect();

      this.finnhubClient.onConnect(() => {
        this.subscribeToSymbols();
      });

      this.finnhubClient.onMessage((msg) => {
        try {
          const update = this.mapToUpdate(msg);

          if (update) {
            this.ratesService.processTick(update).catch((error) => {
              this.logger.error('Error processing tick', error);
            });
          }
        } catch (error) {
          this.logger.error('Error handling message', error);
        }
      });
    } catch (error) {
      this.logger.error('Error initializing Finnhub service', error);
    }
  }

  private async subscribeToSymbols() {
    try {
      const symbols = this.ratesService.getTradingSymbols();
      this.logger.log(`Subscribing to ${symbols.length} trading symbols`);
      this.finnhubClient.subscribe(symbols);
    } catch (error) {
      this.logger.error('Error subscribing to symbols', error);
    }
  }

  private mapToUpdate(message: FinnhubTradeMessage): FinnhubUpdate | null {
    try {
      if (message.type !== 'trade') return null;

      if (
        !message.data ||
        !Array.isArray(message.data) ||
        message.data.length === 0
      ) {
        this.logger.warn('Received trade message with no data');
        return null;
      }

      const trade = message.data[0];

      if (!trade || !trade.s || !trade.p || !trade.t) {
        this.logger.warn('Received incomplete trade data', trade);
        return null;
      }

      const pair = this.getPair(trade.s);
      if (!pair) {
        this.logger.warn(`Unknown symbol: ${trade.s}`);
        return null;
      }

      return {
        pair,
        price: trade.p,
        timestamp: trade.t,
      };
    } catch (error) {
      this.logger.error('Error mapping message to update', error);
      return null;
    }
  }

  private getPair(symbol: string): string {
    return this.ratesService.getPair(symbol);
  }
}
