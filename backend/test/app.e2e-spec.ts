import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import { StreamService } from './../src/realtime/stream/stream.service';
import type { RateUpdateDto } from './../src/realtime/stream/stream.dto';

describe('WebSocket stream (e2e)', () => {
  let app: INestApplication;
  let streamService: StreamService;
  let port: number;

  beforeAll(async () => {
    // Ensure we are in "test" mode so AppModule skips the real MongoDB
    // connection (see conditional mongoImports in AppModule).
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Start the HTTP server on an ephemeral port so Socket.IO can bind.
    await app.listen(0);

    const httpServer: any = app.getHttpServer();
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error(`Unexpected HTTP server address: ${address}`);
    }
    port = address.port;

    streamService = app.get(StreamService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should receive rate_update events over WebSocket stream', async () => {
    const testPair = 'ETH/USDC';

    const client: Socket = io(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('WebSocket test timeout')),
        8000,
      );

      client.on('connect', () => {
        client.emit('subscribe', { pairs: [testPair] });

        const update: RateUpdateDto = {
          pair: testPair,
          price: 123.45,
          hourlyAvg: 120.0,
          timestamp: Date.now(),
        };

        // Directly publish an update via the StreamService
        streamService.publish(update);
      });

      client.on('rate_update', (message: RateUpdateDto) => {
        try {
          expect(message.pair).toBe(testPair);
          expect(typeof message.price).toBe('number');
          expect(typeof message.hourlyAvg).toBe('number');
          expect(typeof message.timestamp).toBe('number');

          clearTimeout(timeout);
          client.disconnect();
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          client.disconnect();
          reject(error);
        }
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        client.disconnect();
        reject(error);
      });
    });
  });
});
