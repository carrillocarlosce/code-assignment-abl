import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamService } from './stream.service';
import type { SubscribeMessage as SubscribeDto } from './stream.dto';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly streamService: StreamService) {}

  handleConnection(socket: Socket) {
    this.streamService.registerClient(socket);
  }

  handleDisconnect(socket: Socket) {
    this.streamService.removeClient(socket.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SubscribeDto,
  ) {
    this.streamService.updateSubscriptions(socket.id, body.pairs);
  }
}
