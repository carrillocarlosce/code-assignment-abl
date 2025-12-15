import { Test, TestingModule } from '@nestjs/testing';
import { StreamGateway } from './stream.gateway';
import { StreamService } from './stream.service';
import { Socket } from 'socket.io';
import { SubscribeMessage } from './stream.dto';

describe('StreamGateway', () => {
  let gateway: StreamGateway;
  let streamService: jest.Mocked<StreamService>;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(async () => {
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
      disconnected: false,
    } as any;

    const mockStreamService = {
      registerClient: jest.fn(),
      removeClient: jest.fn(),
      updateSubscriptions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamGateway,
        {
          provide: StreamService,
          useValue: mockStreamService,
        },
      ],
    }).compile();

    gateway = module.get<StreamGateway>(StreamGateway);
    streamService = module.get(StreamService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should register client when socket connects', () => {
      gateway.handleConnection(mockSocket);

      expect(streamService.registerClient).toHaveBeenCalledWith(mockSocket);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client when socket disconnects', () => {
      gateway.handleDisconnect(mockSocket);

      expect(streamService.removeClient).toHaveBeenCalledWith(mockSocket.id);
    });
  });

  describe('handleSubscribe', () => {
    it('should update subscriptions for client', () => {
      const subscribeDto: SubscribeMessage = {
        pairs: ['ETH/USDC', 'BTC/USDT'],
      };

      gateway.handleSubscribe(mockSocket, subscribeDto);

      expect(streamService.updateSubscriptions).toHaveBeenCalledWith(
        mockSocket.id,
        subscribeDto.pairs,
      );
    });

    it('should handle empty pairs array', () => {
      const subscribeDto: SubscribeMessage = {
        pairs: [],
      };

      gateway.handleSubscribe(mockSocket, subscribeDto);

      expect(streamService.updateSubscriptions).toHaveBeenCalledWith(
        mockSocket.id,
        [],
      );
    });

    it('should handle single pair subscription', () => {
      const subscribeDto: SubscribeMessage = {
        pairs: ['ETH/USDC'],
      };

      gateway.handleSubscribe(mockSocket, subscribeDto);

      expect(streamService.updateSubscriptions).toHaveBeenCalledWith(
        mockSocket.id,
        ['ETH/USDC'],
      );
    });
  });
});
