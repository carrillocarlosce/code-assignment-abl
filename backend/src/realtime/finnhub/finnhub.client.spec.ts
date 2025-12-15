import { Test, TestingModule } from '@nestjs/testing';
import { FinnhubClient } from './finnhub.client';
import WebSocket from 'ws';
import { FinnhubTradeMessage } from './finnhub.types';

// Mock the ws module
jest.mock('ws');

describe('FinnhubClient', () => {
  let client: FinnhubClient;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let originalSetTimeout: typeof setTimeout;
  let originalClearTimeout: typeof clearTimeout;

  beforeEach(() => {
    // Mock timers
    jest.useFakeTimers();
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    // Create mock WebSocket instance
    mockWebSocket = {
      addEventListener: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(
      () => mockWebSocket,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with API key', () => {
      expect(() => new FinnhubClient('test-api-key')).not.toThrow();
    });

    it('should throw error if API key is missing', () => {
      expect(() => new FinnhubClient('')).toThrow('FINNHUB_API_KEY is required');
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
    });

    it('should connect to Finnhub WebSocket', () => {
      client.connect();

      expect(WebSocket).toHaveBeenCalledWith(
        'wss://ws.finnhub.io?token=test-api-key',
      );
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'open',
        expect.any(Function),
      );
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
    });

    it('should not connect if already connecting', () => {
      client.connect();
      jest.clearAllMocks();
      client.connect();

      expect(WebSocket).not.toHaveBeenCalled();
    });

    it('should not connect if already connected', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      client['ws'] = mockWebSocket;

      client.connect();

      expect(WebSocket).not.toHaveBeenCalled();
    });

    it('should call onConnect handler when connection opens', () => {
      const onConnectHandler = jest.fn();
      client.onConnect(onConnectHandler);

      let openHandler: () => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'open') {
          openHandler = handler as () => void;
        }
      });

      client.connect();
      openHandler!();

      expect(onConnectHandler).toHaveBeenCalled();
    });

    it('should re-subscribe to symbols after reconnection', () => {
      client.subscribe(['BINANCE:ETHUSDC']);
      client['subscribedSymbols'] = ['BINANCE:ETHUSDC'];

      let openHandler: () => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'open') {
          openHandler = handler as () => void;
        }
      });

      client.connect();
      openHandler!();

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', symbol: 'BINANCE:ETHUSDC' }),
      );
    });

    it('should handle connection errors', () => {
      const errorHandler = jest.fn();
      let errorEvent: (error: any) => void;

      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorEvent = handler as (error: any) => void;
        }
      });

      client.connect();
      errorEvent!({ message: 'Connection error' });

      expect(client['isConnecting']).toBe(false);
    });

    it('should handle close events', () => {
      let closeHandler: (event: any) => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler as (event: any) => void;
        }
      });

      client.connect();
      closeHandler!({ code: 1000, reason: 'Normal closure' });

      expect(client['ws']).toBeNull();
    });
  });

  describe('subscribe', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
      client['ws'] = mockWebSocket;
      mockWebSocket.readyState = WebSocket.OPEN;
    });

    it('should subscribe to symbols', () => {
      const symbols = ['BINANCE:ETHUSDC', 'BINANCE:BTCUSDT'];

      client.subscribe(symbols);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', symbol: 'BINANCE:ETHUSDC' }),
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', symbol: 'BINANCE:BTCUSDT' }),
      );
      expect(client['subscribedSymbols']).toContain('BINANCE:ETHUSDC');
      expect(client['subscribedSymbols']).toContain('BINANCE:BTCUSDT');
    });

    it('should not subscribe if WebSocket is not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      client.subscribe(['BINANCE:ETHUSDC']);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should store symbols for later subscription', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      client.subscribe(['BINANCE:ETHUSDC']);

      expect(client['subscribedSymbols']).toContain('BINANCE:ETHUSDC');
    });

    it('should handle duplicate symbols', () => {
      client.subscribe(['BINANCE:ETHUSDC']);
      client.subscribe(['BINANCE:ETHUSDC']);

      expect(client['subscribedSymbols'].filter((s) => s === 'BINANCE:ETHUSDC').length).toBe(1);
    });

    it('should handle subscription errors', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => client.subscribe(['BINANCE:ETHUSDC'])).not.toThrow();
    });
  });

  describe('unsubscribe', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
      client['ws'] = mockWebSocket;
      mockWebSocket.readyState = WebSocket.OPEN;
    });

    it('should unsubscribe from symbol', () => {
      client['subscribedSymbols'] = ['BINANCE:ETHUSDC'];

      client.unsubscribe('BINANCE:ETHUSDC');

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'unsubscribe', symbol: 'BINANCE:ETHUSDC' }),
      );
      expect(client['subscribedSymbols']).not.toContain('BINANCE:ETHUSDC');
    });

    it('should not unsubscribe if WebSocket is not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;

      client.unsubscribe('BINANCE:ETHUSDC');

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe errors', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => client.unsubscribe('BINANCE:ETHUSDC')).not.toThrow();
    });
  });

  describe('onMessage', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
    });

    it('should set message handler', () => {
      const handler = jest.fn();
      client.onMessage(handler);

      expect(client['messageHandler']).toBe(handler);
    });

    it('should call message handler when message received', () => {
      const handler = jest.fn();
      client.onMessage(handler);

      let messageHandler: (event: any) => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as (event: any) => void;
        }
      });

      client.connect();

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [
          {
            s: 'BINANCE:ETHUSDC',
            p: 2500,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      messageHandler!({
        data: Buffer.from(JSON.stringify(message)),
      });

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should handle message parsing errors', () => {
      const handler = jest.fn();
      client.onMessage(handler);

      let messageHandler: (event: any) => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as (event: any) => void;
        }
      });

      client.connect();

      messageHandler!({
        data: Buffer.from('invalid json'),
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
      client['ws'] = mockWebSocket;
      client['reconnectTimeout'] = setTimeout(() => {}, 1000);
      client['heartbeatInterval'] = setInterval(() => {}, 1000);
    });

    it('should disconnect and clean up', () => {
      client.disconnect();

      expect(client['shouldReconnect']).toBe(false);
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(client['ws']).toBeNull();
    });
  });

  describe('isConnected', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
    });

    it('should return true when connected', () => {
      client['ws'] = mockWebSocket;
      mockWebSocket.readyState = WebSocket.OPEN;

      expect(client.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      client['ws'] = null;

      expect(client.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is closing', () => {
      client['ws'] = mockWebSocket;
      mockWebSocket.readyState = WebSocket.CLOSING;

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('reconnection logic', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
    });

    it('should schedule reconnection on disconnect', () => {
      let closeHandler: (event: any) => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler as (event: any) => void;
        }
      });

      client.connect();
      closeHandler!({ code: 1000, reason: '' });

      jest.advanceTimersByTime(1000);

      expect(WebSocket).toHaveBeenCalledTimes(2); // Initial + reconnect
    });

    it('should use exponential backoff for reconnection', () => {
      let closeHandler: (event: any) => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'close') {
          closeHandler = handler as (event: any) => void;
        }
      });

      client.connect();
      closeHandler!({ code: 1000, reason: '' });

      // First reconnection attempt
      jest.advanceTimersByTime(1000);
      expect(client['reconnectAttempts']).toBe(1);

      // Simulate another disconnect
      closeHandler!({ code: 1000, reason: '' });
      jest.advanceTimersByTime(2000); // 2^1 * 1000ms

      expect(client['reconnectAttempts']).toBe(2);
    });
  });

  describe('heartbeat monitoring', () => {
    beforeEach(() => {
      client = new FinnhubClient('test-api-key');
    });

    it('should start heartbeat on connection', () => {
      let openHandler: () => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'open') {
          openHandler = handler as () => void;
        }
      });

      client.connect();
      openHandler!();

      expect(client['heartbeatInterval']).not.toBeNull();
    });

    it('should detect stale connection and reconnect', () => {
      let openHandler: () => void;
      mockWebSocket.addEventListener.mockImplementation((event, handler) => {
        if (event === 'open') {
          openHandler = handler as () => void;
        }
      });

      client.connect();
      openHandler!();

      // Simulate no messages for 60+ seconds
      client['lastMessageTime'] = Date.now() - 61000;
      jest.advanceTimersByTime(30000); // Advance heartbeat check interval

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
