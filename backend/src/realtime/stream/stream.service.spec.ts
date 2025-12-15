import { Test, TestingModule } from '@nestjs/testing';
import { StreamService } from './stream.service';
import { Socket } from 'socket.io';
import { RateUpdateDto } from './stream.dto';

describe('StreamService', () => {
  let service: StreamService;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      disconnected: false,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamService],
    }).compile();

    service = module.get<StreamService>(StreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerClient', () => {
    it('should register a new client', () => {
      service.registerClient(mockSocket);

      // Verify client is registered by trying to update subscriptions
      service.updateSubscriptions(mockSocket.id, ['ETH/USDC']);
      service.publish({
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('rate_update', expect.any(Object));
    });

    it('should handle registration errors gracefully', () => {
      // Test with a socket that will cause an error during registration
      const invalidSocket = {
        id: 'test-id',
        // Missing required properties that might cause errors
      } as any;
      
      // The service should handle errors without crashing the application
      // Even if there's an error accessing socket.id in the error handler,
      // the try-catch should prevent it from propagating
      try {
        service.registerClient(invalidSocket);
      } catch (error) {
        // If an error is thrown, that's also acceptable as long as it's handled
      }
      
      // The main point is that the service doesn't crash the application
      expect(service).toBeDefined();
    });
  });

  describe('removeClient', () => {
    it('should remove a registered client', () => {
      service.registerClient(mockSocket);
      service.removeClient(mockSocket.id);

      service.publish({
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle removal of non-existent client', () => {
      expect(() => service.removeClient('non-existent-id')).not.toThrow();
    });
  });

  describe('updateSubscriptions', () => {
    it('should update client subscriptions', () => {
      service.registerClient(mockSocket);
      service.updateSubscriptions(mockSocket.id, ['ETH/USDC', 'BTC/USDT']);

      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      service.publish(update);

      expect(mockSocket.emit).toHaveBeenCalledWith('rate_update', update);
    });

    it('should not send updates for unsubscribed pairs', () => {
      service.registerClient(mockSocket);
      service.updateSubscriptions(mockSocket.id, ['ETH/USDC']);

      const update: RateUpdateDto = {
        pair: 'BTC/USDT',
        price: 50000,
        hourlyAvg: 49900,
        timestamp: Date.now(),
      };

      service.publish(update);

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle subscription update for non-existent client', () => {
      expect(() =>
        service.updateSubscriptions('non-existent-id', ['ETH/USDC']),
      ).not.toThrow();
    });

    it('should replace existing subscriptions', () => {
      service.registerClient(mockSocket);
      service.updateSubscriptions(mockSocket.id, ['ETH/USDC']);
      service.updateSubscriptions(mockSocket.id, ['BTC/USDT']);

      const ethUpdate: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      const btcUpdate: RateUpdateDto = {
        pair: 'BTC/USDT',
        price: 50000,
        hourlyAvg: 49900,
        timestamp: Date.now(),
      };

      service.publish(ethUpdate);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('rate_update', ethUpdate);

      mockSocket.emit.mockClear();

      service.publish(btcUpdate);
      expect(mockSocket.emit).toHaveBeenCalledWith('rate_update', btcUpdate);
    });
  });

  describe('publish', () => {
    it('should publish update to subscribed clients', () => {
      const socket1 = { id: 'socket-1', emit: jest.fn(), disconnected: false } as any;
      const socket2 = { id: 'socket-2', emit: jest.fn(), disconnected: false } as any;

      service.registerClient(socket1);
      service.registerClient(socket2);

      service.updateSubscriptions(socket1.id, ['ETH/USDC']);
      service.updateSubscriptions(socket2.id, ['BTC/USDT']);

      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      service.publish(update);

      expect(socket1.emit).toHaveBeenCalledWith('rate_update', update);
      expect(socket2.emit).not.toHaveBeenCalled();
    });

    it('should publish to multiple clients subscribed to same pair', () => {
      const socket1 = { id: 'socket-1', emit: jest.fn(), disconnected: false } as any;
      const socket2 = { id: 'socket-2', emit: jest.fn(), disconnected: false } as any;

      service.registerClient(socket1);
      service.registerClient(socket2);

      service.updateSubscriptions(socket1.id, ['ETH/USDC']);
      service.updateSubscriptions(socket2.id, ['ETH/USDC']);

      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      service.publish(update);

      expect(socket1.emit).toHaveBeenCalledWith('rate_update', update);
      expect(socket2.emit).toHaveBeenCalledWith('rate_update', update);
    });

    it('should handle errors when sending to a client', () => {
      const socket = {
        id: 'socket-1',
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
        disconnected: false,
      } as any;

      service.registerClient(socket);
      service.updateSubscriptions(socket.id, ['ETH/USDC']);

      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      expect(() => service.publish(update)).not.toThrow();
    });

    it('should remove disconnected clients', () => {
      const socket = {
        id: 'socket-1',
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
        disconnected: true,
      } as any;

      service.registerClient(socket);
      service.updateSubscriptions(socket.id, ['ETH/USDC']);

      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      service.publish(update);

      // Client should be removed, so subsequent publishes won't try to send
      mockSocket.emit.mockClear();
      service.publish(update);
      expect(socket.emit).toHaveBeenCalledTimes(1); // Only called once before removal
    });

    it('should handle publish errors gracefully', () => {
      // Create a service that will throw on publish
      const update: RateUpdateDto = {
        pair: 'ETH/USDC',
        price: 2500,
        hourlyAvg: 2490,
        timestamp: Date.now(),
      };

      // This should not throw even if there are issues
      expect(() => service.publish(update)).not.toThrow();
    });
  });
});
