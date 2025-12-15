import { Test, TestingModule } from '@nestjs/testing';
import { RatesService } from './rates.service';
import { HourlyAggregatorService } from './hourly-aggregator.service';
import { StreamService } from '../stream/stream.service';
import { RateTick } from './rates.types';
import { PAIR_TO_SYMBOL } from './pairs.map';

describe('RatesService', () => {
  let service: RatesService;
  let hourlyAggregator: jest.Mocked<HourlyAggregatorService>;
  let streamService: jest.Mocked<StreamService>;

  beforeEach(async () => {
    const mockHourlyAggregator = {
      add: jest.fn().mockResolvedValue(2490.5),
    };

    const mockStreamService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatesService,
        {
          provide: HourlyAggregatorService,
          useValue: mockHourlyAggregator,
        },
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
      ],
    }).compile();

    service = module.get<RatesService>(RatesService);
    hourlyAggregator = module.get(HourlyAggregatorService);
    streamService = module.get(StreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTick', () => {
    it('should process a tick and publish update', async () => {
      const tick: RateTick = {
        pair: 'ETH/USDC',
        price: 2500.5,
        timestamp: 1234567890,
      };

      await service.processTick(tick);

      expect(hourlyAggregator.add).toHaveBeenCalledWith(
        'ETH/USDC',
        2500.5,
        1234567890,
      );
      expect(streamService.publish).toHaveBeenCalledWith({
        pair: 'ETH/USDC',
        price: 2500.5,
        hourlyAvg: 2490.5,
        timestamp: 1234567890,
      });
    });

    it('should handle errors gracefully without throwing', async () => {
      hourlyAggregator.add.mockRejectedValue(new Error('Aggregation error'));

      const tick: RateTick = {
        pair: 'ETH/USDC',
        price: 2500.5,
        timestamp: 1234567890,
      };

      await expect(service.processTick(tick)).resolves.not.toThrow();
    });

    it('should handle stream service errors gracefully', async () => {
      streamService.publish.mockImplementation(() => {
        throw new Error('Publish error');
      });

      const tick: RateTick = {
        pair: 'ETH/USDC',
        price: 2500.5,
        timestamp: 1234567890,
      };

      await expect(service.processTick(tick)).resolves.not.toThrow();
    });

    it('should process multiple ticks correctly', async () => {
      const tick1: RateTick = {
        pair: 'ETH/USDC',
        price: 2500.5,
        timestamp: 1234567890,
      };

      const tick2: RateTick = {
        pair: 'BTC/USDT',
        price: 50000.25,
        timestamp: 1234567891,
      };

      await service.processTick(tick1);
      await service.processTick(tick2);

      expect(hourlyAggregator.add).toHaveBeenCalledTimes(2);
      expect(streamService.publish).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTradingSymbols', () => {
    it('should return all trading symbols from pairs map', () => {
      const symbols = service.getTradingSymbols();

      expect(symbols).toEqual(Object.values(PAIR_TO_SYMBOL));
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('getPair', () => {
    it('should return pair for known symbol', () => {
      const pair = service.getPair('BINANCE:ETHUSDC');
      expect(pair).toBe('ETH/USDC');
    });

    it('should return undefined for unknown symbol', () => {
      const pair = service.getPair('UNKNOWN:SYMBOL');
      expect(pair).toBeUndefined();
    });

    it('should handle all mapped symbols', () => {
      Object.entries(PAIR_TO_SYMBOL).forEach(([expectedPair, symbol]) => {
        const pair = service.getPair(symbol);
        expect(pair).toBe(expectedPair);
      });
    });
  });
});
