import { Test, TestingModule } from '@nestjs/testing';
import { HourlyAggregatorService } from './hourly-aggregator.service';
import { HourlyAverageRepository } from './hourly-average.repository';

describe('HourlyAggregatorService', () => {
  let service: HourlyAggregatorService;
  let repository: jest.Mocked<HourlyAverageRepository>;

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn().mockResolvedValue({
        pair: 'ETH/USDC',
        hour: new Date(),
        average: 2500,
        count: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HourlyAggregatorService,
        {
          provide: HourlyAverageRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HourlyAggregatorService>(HourlyAggregatorService);
    repository = module.get(HourlyAverageRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should calculate running average for ticks in same hour', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z').getTime();

      const avg1 = await service.add('ETH/USDC', 2500, timestamp);
      expect(avg1).toBe(2500);

      const avg2 = await service.add('ETH/USDC', 2510, timestamp + 1000);
      expect(avg2).toBe(2505); // (2500 + 2510) / 2

      const avg3 = await service.add('ETH/USDC', 2490, timestamp + 2000);
      expect(avg3).toBeCloseTo(2500, 1); // (2500 + 2510 + 2490) / 3
    });

    it('should flush previous hour when new hour starts', async () => {
      const hour1Timestamp = new Date('2024-01-01T10:30:00Z').getTime();
      const hour2Timestamp = new Date('2024-01-01T11:00:00Z').getTime();

      await service.add('ETH/USDC', 2500, hour1Timestamp);
      await service.add('ETH/USDC', 2510, hour1Timestamp + 1000);

      // Move to next hour - should trigger flush
      await service.add('ETH/USDC', 2520, hour2Timestamp);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pair: 'ETH/USDC',
          average: 2505, // (2500 + 2510) / 2
          count: 2,
        }),
      );
    });

    it('should handle multiple pairs independently', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z').getTime();

      const ethAvg = await service.add('ETH/USDC', 2500, timestamp);
      const btcAvg = await service.add('BTC/USDT', 50000, timestamp);

      expect(ethAvg).toBe(2500);
      expect(btcAvg).toBe(50000);

      const ethAvg2 = await service.add('ETH/USDC', 2510, timestamp + 1000);
      const btcAvg2 = await service.add('BTC/USDT', 50100, timestamp + 1000);

      expect(ethAvg2).toBe(2505);
      expect(btcAvg2).toBe(50050);
    });

    it('should handle errors gracefully and return fallback value', async () => {
      repository.save.mockRejectedValue(new Error('Database error'));

      const hour1Timestamp = new Date('2024-01-01T10:30:00Z').getTime();
      const hour2Timestamp = new Date('2024-01-01T11:00:00Z').getTime();

      await service.add('ETH/USDC', 2500, hour1Timestamp);
      const avg = await service.add('ETH/USDC', 2510, hour2Timestamp);

      // Should return current price as fallback if bucket is empty
      expect(avg).toBe(2510);
    });

    it('should return current price if no bucket exists on error', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z').getTime();

      // Simulate error scenario
      repository.save.mockRejectedValue(new Error('Database error'));

      const avg = await service.add('ETH/USDC', 2500, timestamp);
      expect(avg).toBe(2500);
    });

    it('should handle hour boundary correctly', async () => {
      // Last second of hour
      const hour1End = new Date('2024-01-01T10:59:59Z').getTime();
      // First second of next hour
      const hour2Start = new Date('2024-01-01T11:00:00Z').getTime();

      await service.add('ETH/USDC', 2500, hour1End);
      await service.add('ETH/USDC', 2510, hour2Start);

      expect(repository.save).toHaveBeenCalled();
    });

    it('should calculate correct average with many ticks', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z').getTime();
      const prices = [2500, 2510, 2490, 2505, 2515];

      let lastAvg = 0;
      for (let i = 0; i < prices.length; i++) {
        lastAvg = await service.add('ETH/USDC', prices[i], timestamp + i * 1000);
      }

      const expectedAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
      expect(lastAvg).toBeCloseTo(expectedAvg, 1);
    });

    it('should not flush if hour key has not changed', async () => {
      const timestamp = new Date('2024-01-01T10:30:00Z').getTime();

      await service.add('ETH/USDC', 2500, timestamp);
      await service.add('ETH/USDC', 2510, timestamp + 1000);
      await service.add('ETH/USDC', 2490, timestamp + 2000);

      // All ticks are in the same hour, so no flush should occur
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('hour key generation', () => {
    it('should group ticks by hour correctly', async () => {
      const baseTime = new Date('2024-01-01T10:30:00Z');
      const sameHour1 = baseTime.getTime();
      const sameHour2 = new Date('2024-01-01T10:45:00Z').getTime();
      const differentHour = new Date('2024-01-01T11:15:00Z').getTime();

      await service.add('ETH/USDC', 2500, sameHour1);
      await service.add('ETH/USDC', 2510, sameHour2);

      // Should not flush yet
      expect(repository.save).not.toHaveBeenCalled();

      await service.add('ETH/USDC', 2520, differentHour);

      // Now should flush the 10:00 hour
      expect(repository.save).toHaveBeenCalled();
    });
  });
});
