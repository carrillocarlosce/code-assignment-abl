import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HourlyAverageRepository } from './hourly-average.repository';
import { HourlyAverage, HourlyAverageDocument } from './hourly-average.schema';
import { Model } from 'mongoose';

describe('HourlyAverageRepository', () => {
  let repository: HourlyAverageRepository;
  let model: jest.Mocked<Model<HourlyAverageDocument>>;

  beforeEach(async () => {
    const mockModel = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn(),
          }),
        }),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn(),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HourlyAverageRepository,
        {
          provide: getModelToken(HourlyAverage.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<HourlyAverageRepository>(HourlyAverageRepository);
    model = module.get(getModelToken(HourlyAverage.name));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('save', () => {
    it('should save hourly average with upsert', async () => {
      const input = {
        pair: 'ETH/USDC',
        hour: new Date('2024-01-01T10:00:00Z'),
        average: 2500.5,
        count: 100,
      };

      const mockDocument = {
        pair: input.pair,
        hour: input.hour,
        average: input.average,
        count: input.count,
      };

      model.findOneAndUpdate.mockResolvedValue(mockDocument as any);

      const result = await repository.save(input);

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { pair: input.pair, hour: input.hour },
        {
          pair: input.pair,
          hour: input.hour,
          average: input.average,
          count: input.count,
        },
        { upsert: true, new: true },
      );
      expect(result).toEqual(mockDocument);
    });

    it('should handle save errors', async () => {
      const input = {
        pair: 'ETH/USDC',
        hour: new Date('2024-01-01T10:00:00Z'),
        average: 2500.5,
        count: 100,
      };

      model.findOneAndUpdate.mockRejectedValue(new Error('Database error'));

      await expect(repository.save(input)).rejects.toThrow('Database error');
    });
  });

  describe('getLatest', () => {
    it('should get latest hourly average for a pair', async () => {
      const pair = 'ETH/USDC';
      const mockDocument = {
        pair,
        hour: new Date('2024-01-01T10:00:00Z'),
        average: 2500.5,
        count: 100,
      };

      const mockLimit = {
        exec: jest.fn().mockResolvedValue(mockDocument),
      };
      const mockSort = {
        limit: jest.fn().mockReturnValue(mockLimit),
      };
      const mockQuery = {
        sort: jest.fn().mockReturnValue(mockSort),
      };

      model.findOne = jest.fn().mockReturnValue(mockQuery as any);

      const result = await repository.getLatest(pair);

      expect(model.findOne).toHaveBeenCalledWith({ pair });
      expect(mockQuery.sort).toHaveBeenCalledWith({ hour: -1 });
      expect(mockSort.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDocument);
    });

    it('should return null if no document found', async () => {
      const pair = 'ETH/USDC';

      const mockLimit = {
        exec: jest.fn().mockResolvedValue(null),
      };
      const mockSort = {
        limit: jest.fn().mockReturnValue(mockLimit),
      };
      const mockQuery = {
        sort: jest.fn().mockReturnValue(mockSort),
      };

      model.findOne = jest.fn().mockReturnValue(mockQuery as any);

      const result = await repository.getLatest(pair);

      expect(result).toBeNull();
    });
  });

  describe('findByPairAndDateRange', () => {
    it('should find hourly averages in date range', async () => {
      const pair = 'ETH/USDC';
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const mockDocuments = [
        {
          pair,
          hour: new Date('2024-01-01T10:00:00Z'),
          average: 2500.5,
          count: 100,
        },
        {
          pair,
          hour: new Date('2024-01-01T11:00:00Z'),
          average: 2510.2,
          count: 150,
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockDocuments),
        }),
      };

      model.find = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findByPairAndDateRange(
        pair,
        startDate,
        endDate,
      );

      expect(model.find).toHaveBeenCalledWith({
        pair,
        hour: { $gte: startDate, $lte: endDate },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ hour: 1 });
      expect(result).toEqual(mockDocuments);
    });

    it('should return empty array if no documents found', async () => {
      const pair = 'ETH/USDC';
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      };

      model.find = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findByPairAndDateRange(
        pair,
        startDate,
        endDate,
      );

      expect(result).toEqual([]);
    });
  });
});
