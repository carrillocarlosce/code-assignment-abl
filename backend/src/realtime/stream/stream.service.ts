import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { RateUpdateDto } from './stream.dto';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private clients = new Map<string, { socket: Socket; pairs: Set<string> }>();

  registerClient(socket: Socket) {
    try {
      this.clients.set(socket.id, {
        socket,
        pairs: new Set(),
      });
      this.logger.log(`Client ${socket.id} registered`);
    } catch (error) {
      this.logger.error(`Error registering client ${socket.id}`, error);
    }
  }

  removeClient(socketId: string) {
    try {
      this.clients.delete(socketId);
      this.logger.log(`Client ${socketId} removed`);
    } catch (error) {
      this.logger.error(`Error removing client ${socketId}`, error);
    }
  }

  updateSubscriptions(socketId: string, pairs: string[]) {
    try {
      const client = this.clients.get(socketId);
      if (!client) {
        this.logger.warn(`Client ${socketId} not found for subscription update`);
        return;
      }

      client.pairs = new Set(pairs);
      this.logger.log(
        `Client ${socketId} updated subscriptions to ${pairs.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Error updating subscriptions for ${socketId}`, error);
    }
  }

  publish(update: RateUpdateDto) {
    try {
      let sentCount = 0;
      for (const { socket, pairs } of this.clients.values()) {
        if (pairs.has(update.pair)) {
          try {
            socket.emit('rate_update', update);
            sentCount++;
          } catch (error) {
            this.logger.error(
              `Error sending update to client ${socket.id}`,
              error,
            );
            // Remove client if socket is disconnected
            if (socket.disconnected) {
              this.removeClient(socket.id);
            }
          }
        }
      }
      if (sentCount > 0) {
        this.logger.debug(
          `Published update for ${update.pair} to ${sentCount} client(s)`,
        );
      }
    } catch (error) {
      this.logger.error('Error publishing update', error);
    }
  }
}
