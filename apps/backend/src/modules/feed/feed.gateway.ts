import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UserRole } from '@todanpho/shared';

@WebSocketGateway({
  namespace: '/ws/feed',
  cors: { origin: '*' },
})
export class FeedGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      await client.join(`neighborhood:${payload.neighborhoodId}`);
      await client.join(`user:${payload.sub}`);

      if (
        payload.role === UserRole.SUPER_ADMIN ||
        payload.role === UserRole.LEADER ||
        payload.role === UserRole.STAFF
      ) {
        await client.join(`officers:${payload.neighborhoodId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  emitFeedEvent(
    neighborhoodId: string,
    event: string,
    payload: unknown,
    options?: { isPrivate?: boolean; ownerId?: string },
  ) {
    if (!this.server) return;
    if (options?.isPrivate) {
      this.server.to(`officers:${neighborhoodId}`).emit(event, payload);
      if (options.ownerId) {
        this.server.to(`user:${options.ownerId}`).emit(event, payload);
      }
      return;
    }
    this.server.to(`neighborhood:${neighborhoodId}`).emit(event, payload);
  }
}
