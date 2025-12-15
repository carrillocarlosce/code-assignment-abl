import { Test, TestingModule } from '@nestjs/testing';
import { FinnhubService } from './finnhub.service';
import { FinnhubClient } from './finnhub.client';
import { RatesService } from '../rates/rates.service';
import { FinnhubTradeMessage, FinnhubUpdate } from './finnhub.types';

describe('FinnhubService', () => {
  let service: FinnhubService;
  let finnhubClient: jest.Mocked<FinnhubClient>;
  let ratesService: jest.Mocked<RatesService>;

  beforeEach(async () => {
    const mockFinnhubClient = {
      connect: jest.fn(),
      onConnect: jest.fn(),
      onMessage: jest.fn(),
      subscribe: jest.fn(),
    };

    const mockRatesService = {
      processTick: jest.fn().mockResolvedValue(undefined),
      getTradingSymbols: jest.fn().mockReturnValue(['BINANCE:ETHUSDC', 'BINANCE:BTCUSDT']),
      getPair: jest.fn((symbol: string) => {
        const map: Record<string, string> = {
          'BINANCE:ETHUSDC': 'ETH/USDC',
          'BINANCE:BTCUSDT': 'BTC/USDT',
        };
        return map[symbol];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinnhubService,
        {
          provide: FinnhubClient,
          useValue: mockFinnhubClient,
        },
        {
          provide: RatesService,
          useValue: mockRatesService,
        },
      ],
    }).compile();

    service = module.get<FinnhubService>(FinnhubService);
    finnhubClient = module.get(FinnhubClient);
    ratesService = module.get(RatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Finnhub client and set up handlers', () => {
      service.onModuleInit();

      expect(finnhubClient.connect).toHaveBeenCalled();
      expect(finnhubClient.onConnect).toHaveBeenCalled();
      expect(finnhubClient.onMessage).toHaveBeenCalled();
    });

    it('should subscribe to symbols when connected', () => {
      let onConnectHandler: () => void;
      finnhubClient.onConnect.mockImplementation((handler) => {
        onConnectHandler = handler;
      });

      service.onModuleInit();
      onConnectHandler!();

      expect(ratesService.getTradingSymbols).toHaveBeenCalled();
      expect(finnhubClient.subscribe).toHaveBeenCalledWith([
        'BINANCE:ETHUSDC',
        'BINANCE:BTCUSDT',
      ]);
    });

    it('should handle connection errors gracefully', () => {
      finnhubClient.connect.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('mapToUpdate', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    it('should map valid trade message to update', () => {
      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [
          {
            s: 'BINANCE:ETHUSDC',
            p: 2500.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      expect(ratesService.processTick).toHaveBeenCalledWith({
        pair: 'ETH/USDC',
        price: 2500.5,
        timestamp: 1234567890,
      });
    });

    it('should return null for non-trade messages', () => {
      const message = {
        type: 'ping',
        data: [],
      } as unknown as FinnhubTradeMessage;

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      expect(ratesService.processTick).not.toHaveBeenCalled();
    });

    it('should return null for messages with no data', () => {
      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [],
      };

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      expect(ratesService.processTick).not.toHaveBeenCalled();
    });

    it('should return null for incomplete trade data', () => {
      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [
          {
            s: 'BINANCE:ETHUSDC',
            p: 2500.5,
            t: undefined as any,
            v: 100,
          },
        ],
      };

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      expect(ratesService.processTick).not.toHaveBeenCalled();
    });

    it('should return null for unknown symbols', () => {
      ratesService.getPair.mockReturnValue(undefined);

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [
          {
            s: 'UNKNOWN:SYMBOL',
            p: 2500.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      expect(ratesService.processTick).not.toHaveBeenCalled();
    });

    it('should handle errors in message processing', async () => {
      ratesService.processTick.mockRejectedValue(new Error('Processing error'));

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [
          {
            s: 'BINANCE:ETHUSDC',
            p: 2500.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      messageHandler!(message);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ratesService.processTick).toHaveBeenCalled();
    });

    it('should handle mapping errors gracefully', () => {
      const message = {
        type: 'trade',
        data: null,
      } as any;

      let messageHandler: (msg: FinnhubTradeMessage) => void;
      finnhubClient.onMessage.mockImplementation((handler) => {
        messageHandler = handler;
      });

      service.onModuleInit();
      expect(() => messageHandler!(message)).not.toThrow();
    });
  });
});
